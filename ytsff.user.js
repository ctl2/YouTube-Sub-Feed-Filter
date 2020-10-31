// ==UserScript==
// @name        YouTube Sub Feed Filter
// @version     0.5
// @description Filters your YouTube subscriptions feed.
// @match       *://www.youtube.com/*
// @match       *://youtube.com/*
// @license     GPLv3 - http://www.gnu.org/licenses/gpl-3.0.en.html
// @copyright   callumtylerlatham@gmail.com
// @namespace   https://greasyfork.org/users/696211-ctl2
// ==/UserScript==

// Config

// To learn how to write a configuration, see https://greasyfork.org/en/scripts/413818-youtube-sub-feed-filter
// NOTE: Your config will be overwritten if you download an update for this script. Consider backing it up!
let filterConfig = {
    
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

// Hider helpers

class VideoSectionSplitter {
    hideables = [];
    
    constructor(videoSection) {
        this.nonHideables = videoSection.querySelectorAll("ytd-grid-video-renderer");
    }
    
    split(channelRegex, titleRegex, predicate = video => true) {
        let newNonHideables = [];
        for (let video of this.nonHideables) {
            if (
                channelRegex.test(video.querySelector("a.yt-formatted-string").innerText) && 
                titleRegex.test(video.querySelector("a#video-title").innerText) && 
                predicate(video)
            ) {
                this.hideables.push(video);
            } else {
                newNonHideables.push(video);
            }
        }
        this.nonHideables = newNonHideables;
    }
    
    splitScheduledStreams(channelRegex, titleRegex) {
        this.split(
            channelRegex, titleRegex, 
            video => firstWordEquals(getMetadataLine(video).children[0], "Scheduled"),
        );
    }
    
    splitLiveStreams(channelRegex, titleRegex) {
        this.split(
            channelRegex, titleRegex, 
            video => {
                let liveBadge = getLiveBadge(video);
                return liveBadge === null ?
                    false :
                    firstWordEquals(liveBadge.querySelector("span.ytd-badge-supported-renderer"), "LIVE");
            }
        );
    }
    
    splitFinishedStreams(channelRegex, titleRegex) {
        this.split(
            channelRegex, titleRegex, 
            video => {
                let metaDataLine = getMetadataLine(video);
                return metaDataLine.children.length > 1 && firstWordEquals(metaDataLine.children[1], "Streamed")
            }
        );
    }
    
    splitScheduledPremiers(channelRegex, titleRegex) {
        this.split(
            channelRegex, titleRegex, 
            video => firstWordEquals(getMetadataLine(video).children[0], "Premieres")
        );
    }
    
    splitLivePremiers(channelRegex, titleRegex) {
        this.split(
            channelRegex, titleRegex, 
            video => {
                let liveBadge = getLiveBadge(video);
                return liveBadge === null ?
                    false :
                    firstWordEquals(liveBadge.querySelector("span.ytd-badge-supported-renderer"), "PREMIERING");
            }
        );
    }
    
    splitOthers(channelRegex, titleRegex) {
        this.split(
            channelRegex, titleRegex, 
            video => new RegExp("^\\d+ .+ ago$").test(video.querySelector("#metadata-line").children[1].innerText)
        );
        
    }
}

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
    for (let videoSection of videoSections) {
        // Collect hideables and non-hideables
        let videoSectionSplitter = new VideoSectionSplitter(videoSection);
        for (let channel of Object.getOwnPropertyNames(filterConfig)) {
            let channelConfig = filterConfig[channel];
            let channelRegex = new RegExp(channel);
            if (channelConfig.hasOwnProperty("streams")) {
                if (channelConfig.streams.hasOwnProperty("scheduled")) {
                    videoSectionSplitter.splitScheduledStreams(channelRegex, new RegExp(channelConfig.streams.scheduled));
                }
                if (channelConfig.streams.hasOwnProperty("live")) {
                    videoSectionSplitter.splitLiveStreams(channelRegex, new RegExp(channelConfig.streams.live));
                }
                if (channelConfig.streams.hasOwnProperty("finished")) {
                    videoSectionSplitter.splitFinishedStreams(channelRegex, new RegExp(channelConfig.streams.finished));
                }
            }
            if (channelConfig.hasOwnProperty("premiers")) {
                if (channelConfig.premiers.hasOwnProperty("scheduled")) {
                    videoSectionSplitter.splitScheduledPremiers(channelRegex, new RegExp(channelConfig.premiers.scheduled))
                }
                if (channelConfig.premiers.hasOwnProperty("live")) {
                    videoSectionSplitter.splitLivePremiers(channelRegex, new RegExp(channelConfig.premiers.live))
                }
            }
            if (channelConfig.hasOwnProperty("others")) {
                videoSectionSplitter.splitOthers(channelRegex, new RegExp(channelConfig.others))
            }
        }
        if (videoSectionSplitter.nonHideables.length === 0) {
            // Hide full section (including title)
            hide(videoSection);
        } else {
            // Hide hideable videos
            for (let hideable of videoSectionSplitter.hideables) {
                hide(hideable);
            }
        }
    }
}

