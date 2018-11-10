

chrome.runtime.getBackgroundPage(function (backgroundPage) {
    VideoDownloader = backgroundPage.VideoDownloader;

    var myVar = setInterval(update, 10);
    var c = 0;

    function buildItem(id, worker) {
        function _get(className) {
            return item.getElementsByClassName(className)[0];
        }

        var item = document.getElementById("progress_bar_template").cloneNode(true);
        item.removeAttribute("id");
        item.setAttribute("data-id", id);
        item.setAttribute("hidden", false);

        _get("progress_name").textContent = worker.name;
        var width = Math.round(worker.percent);
        if (width == 100) {
            c++;
        }

        _get("progress_bar").style.width = width + "%";
        _get("progress_bar").textContent = width * 1 + '%';

        return item;
    }

    function update() {
        c = 0;
        var container = document.getElementById("progess_container");
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        var info = VideoDownloader.streamer.getStreamInfo();
        
        for (var i = 0; i < info.length; i++) {
            var item = buildItem(i, info[i]);
            container.appendChild(item);
        }

        if (c == info.length) {
            clearInterval(myVar);
        }
    };
});
