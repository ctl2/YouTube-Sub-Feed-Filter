// ==UserScript==
// @name        YouTube Stream Hider
// @version     0.1
// @description Hides streams and premiers from your YouTube subscriptions feed.
// @match       *://www.youtube.com/*
// @match       *://youtube.com/*
// @license     GPLv3 - http://www.gnu.org/licenses/gpl-3.0.en.html
// @copyright   callumtylerlatham@gmail.com
// @namespace   https://greasyfork.org/users/696211-ctl2
// ==/UserScript==

// Config

// Please set the config values to your liking!
// Recognised values are 'true' and 'false'(without the quotes)
// Setting values to 'true' will cause that type of video to be hidden
// Note: your configs will be overwritten if you download an update for this script
let hideConfig = {
    "scheduled": {
        "streams": false, 
        "premiers": false
    }, 
    "live": {
        "streams": false, 
        "premiers": false
    }, 
    "finished": {
        "streams": false
        // Finished premiers are just regular videos
    }
};

// Collector helpers

function getFilteredCollection(collection, predicate) {
    let filteredCollection = [];
    for (let item of collection) {
        if (predicate(item)) filteredCollection.push(item);
    }
    return filteredCollection;
}

function firstWordEquals(element, word) {
    return element.innerText.split(" ")[0] === word;
}

function getLiveBadge(video) {
    return video.querySelector(".badge-style-type-live-now");
}

function getMetadataLine(video) {
    return video.querySelector("#metadata-line");
}

// Scheduled collectors

function getScheduledStreams(videos) {
    return getFilteredCollection(
        videos,
        video => firstWordEquals(getMetadataLine(video).children[0], "Scheduled")
    );
}

function getScheduledPremiers(videos) {
    return getFilteredCollection(
        videos,
        video => firstWordEquals(getMetadataLine(video).children[0], "Premieres")
    );
}

// Live collectors

function getLiveStreams(videos) {
    return getFilteredCollection(
        videos,
        video => {
            let liveBadge = getLiveBadge(video);
            return liveBadge === null ?
                false :
                firstWordEquals(liveBadge.querySelector("span.ytd-badge-supported-renderer"), "LIVE");
        }
    );
}

function getLivePremiers(videos) {
    return getFilteredCollection(
        videos,
        video => {
            let liveBadge = getLiveBadge(video);
            return liveBadge === null ?
                false :
                firstWordEquals(liveBadge.querySelector("span.ytd-badge-supported-renderer"), "PREMIERING");
        }
    );
}

// Finished collectors

function getFinishedStreams(videos) {
    return getFilteredCollection(
        videos,
        video => {
          let metaDataLine = getMetadataLine(video);
          return metaDataLine.children.length > 1 && firstWordEquals(metaDataLine.children[1], "Streamed")
        }
    );
}

// Hider helpers

function hide(element) {
    element.remove();
}

// Hider

function hideNewHideables(newMutations) {
    // Collect new video sections
    let videoSections; // Today, This week, This month, Older, ...
    if (newMutations === undefined) {
        videoSections = document.querySelectorAll("ytd-item-section-renderer");
    } else {
        videoSections = [];
        for (let mutation of newMutations) {
            for (let addedNode of mutation.addedNodes) {
                videoSections.push(addedNode);
            }
        }
    }
    // Hide hideables
    for (let videoSection of videoSections) {
        // Collect new videos
        let videos = videoSection.querySelectorAll("ytd-grid-video-renderer");
        // Collect hideable streams/premiers
        let hideableVideos = [];
        if (hideConfig.scheduled.streams) hideableVideos = hideableVideos.concat(getScheduledStreams(videos));
        if (hideConfig.scheduled.premiers) hideableVideos = hideableVideos.concat(getScheduledPremiers(videos));
        if (hideConfig.live.streams) hideableVideos = hideableVideos.concat(getLiveStreams(videos));
        if (hideConfig.live.premiers) hideableVideos = hideableVideos.concat(getLivePremiers(videos));
        if (hideConfig.finished.streams) hideableVideos = hideableVideos.concat(getFinishedStreams(videos));
        // Hide
        if (hideableVideos.length === videos.length) {
            // Hide full section (including title)
            hide(videoSection);
        } else {
            // Hide hideable videos
            for (let hideableVideo of hideableVideos) {
                hide(hideableVideo);
            }
        }
    }
}

// Main helpers

function isSubscriptionsPage() {
    return new RegExp(".*youtube.com/feed/subscriptions.*").test(document.URL);
}

function trySetPageLoaderOnclick(pageLoader, cssSelector) {
    if (pageLoader) {
        if (pageLoader.matches) {
            if (pageLoader.matches(cssSelector)) {
                pageLoader.onclick = () => location.assign("https://www.youtube.com/feed/subscriptions");
                return true;
            }
        }
    }
    return false;
}

function simplifyPageLoader(cssSelector) {
    if (!trySetPageLoaderOnclick(document.querySelector(cssSelector), cssSelector)) {
        let pageLoaderObserver = new MutationObserver((newMutations) => {
            for (let mutation of newMutations) {
                for (let node of mutation.addedNodes) {
                    if (trySetPageLoaderOnclick(node, cssSelector)) {
                        // If button has been found, stop searching
                        pageLoaderObserver.disconnect();
                        return;
                    }
                }
            }
        });
        pageLoaderObserver.observe(document.querySelector("ytd-app"), {
            childList: true,
            subtree: true
        });
    }
}

// Main

// Make buttons that navigate to the subscriptions feed trigger normal page loads
simplifyPageLoader("a[title='Subscriptions']"); // Subscriptions button
simplifyPageLoader("button#button[aria-label='Switch to grid view']"); // Grid-view button

// Hide hideable videos if on the subscriptions page
if (isSubscriptionsPage()) {
    // Call hideNewHideables on page load
    hideNewHideables();
    // Call hideNewHideables when new videos are loaded
    new MutationObserver(hideNewHideables).observe(
        document.querySelector('ytd-browse[page-subtype="subscriptions"]').querySelector('div#contents'), {
            childList: true
        }
    );
}
