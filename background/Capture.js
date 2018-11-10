class Capture {
    constructor () {
        const MODULES = ["sniffer", "stream"];
        var mediaDetectListener = function(media) {
            VideoDownloader.mediaData.addMedia(media);
        }

        MODULES.forEach(function (module) {
            if (VideoDownloader[module]) {
                VideoDownloader[module].onMediaDetect.addListener(mediaDetectListener);
            }
        });
        // Xóa các video khi một tab chuyển sang URL mới
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
            if (changeInfo.status == "complete") {
                VideoDownloader.mediaData.removeByTab(tab);
            }
        });
    }
}

VideoDownloader.capture = new Capture();