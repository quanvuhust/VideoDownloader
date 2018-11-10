
var State = {
	READY:0,
	LOADING:1,
	COMPLETE:2
};

class StreamWorker {
	loadPlayListFile (url, callback) {
		var ajax = new XMLHttpRequest();
		ajax.open('GET', url, true);
		//ajax.setRequestHeader('Cache-Control', 'no-cache');
		ajax.timeout = 3000;
		
		ajax.onload = function () {
			var content = this.responseText;
			if (!content){
				return;
			}

			var tsList = [];
			var host = url.substr(0, url.lastIndexOf('/') + 1);
			var domain = url.match(/^(https?:\/\/[^\/]*)\//);
			var protocol = url.substr(0, url.indexOf("//"));
			
			content = content.split('\n');
			for(var line = 0; line < content.length; line++) {
				content[line] = content[line].trim();
				if (!content[line] || content[line].substring(0, 1) == '#') {
					continue;
				}

				var tsUrl = content[line];
				
				if (tsUrl.indexOf('http') != 0) {
					if(tsUrl.indexOf("//") != -1) {
						tsUrl = protocol + tsUrl;
					} else if (tsUrl.indexOf('/') == 0){
						tsUrl = domain + tsUrl;
					} else {
						tsUrl = host + tsUrl;
					}
				}
				tsList.push(tsUrl);
			};
			ajax.abort();
			callback(tsList);
		};

		ajax.ontimeout = function(e) {
			ajax.abort();
		}
		
		ajax.send(null);
	}

	writeToFile() {
		var worker = this;
		var blob = [];
		for(var i = this.startSegment; i < this.file.length; i++) {
			if(i == this.startSegment && this.file[i].state == State.COMPLETE) {
				blob.push(this.file[i].stream);
				delete this.file[i];
				this.startSegment += 1;
			} else {
				break;
			}
		}

		if(blob.length > 0) {
			var onFs = function (fs) {
				fs.root.getFile(worker.media.filename, {create:false}, function (file) {
					file.createWriter(function (writer) {	
						writer.onwriteend = function () {
							console.log("write success");
						};
						writer.onerror = function (err) {
							console.log('ERROR fileSystem:', err);
						};

						writer.seek(writer.length);
						writer.write(new Blob(blob, {type: "video/mp4"}));
					});
				});
			}

			try {
				webkitRequestFileSystem(TEMPORARY, 1024 * 1024, onFs);
			} catch (err) {
				console.log(err);
			}
			
		}

		console.log("Delete " + blob.length + " files");

		if (worker.file.length == this.startSegment) {
			this.finish = true;
			var path = "filesystem:chrome-extension://" + chrome.runtime.id + "/temporary/" + worker.media.filename;
			try {
				chrome.downloads.download({
					url: path,
					filename: worker.media.filename + '.' + worker.media.ext,
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
		}
	}

	loadTsFile(url, queueIndex) {
		var worker = this;
		function IsRequestSuccessful(httpReq) {
			return (httpReq.status == 0 || (httpReq.status >= 200 && httpReq.status < 300) || httpReq.status == 304 || httpReq.status == 1223);
		}

		worker.file[worker.queue[queueIndex]].state = State.LOADING;
		var ajax = new XMLHttpRequest();
		ajax.open("GET", url, true);
		ajax.ind = queueIndex;
		ajax.responseType = "arraybuffer";
		ajax.timeout = 300000;

		ajax.onreadystatechange = function () {
			if (ajax.readyState == 4) {
				if (IsRequestSuccessful(ajax)) {
					var i = worker.queue[ajax.ind];

					worker.file[i].stream = new Uint8Array(ajax.response);

					var size = ajax.getResponseHeader("Content-Length");

					if (size) {
						size = parseInt(size);
					} else {
						size = worker.file[i].stream.length;
					}

					if (size) {
						worker.sizeOfVideo += size;
					}

					worker.file[i].state = State.COMPLETE;
					worker.writeToFile();
					worker.nQueue--;
					delete worker.queue[queueIndex];
					worker.resetQueue();

					ajax.abort();
				}
				else {
					worker.file[worker.queue[queueIndex]].state == State.READY;
					worker.nQueue--;
					delete worker.queue[queueIndex];
					ajax.abort();
					worker.resetQueue();
				}
			}
		};
		ajax.ontimeout = function (e) {
			worker.nQueue--;
			worker.file[worker.queue[queueIndex]].state == State.READY;
			delete worker.queue[queueIndex];
			ajax.onreadystatechange = null;
			ajax.abort();
			worker.resetQueue();
		}
		ajax.onerror = function () {
			worker.file[worker.queue[queueIndex]].state == State.READY;
			worker.nQueue--;
			delete worker.queue[queueIndex];
			ajax.abort();
			worker.resetQueue();
		}
		ajax.send();
	}

	resetQueue() {
		var pick = [];
		var s = "";
		if(this.file.length < this.startSegment + 10) {
			var n = this.file.length;
		} else {
			var n = this.startSegment + 10;
		}

		for(var i = this.startSegment; i < n; i++) {
			s += " " + this.file[i].state;
		}
		console.log("file:", s);
		if(this.nQueue < this.MAX_QUEUE) {
			for (var i = 0; i < this.MAX_QUEUE; i++) {
				if (this.queue[i] == undefined) {
					pick.push(i);
				}
			}
			
			for (var j = this.startSegment; j < this.file.length; j++) {
				if (this.file[j].state == State.READY) {
					if (pick.length > 0) {
						this.queue[pick[0]] = j;
						pick.splice(0, 1);
						this.nQueue++;
					} else {
						break;
					}
				}
			}
		}
		console.log(this.file.length - this.startSegment + " " + this.queue.length)
		s = ""
		for(var i = 0; i < this.MAX_QUEUE; i++) {
			s += " " + this.queue[i];
		}
		console.log("queue:" + s);
		console.log("--------------------------------------------")
		for(var i = 0; i < this.MAX_QUEUE; i++) {
			if(this.queue[i] != undefined && this.file[this.queue[i]].state == State.READY) {
				this.loadTsFile(this.file[this.queue[i]].url, i);
			}
		}
	}

	start (media) {
		var worker = this;
		this.media = media;

		this.loadPlayListFile(media.url, function (tsList) {
			for (var i = 0; i < tsList.length; i++) {
				worker.file.push({
					url: tsList[i],
					state: State.READY,
					stream: null
				});
			}
			
			console.log(tsList);
			
			var onFs = function (fs) {
				fs.root.getFile(media.filename, {create:true}, function (file) {
					file.createWriter(function (writer) {
						console.log(file);
						
						writer.onwriteend = function () {
							console.log("write success");
						};
						writer.onerror = function (err) {
							console.log('ERROR fileSystem:', err);
						};

						worker.resetQueue();
					});
				});
			}

			try {
				webkitRequestFileSystem(TEMPORARY, 1024 * 1024, onFs);
			} catch (err) {
				console.log(err);
			}
				
		})
	};

	isFinish() {
		return this.finish;
	}

	getPercentProcess() {
		return this.startSegment / this.file.length * 100;
	}

	getTotalSizeDownload() {
		return this.sizeOfVideo;
	}

	getFileName() {
		return this.media.filename;
	}

	constructor() {
		this.file = [];
		this.nQueue = 0;
		this.queue = [];
		this.sizeOfVideo = 0;
		this.MAX_QUEUE = 5;
		this.startSegment = 0;
		this.media = null;
		this.finish = false;
	}
}

class Streamer {
	constructor() {
		this.workers = [];
	}

	start (media) {
		console.log('Streamer.start');
		var i = this.workers.length;
		this.workers.push(new StreamWorker());
		this.workers[i].start(media);
	};

	getStreamInfo() {
		var info = [];
		for (var i = 0; i < this.workers.length; i++) {
			info.push({
				name: this.workers[i].getFileName(),
				size: this.workers[i].getTotalSizeDownload(),
				percent: this.workers[i].getPercentProcess()
			})
		}
		return info;
	}
}

VideoDownloader.streamer = new Streamer();
/*
streamer.start({url: "https://ztv-mcloud-lpl-s3-te-vnno-vn-8.zadn.vn/AWiWQ9V6JPU/whls/vod/480/yFNqlM8mCJ4H4H9ol2C/ThucTapSinhXinhDep_01_muxed.m3u8?authen=exp=1541659102~acl=/AWiWQ9V6JPU/*~hmac=bebc5f6e2f0486a3f687d4105a7d3651",
                filename: "hls103.mp4"
});
*/