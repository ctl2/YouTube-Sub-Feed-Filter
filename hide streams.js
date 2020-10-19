// ==UserScript==
// @name       Hide YouTube Streams
// @version    0.1
// @description Hides streams from the YouTube subscriptions page
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

function getFirstWord(element) {
    return element.innerText.split(" ")[0];
}

function hideScheduledStreams(videos) {
    // TODO
}

function hideLiveStreams() {
    for (let badge of document.getElementsByClassName("badge-style-type-live-now")) {
        badge.parentElement.parentElement.parentElement.parentElement.style.display = "none"
    }
}

function hideFinishedStreams(videos) {
    for (let video of videos) {
        if (getFirstWord(video.querySelector("#metadata-line").children[1]) === "Streamed") video.style.display = "none"
    }
}

function hideScheduledPremiers(videos) {
    for (let video of videos) {
        if (getFirstWord(video.querySelector("#metadata-line").children[0]) === "Premieres") video.style.display = "none"
    }
}

function hideLivePremiers(videos) {
    // TODO
}

function hideStreams(newMutations) {
    // Collect videos
    let videos;
    if (newMutations == null) {
        videos = document.querySelectorAll('ytd-grid-video-renderer');
    } else {
        videos = [];
        for (let mutation of newMutations) {
            for (let addedNode of mutation.addedNodes) {
                videos = videos.concat(...addedNode.querySelectorAll("ytd-grid-video-renderer"));
            }
        }
    }
    // Hide streams
    if (hideConfig.scheduled.streams === true) hideScheduledStreams(videos);
    if (hideConfig.live.streams === true) hideLiveStreams();
    if (hideConfig.finished.streams === true) hideFinishedStreams(videos);
    // Hide premiers
    if (hideConfig.scheduled.premiers === true) hideScheduledPremiers(videos);
    if (hideConfig.live.premiers === true) hideLivePremiers();
}

var observer = new MutationObserver(hideStreams)
observer.observe(
    document.querySelector('div#contents'), {
        childList: true,
        subtree: false, 
        attributes: false, 
        characterData : false
    }
)

hideStreams();
