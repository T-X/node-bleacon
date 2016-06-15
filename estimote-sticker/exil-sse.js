var http = require("http");

module.exports.pushStickerEvent = pushStickerEvent;
module.exports.pushLidEvent = pushLidEvent;

var resHandle = undefined;

http.createServer(function (req, res) {
  var interval;
  console.log("~~~ Got connection: " + res.hostname + ", port " + res.port);
  console.log(req);

  resHandle = res;
//  resHandles[res[host]]
//  console.log("+++ " + );

  res.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive","Access-Control-Allow-Origin":"*"});

  req.connection.addListener("close", function () {
    resHandle = undefined;
  }, false);
//}).listen(8080, "127.0.0.1");
}).listen(8080, "0.0.0.0");

function pushStickerEvent(uuid, state) {
  if (resHandle === undefined) {
    console.log("~~~ resHandle currently unset");
    return;
  }

  var stateChangeStr = 'data: { "type": "thing", "uuid": "' + uuid + '", "state": "' + state + '" }\n\n';

//  console.log(resHandle);
  console.log("~~~ pushing sticker event to SSE client");
  resHandle.write("event: statechange\n");
//  resHandle.write('data: foobar\n\n');
/*  var stateChangeStr = 'data: { "uuid": "' + uuid + '", "state": "' + state + '" }\n\n';*/
//  console.log('data: { "uuid": "' + uuid + '", "state": "' + state + '" }\n\n');

  console.log(stateChangeStr);
  resHandle.write(stateChangeStr);
}

function pushLidEvent(state) {
  if (resHandle === undefined) {
    console.log("~~~ resHandle currently unset");
    return;
  }

  var stateChangeStr = 'data: { "type": "lid", "uuid": "", "state": "' + state + '" }\n\n';

  resHandle.write("event: statechange\n");
  resHandle.write(stateChangeStr);
}

/*function pushEvent(eventStr) {
	for (var h in resHandles) {
		for (var p in resHandles[h]) {
			console.log("+++ Got: host: " + h + ", port: " + p);
		}
	}
}*/
