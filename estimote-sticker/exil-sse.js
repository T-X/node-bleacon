var http = require("http");

module.exports.pushStickerEvent = pushStickerEvent;
module.exports.pushLidEvent = pushLidEvent;

var connections = new Set();

function conCleanerFactory(con) {
  return function() {
    connections.delete(con);
  };
}

http.createServer(function (req, res) {
  var interval;

  connections.add(res);
  res.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive","Access-Control-Allow-Origin":"*"});

  var closingFunc = conCleanerFactory(res);

  req.connection.addListener("close", closingFunc, false);
}).listen(8080, "0.0.0.0");

function pushStickerEvent(uuid, state) {
  var stateChangeStr = 'data: { "type": "thing", "uuid": "' + uuid + '", "state": "' + state + '" }\n\n';

  connections.forEach(function (c) {
    c.write("event: statechange\n");
    c.write(stateChangeStr);
  });
}

function pushLidEvent(state) {
  var stateChangeStr = 'data: { "type": "lid", "uuid": "", "state": "' + state + '" }\n\n';

  connections.forEach(function (c) {
    c.write("event: statechange\n");
    c.write(stateChangeStr);
  });
}
