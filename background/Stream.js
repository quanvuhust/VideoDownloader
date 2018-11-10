
class Stream {
    compiledMediaStream(details) {
        var stream = this;
        function isExist(mediaStream, url) {
            mediaStream.forEach(function (m) {
                if (m.url == url)
                    return true;
            });
    
            return false;
        };

        function extractFileNameOnServer(url) {
            var tmp = url.substr(0, url.indexOf('?')).split('/');
            return tmp[tmp.length - 1];
        }

        function extractMedia(details, url, codec, qualify) {
            var fileName = "unknown";

            if (details.tab.title != undefined) {
                fileName = details.tab.title;
            }

            var fileNameOnServer = extractFileNameOnServer(url);

            var media = {
                url: url,
                tabId: details.tabId,
                tabUrl: details.tab.url,
                fileNameOnServer: fileNameOnServer,
                ext: codec,
                filename: "[" + qualify + "] " + fileName,
                title: url,
                source: "stream"
            };
            return media;
        }

        //Thực hiện các hàm callback khi xuất hiện một event
        function execCallbacks(callbackList, media) {
            callbackList.forEach(function (callback) {
                callback(media);
            });
        }

        var url = details.url;
        // https:// or http://
        if (/^https?:\/\/[^\?]*\.m3u8/.test(url.toLowerCase())) {
            if (isExist(this.mediaStream, url)) {
                return;
            };

            this.mediaStream.push({ url: url, status: 1 });
            
            var ajax = new XMLHttpRequest();
            ajax.open('GET', url, true);
            ajax.setRequestHeader('Cache-Control', 'no-cache');
            ajax.timeout = 3000;

            ajax.onload = function () {
                var content = this.responseText;
                var line = content.split('\n');
                var host = url.substr(0, url.lastIndexOf('/') + 1);
                var domain = url.match(/^(https?:\/\/[^\/]*)\//);
                var protocol = url.substr(0, url.indexOf("//"));

                for (var i = 0; i < line.length; i++) {
                    if (line[i].indexOf('#EXT-X-STREAM-INF:') == 0) {
                        var playList = line[i + 1];
                        if (playList.indexOf('http') != 0) {
                            if(playList.indexOf("//") != -1) {
                                playList = protocol + playList;
                            } else if (playList.indexOf('/') == 0) {
                                playList = domain + playList;
                            } else {
                                playList = host + playList;
                            }
                        }

                        var qualify = line[i].match(/\,\s?RESOLUTION=([^,]+)/i)[1];
                        var codec = line[i].match(/\,CODECS=\"([^.]+)\./i);
                        if (!codec) {
                            codec = "mp4";
                        } else {
                            codec = codec[1];
                        }
                        var media = extractMedia(details, playList, codec, qualify);
                        console.log(media);
                        ajax.abort();
                        execCallbacks(stream.callbackList, media);
                    }
                }
                var len = stream.mediaStream.length;
                for (var i = 0; i < len; i++) {
                    if (stream.mediaStream[i].url == playList && stream.mediaStream[i].status == 1) {
                        stream.mediaStream[i].status = 2;
                    }
                }   
            };

            ajax.ontimeout = function(e) {
                var len = stream.mediaStream.length;
                for (var i = 0; i < len; i++) {
                    if (stream.mediaStream[i].url == url && stream.mediaStream[i].status == 1) {
                        stream.mediaStream.slice(i, 1);
                        i--;
                        len--;
                    }
                }
                ajax.abort();
            }

            ajax.send(null);
        }
    }

    constructor() {
        this.mediaStream = [];
        this.callbackList = [];
        var stream = this;
        this.onMediaDetect = {
            addListener: function (callback) {
                if (stream.callbackList.indexOf(callback) == -1) {
                    stream.callbackList.push(callback);
                }
            },
            removeListener: function () {
                stream.callbackList.length = 0;
            }
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
                    details.tab = tab;
                    stream.compiledMediaStream(details);
                }
            });
        };

        var filter = { urls: ["<all_urls>"], };
        var opt_extraInfoSpec = ["responseHeaders"];
        chrome.webRequest.onResponseStarted.addListener(callback, filter, opt_extraInfoSpec);
    }
}

VideoDownloader.stream = new Stream();