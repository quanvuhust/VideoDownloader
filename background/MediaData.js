class MediaData {
    constructor() {
        this.data = {};
    }

    isExist (tabId, media) {
        var len = this.data[tabId].length;
        for(var i = 0; i < len; i++) {
            var x = this.data[tabId][i];
            if(x.url == media.url) {
                return true;
            } else {
                if(x.fileNameOnServer != undefined || media.fileNameOnServer != undefined) {
                    if(x.fileNameOnServer == media.fileNameOnServer){
                        return true;
                    }
                }
            }
        }

        return false;
    }

    addMedia (media) {
        if(!Boolean(media)) {
            return;
        }
        var tabId = media.tabId;
        if (this.data[tabId] != undefined) {
            if (!this.isExist(tabId, media)) {
                // Add id to media
                media.id = this.data[tabId].length;
                this.data[tabId].push(media);
            }
        }
        else {
            media.id = 0;
            this.data[tabId] = [media];
        }
    }

    getMediaByTabId(tabId) {
        return this.data[tabId];
    }
    // Xóa các video có tab url không giống tab url hiện tại
    removeByTab(tab) {
        if (this.data[tab.id] != undefined) {
            var len = this.data[tab.id].length;
            for(var i = 0; i < len; i++) {
                console.log(this.data[tab.id][i].tabUrl);
                console.log(tab.url);
                if(this.data[tab.id][i].tabUrl != tab.url) {
                    this.data[tab.id].splice(i, 1);
                    i--;
                    len--;
                }
            }
        }   
    }

    removeByTabId(tabId) {
        if (this.data[tabId] != undefined) {
            console.log("remove tab ", tabId);
            delete this.data[tabId];
        }   
    }
}

VideoDownloader.mediaData = new MediaData();