var http = require("http");

module.exports.pushStickerEvent = pushStickerEvent;
module.exports.pushLidEvent = pushLidEvent;

var connections = new Set();

function conCleanerFactory(con) {
  return function() {
    connections.delete(con);
    console.log("~~~ Connection closed: " + con.hostname + ", port " + con.port);
    console.log(con);
  };
}

http.createServer(function (req, res) {
  var interval;
  console.log("~~~ Got connection: " + res.hostname + ", port " + res.port);
  console.log(req);

  connections.add(res);
//  resHandles[res[host]]
//  console.log("+++ " + );

  res.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive","Access-Control-Allow-Origin":"*"});

  var closingFunc = conCleanerFactory(res);

  req.connection.addListener("close", closingFunc, false);
//}).listen(8080, "127.0.0.1");
}).listen(8080, "0.0.0.0");

function pushStickerEvent(uuid, state) {
  var stateChangeStr = 'data: { "type": "thing", "uuid": "' + uuid + '", "state": "' + state + '" }\n\n';

  console.log("~~~ pushing sticker event to SSE clients");
  console.log(stateChangeStr);

  connections.forEach(function (c) {
    c.write("event: statechange\n");
    c.write(stateChangeStr);
  });
//  resHandle.write('data: foobar\n\n');
/*  var stateChangeStr = 'data: { "uuid": "' + uuid + '", "state": "' + state + '" }\n\n';*/
//  console.log('data: { "uuid": "' + uuid + '", "state": "' + state + '" }\n\n');

}

function pushLidEvent(state) {
  var stateChangeStr = 'data: { "type": "lid", "uuid": "", "state": "' + state + '" }\n\n';

  connections.forEach(function (c) {
    c.write("event: statechange\n");
    c.write(stateChangeStr);
  });
}

/*function pushEvent(eventStr) {
	for (var h in resHandles) {
		for (var p in resHandles[h]) {
			console.log("+++ Got: host: " + h + ", port: " + p);
		}
	}
}*/
