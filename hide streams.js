// ==UserScript==
// @name       Hide YouTube Streams
// @version    0.1
// @description Hides streams (and premiers) from the YouTube subscriptions page.
// @match      http://www.youtube.com/feed/subscriptions*
// @match      http://youtube.com/feed/subscriptions*
// @match      https://www.youtube.com/feed/subscriptions*
// @match      https://youtube.com/feed/subscriptions*
// @license    GPLv3 - http://www.gnu.org/licenses/gpl-3.0.en.html
// @copyright  callumtylerlatham@gmail.com
// @namespace https://greasyfork.org/users/696211-ctl2
// ==/UserScript==

let hideConfig = {
    "scheduled": {
        "streams": true, 
        "premiers": true
    }, 
    "live": {
        "streams": true, 
        "premiers": true
    }, 
    "finished": {
        "streams": true
        // Finished premiers are just regular videos
    }
};

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

// Hide scheduled

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

// Hide live

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

// Hide finished

function getFinishedStreams(videos) {
    return getFilteredCollection(
        videos,
        video => firstWordEquals(getMetadataLine(video).children[1], "Streamed")
    );
}

// Hide controller

function hideStreams(newMutations) {
    // Collect new video sections
    let videoSections; // Today, This week, This month, ...
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
        let hideableVideos = [];
        // Hide scheduled
        if (hideConfig.scheduled.streams === true) hideableVideos = hideableVideos.concat(getScheduledStreams(videos));
        if (hideConfig.scheduled.premiers === true) hideableVideos = hideableVideos.concat(getScheduledPremiers(videos));
        // Hide live
        if (hideConfig.live.streams === true) hideableVideos = hideableVideos.concat(getLiveStreams(videos));
        if (hideConfig.live.premiers === true) hideableVideos = hideableVideos.concat(getLivePremiers(videos));
        // Hide finished
        if (hideConfig.finished.streams === true) hideableVideos = hideableVideos.concat(getFinishedStreams(videos));
        if (hideableVideos.length === videos.length) {
            hide(videoSection);
        } else {
            for (let hideableVideo of hideableVideos) {
                hide(hideableVideo);
            }
        }
    }
}

// Call the hideStreams function when new videos are loaded

var observer = new MutationObserver(hideStreams);
observer.observe(
    document.querySelector('div#contents'), {
        childList: true,
        subtree: false,
        attributes: false,
        characterData: false
    }
);

hideStreams();
