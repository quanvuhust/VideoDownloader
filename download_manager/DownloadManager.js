chrome.runtime.getBackgroundPage(function (backgroundPage) {
    VideoDownloader = backgroundPage.VideoDownloader;

    var myVar = setInterval(update, 10);
    var c = 0;

    function buildItem(id, worker) {
        var item = $("#progress_bar_template").clone();
        item.removeAttr("id");
        item.attr("data-id", id);
        item.show();

        item.find(".progress_name").text(worker.name);
        var width = Math.round(worker.percent);
        if (width == 100) {
            c++;
        }
        var progress_bar = item.find(".progress_bar");
        progress_bar.css("width", width + "%");
        progress_bar.text(width * 1 + '%');

        return item;
    }

    function update() {
        c = 0;
        var container = $("#progess_container");
        container.empty();

        var info = VideoDownloader.streamer.getStreamInfo();
        
        for (var i = 0; i < info.length; i++) {
            var item = buildItem(i, info[i]);
            container.append(item);
        }

        if (c == info.length) {
            clearInterval(myVar);
        }
    };
});
