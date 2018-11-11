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
        var startLoading = false;
        // Xóa các video khi một tab chuyển sang URL mới
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
            if(startLoading == false) {
                startLoading = true;
                console.log("Remove old video.----------------");
                VideoDownloader.mediaData.removeByTab(tab);
            }

            if (changeInfo.status == "complete") {
                startLoading = false;
            }
        });
    }
}

VideoDownloader.capture = new Capture();