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
                function _get(className) {
                    return item.getElementsByClassName(className)[0];
                }

                var item = document.getElementById("download_item_template").cloneNode(true);
                item.removeAttribute("id");
                item.setAttribute("data-id", media.id);
                item.setAttribute("hidden", false);

                _get("download_button").setAttribute("href", "#");
                _get("download_url").textContent = media.filename;
                _get("download_url").setAttribute("href", media.url);
                _get("download_url").setAttribute("title", media.url);

                function onClick(event) {
                    console.log('startDownload', media);
                    media.filename = media.filename.replace(/[\/:\\*?"<>|]/i, " ");
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
                        chrome.tabs.create({ url: "DownloadManager.html" });
                    }
                    
                    event.stopPropagation();
                }
                if(media.source == "stream") {
                    _get("download_size").textContent = "Stream";
                } else if(media.source == "youtube") {
                    _get("download_size").textContent = "[" + media.qualify + "]";
                } else {
                    _get("download_size").textContent = convertMediaSize(media.size);
                }
                
                _get("download_button").addEventListener("click", onClick, false);
                return item;
            }

            this.init = function () {
                reset(tab);

                function reset(tab) {
                    var media = VideoDownloader.mediaData.getMediaByTabId(tab.id);
                    var container = document.getElementById("download_item_container");

                    if (!media || media.length == 0) {
                        container.textContent = "Không tìm thấy video.";
                        container.style.color = "#b89a52";
                        return;
                    }

                    var title = document.getElementById("download_title");

                    if (title) {
                        title.removeAttribute("hidden");
                    }

                    while (container.firstChild) {
                        container.removeChild(container.firstChild);
                    }

                    media.forEach(function (m) {
                        try {
                            var item = buildItem(m);
                            container.appendChild(item);
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