// Main helpers

function getRegexArray(stringArray) {
    return stringArray.map(string => new RegExp(string));
}

function isSubscriptionsPage() {
    return document.querySelector("ytd-expanded-shelf-contents-renderer") === null && // True if on grid-view rather than list-view
        new RegExp("^.*youtube.com/feed/subscriptions(\\?flow=1|\\?pbjreload=\\d+)?$").test(document.URL);
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

function getMergedConfigs() {
    if (!filterConfig.hasOwnProperty("soft")) filterConfig.soft = {};
    if (!filterConfig.hasOwnProperty("hard")) filterConfig.hard = {};
    // Try for a straightforward merge
    let hardChannels = Object.keys(filterConfig.hard);
    if (hardChannels.length === 0) return filterConfig.soft;
    if (hardChannels.includes("")) return {"": filterConfig.hard[""]};
    // Use non-overwriting channel regex, based on the keys in `filterConfig.soft`, to merge soft and hard configs
    let mergedConfigs = {...filterConfig.hard};
    let negativeLookaheadString =  "(?!.*(" + hardChannels.join("|") + "))^.*";
    for (let softChannel of Object.keys(filterConfig.soft)) {
        mergedConfigs[negativeLookaheadString + softChannel] = filterConfig.soft[softChannel];
    }
    return mergedConfigs;
}

function flattenRegex(object) {
    for (let property of Object.keys(object)) {
        if (typeof object[property] === "object") {
            if (Array.isArray(object[property])) {
                object[property] = "(" + object[property].join("|") + ")";
            } else {
                flattenRegex(object[property]);
            }
        }
    }
}

function spreadDefaultConfig(channelConfig) {
    let defaultConfig = channelConfig.default;
    if (!channelConfig.hasOwnProperty("streams")) {
        channelConfig.streams = {
            "scheduled": defaultConfig,
            "live": defaultConfig, 
            "finished": defaultConfig
        };
    } else {
        if (!channelConfig.streams.hasOwnProperty("scheduled")) {
            channelConfig.streams.scheduled = defaultConfig;
        }
        if (!channelConfig.streams.hasOwnProperty("live")) {
            channelConfig.streams.live = defaultConfig;
        }
        if (!channelConfig.streams.hasOwnProperty("finished")) {
            channelConfig.streams.finished = defaultConfig;
        }
    }
    if (!channelConfig.hasOwnProperty("premiers")) {
        channelConfig.premiers = {
            "scheduled": defaultConfig,
            "live": defaultConfig
        };
    } else {
        if (!channelConfig.premiers.hasOwnProperty("scheduled")) {
            channelConfig.premiers.scheduled = defaultConfig;
        }
        if (!channelConfig.premiers.hasOwnProperty("live")) {
            channelConfig.premiers.live = defaultConfig;
        }
    }
    if (!channelConfig.hasOwnProperty("others")) {
        channelConfig.others = defaultConfig;
    }
}

function buildConfigBranches() {
    for (let channel of Object.keys(filterConfig)) {
        let channelConfig = filterConfig[channel];
        if (channelConfig.hasOwnProperty("default")) {
            spreadDefaultConfig(channelConfig);
        } else {
            if (typeof channelConfig.streams === "string") {
                channelConfig.streams = {
                    "scheduled": channelConfig.streams,
                    "live": channelConfig.streams, 
                    "finished": channelConfig.streams
                };
            }
            if (typeof channelConfig.premiers === "string") {
                channelConfig.premiers = {
                    "scheduled": channelConfig.premiers,
                    "live": channelConfig.premiers
                };
            }
        }
    }
}

// Main

filterConfig = getMergedConfigs();
flattenRegex(filterConfig);
buildConfigBranches();

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
