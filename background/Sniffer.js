
class Sniffer {
    constructor() {
        const TRIGGER_VIDEO_SIZE = 1048576;

        function getValueByName(name, details) {
            var result = details.responseHeaders.find(function (x) {
                return x.name.toLowerCase() == name.toLowerCase();
            });
            if (Boolean(result)) {
                return result.value;
            }
            return null;
        }

        function extractExt(details) {
            if (!Boolean(details))
                return null;

            var ext = null, url = details.url;
            // Tên file
            console.log(url);
            var file = url.split('?')[0].split('/').pop();
            var i = file.lastIndexOf('.');

            if (i != -1) {
                ext = file.substring(i + 1, file.length).toLowerCase();
            } else {
                var contentType = getValueByName("content-type", details);
                if (contentType != null) {
                    ext = contentType.split("/")[1].toLowerCase();
                }
            }

            return ext;
        }

        function isMedia(details) {
            var url = details.url;
            // Stream video
            if (/^https?:\/\/(.*)seg(\d+)-frag(\d+)/.test(url.toLowerCase())) {
                return false;
            }
            if (/\/segment\-[0-9]\.m4s/.test(url.toLowerCase())) {
                return false;
            }
            if (/^https?:\/\/(.*)\.ts/.test(url.toLowerCase())) {
                return false;
            }
            if (/^https?:\/\/[^\?]*\.m3u8/.test(url.toLowerCase())) {
                return false;
            }
            if (getValueByName("content-length", details) < TRIGGER_VIDEO_SIZE) {
                return false;
            }
            if ((/^(video)/i).test(getValueByName("content-type", details))) {
                return true;
            }
            
            return false;
        };

        function extractFileNameOnServer(url) {
            var tmp = url.substr(0, url.indexOf('?')).split('/');
            return tmp[tmp.length - 1];
        }

        function isEncoded(uri) {
            uri = uri || '';

            return uri !== decodeURIComponent(uri);
        }

        function extractMedia(details) {
            var url = details.url;
            // Trong trường hợp url bị encode
            while (isEncoded(url)) {
                url = decodeURIComponent(url);
            }

            var fileName = "unknown";
            var ext = extractExt(details);

            if (details.tab.title != undefined) {
                fileName = details.tab.title;
            }

            var fileNameOnServer = extractFileNameOnServer(url);
            var size = getValueByName("Content-Length", details);

            var result = {
                url: url,
                tabId: details.tabId,
                tabUrl: details.tab.url,
                ext: ext,
                filename: fileName,
                fileNameOnServer: fileNameOnServer,
                size: size,
                source: "sniffer"
            };
            return result;
        };

        var callback = function (details) {
            if (!details || details.tabId < 0)
                return false;

            chrome.tabs.get(details.tabId, function (tab) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                }
                else if (!tab) {
                    console.log(details);
                }
                else {
                    if (details.url.indexOf("youtube.com/watch?v=") != -1) {
                        if(details.url.indexOf('&') != -1) {
                            var url = details.url.substr(0, details.url.indexOf('&'));
                        } else {
                            var url = details.url;
                        }
                        
                        console.log("Detect youtube: ", url);
                        var ajax = new XMLHttpRequest();
                        ajax.open('GET', url, true);
                        ajax.setRequestHeader('Cache-Control', 'no-cache');
                        ajax.timeout = 3000;

                        ajax.onload = function () {
                            if (this.readyState == 4 && this.status == 200) {
                                var wrapper= document.createElement('div');
                                wrapper.innerHTML= this.responseText;
                                var content = wrapper.querySelector("#player");
                                
                                if (!content) {
                                    content = wrapper.querySelector("#player-wrap");
                                }

                                content = content.getElementsByTagName("script")[1].innerText;
                                var tmp = content.match(/[^?]+"url_encoded_fmt_stream_map":"(.*?)"[^?]+/);

                                var l = null;
                                var title = null;
                                if (tmp) {
                                    l = tmp[1].split(",");
                                }

                                tmp = content.match(/[^?]+"title":[\s]*"(.*?)"[^?]+/);
                                if (tmp) {
                                    title = tmp[1];
                                }

                                var len = l.length;
                                for (var i = 0; i < len; i++) {
                                    l[i] = decodeURIComponent(JSON.parse('"' + l[i].replace(/\"/g, '\\"') + '"'));
                                    tmp = l[i].match(/^.*type=video\/(.*?)($|\;)/i);
                                    var ext = null;

                                    if (tmp) {
                                        ext = tmp[1];
                                    }
                                    var qualify = null;
                                    tmp = l[i].match(/^.*quality=(.*?)($|\&)/i)
                                    if (tmp) {
                                        qualify = tmp[1];
                                    }

                                    var url = l[i].substr(l[i].indexOf("url=") + 4, l[i].length).split(';')[0];
                                    console.log(url);
                                    url = url.replace(/\&type=video\/(.*?)($|\&)/i, "&");
                                    url = url.replace(/\&quality=(.*?)($|\&)/i, "&");
                                    url = url.replace(/\&itag=[0-9]+($|\&$)/i, "");
                                    url = decodeURIComponent(JSON.parse('"' + url.replace(/\"/g, '\\"') + '"'));
                                    console.log(url);

                                    var media = {
                                        url: url,
                                        tabId: details.tabId,
                                        tabUrl: tab.url,
                                        ext: ext,
                                        filename: title,
                                        qualify: qualify,
                                        source: "youtube"
                                    };
                                    console.log(media);
                                    execCallbacks(media);
                                }
                                this.abort();
                            }

                        };

                        ajax.ontimeout = function (e) {

                            ajax.abort();
                        }

                        ajax.send(null);
                    } else if (isMedia(details)) {
                        details.tab = tab;
                        if(tab.url.indexOf("youtube") == -1) {
                            var media = extractMedia(details);
                            //console.log(media);
                            execCallbacks(media);
                        }
                    }
                }
            });
        };

        var filter = { urls: ["<all_urls>"], };
        var opt_extraInfoSpec = ["responseHeaders"];
        chrome.webRequest.onResponseStarted.addListener(callback, filter, opt_extraInfoSpec);

        var callbackList = [];
        this.onMediaDetect = {
            addListener: function (callback) {
                if (callbackList.indexOf(callback) == -1) {
                    callbackList.push(callback);
                }
            },
            removeListener: function () {
                callbackList.length = 0;
            }
        };
        //Thực hiện các hàm callback khi xuất hiện một event
        function execCallbacks(media) {
            callbackList.forEach(function (callback) {
                callback(media);
            });
        }
    }
}
VideoDownloader.sniffer = new Sniffer();
