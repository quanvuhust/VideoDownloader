chrome.runtime.getBackgroundPage(function (backgroundPage) {
    VideoDownloader = backgroundPage.VideoDownloader;

    class Popup {
        constructor(tab) {
            function convertMediaSize(size) {
                if (size < 1073741824)
                    return (Math.round(size / 1048576)) + "MB";
                else
                    return (Math.round(size / 1073741824)) + "GB";
            }

            function buildItem(media) {
                var item = $("#download_item_template").clone();
                item.removeAttr("id");
                item.attr("data-id", media.id);
                item.show();
                //item.attr("hidden", false);

                var download_button = item.find(".download_button");
                download_button.attr("href", "#");

                var download_url = item.find(".download_url");

                download_url.text(media.filename);
                media.filename = media.filename.replace(/[\/:\\*?"<>|]/i, " ");

                download_url.attr("href", media.url);
                download_url.attr("title", media.url);

                function onClick(event) {
                    console.log('startDownload', media);
                    //media.filename = media.filename.replace(/[\/:\\*?"<>|]/i, " ");
                    console.log(media.filename);
                    if(media.source == "sniffer") {
                        try {
                            chrome.downloads.download({
                                url: media.url,
                                filename: media.filename + "." + media.ext,
                                saveAs: true 
                            },
                                function (downloadId) {
                                    console.log('DOWNLOAD: ', downloadId);
                                }
                            );
                        }
                        catch (e) {
                            console.log(e);
                        }
                    } else if(media.source == "youtube") {
                        try {
                            chrome.downloads.download({
                                url: media.url,
                                filename: media.filename + "." + media.ext,
                                saveAs: true 
                            },
                                function (downloadId) {
                                    console.log('DOWNLOAD: ', downloadId);
                                }
                            );
                        }
                        catch (e) {
                            console.log(e);
                        }
                    } else if(media.source == "stream") {
                        VideoDownloader.streamer.start(media);
                        chrome.tabs.create({ url: "download_manager/DownloadManager.html" });
                    }
                    
                    event.stopPropagation();
                }

                var download_size = item.find(".download_size");
                if(media.source == "stream") {
                    download_size.text("Stream");
                } else if(media.source == "youtube") {
                    download_size.text("[" + media.qualify + "]");
                } else {
                    download_size.text(convertMediaSize(media.size));
                }
                
                download_button.click(onClick);
                return item.get(0);
            }

            this.init = function () {
                reset(tab);

                function reset(tab) {
                    var media = VideoDownloader.mediaData.getMediaByTabId(tab.id);
                    var container = $("#download_item_container");

                    if (!media || media.length == 0) {
                        container.text("Không tìm thấy video.");
                        container.css("color", "#b89a52");
                        return;
                    }

                    var title = $("#download_title");

                    if (title) {
                        title.show();
                        //title.removeAttr("hidden");
                    }

                    container.empty();

                    media.forEach(function (m) {
                        try {
                            var item = buildItem(m);
                            container.append(item);
                        }
                        catch (e) {
                            console.log(e);
                        }
                    });
                };
            };

            this.init();
        }
    }

    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        if (tabs.length > 0) {
            VideoDownloader.popup = new Popup(tabs[0]);
        }
    });
});

