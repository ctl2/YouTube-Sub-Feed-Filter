// ==UserScript==
// @name       Hide YouTube Streams
// @version    0.1
// @description Hides streams and premiers from the YouTube subscriptions page.
// @match      http://www.youtube.com/feed/subscriptions*
// @match      http://youtube.com/feed/subscriptions*
// @match      https://www.youtube.com/feed/subscriptions*
// @match      https://youtube.com/feed/subscriptions*
// @license    GPLv3 - http://www.gnu.org/licenses/gpl-3.0.en.html
// @copyright  callumtylerlatham@gmail.com
// @namespace https://greasyfork.org/users/696211-ctl2
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

// Helper methods

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

function hide(element) {
    element.style.display = "none";
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
        video => firstWordEquals(getMetadataLine(video).children[1], "Streamed")
    );
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
            // Hide hideable streams/premiers
            hide(videoSection);
        } else {
            // Hide full section (including title)
            for (let hideableVideo of hideableVideos) {
                hide(hideableVideo);
            }
        }
    }
}

// main

// Call hideNewHideables when new video sections are loaded
new MutationObserver(hideNewHideables).observe(
    document.querySelector('div#contents'), {
        childList: true,
        subtree: false,
        attributes: false,
        characterData: false
    }
);

// Call hideNewHideables when the script loads
hideNewHideables();
