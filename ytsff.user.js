// ==UserScript==
// @name        YouTube Sub Feed Filter
// @version     0.3
// @description Filters undesireable videos from your YouTube subscriptions feed.
// @match       *://www.youtube.com/*
// @match       *://youtube.com/*
// @license     GPLv3 - http://www.gnu.org/licenses/gpl-3.0.en.html
// @copyright   callumtylerlatham@gmail.com
// @namespace   https://greasyfork.org/users/696211-ctl2
// ==/UserScript==

// Config

// Please set the config values to your liking!
// Change values from `false` to `true` to start hiding streams and premiers.
// Add regular expression strings to the `channels` array to hide all videos from specific channels.
// Channel names that are too long for YouTube to display below videos 
// (e.g. 'A Very Long Channel Name' may be displayed as 'A Very Long Chann...') 
// should be denoted by their shortened form; Their complete channel name will not be recognised.
// NOTE: Your configs will be overwritten if you download an update for this script. Consider backing them up!
let filterConfig = {
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
    }, 
    "channels": ["Example Channel Name :)"]
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

function getHideableStreamsAndPremiers(videos) {
    // Collect hideable streams/premiers
    let hideableVideos = [];
    if (filterConfig.scheduled.streams)
        hideableVideos = hideableVideos.concat(getScheduledStreams(videos));
    if (filterConfig.scheduled.premiers)
        hideableVideos = hideableVideos.concat(getScheduledPremiers(videos));
    if (filterConfig.live.streams)
        hideableVideos = hideableVideos.concat(getLiveStreams(videos));
    if (filterConfig.live.premiers)
        hideableVideos = hideableVideos.concat(getLivePremiers(videos));
    if (filterConfig.finished.streams)
        hideableVideos = hideableVideos.concat(getFinishedStreams(videos));
    return hideableVideos;
}

function getHideableChannelVideos(videos) {
    let hideableVideos = [];
    for (let video of videos) {
        for (let channelRegex of filterConfig.channels) {
            if (channelRegex.test(video.querySelector("a.yt-formatted-string").innerText)) {
                hideableVideos.push(video);
                break;
            }
        }
    }
    return hideableVideos;
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
        let videos = videoSection.querySelectorAll("ytd-grid-video-renderer");
        let hideableVideos = getHideableStreamsAndPremiers(videos);
        hideableVideos = hideableVideos.concat(
            getHideableChannelVideos(videos).filter(hideable => !hideableVideos.includes(hideable))
        );
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

function getRegexArray(stringArray) {
    return stringArray.map(string => new RegExp(string));
}

function isSubscriptionsPage() {
    return new RegExp("^.*youtube.com/feed/subscriptions(\\?flow=1|\\?pbjreload=\\d+)?$").test(document.URL);
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
filterConfig.channels = filterConfig.channels.map(string => new RegExp(string));

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
