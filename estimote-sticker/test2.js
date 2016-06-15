var debug = require('debug')('box');
var debugMore = require('debug')('box-verbose');

var http = require("http");


var topUuid = "d0d3fa86ca7645ec9bd96af4374cd69a87f92364";
var resHandle;

http.createServer(function (req, res) {
  var interval;
  console.log("~~~ Got connection");

  resHandle = res;

  res.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive","Access-Control-Allow-Origin":"*"});

  req.connection.addListener("close", function () {
    resHandle = undefined;
  }, false);
}).listen(8080, "127.0.0.1");
//}).listen(8080, "0.0.0.0");

function pushStickerEventSSE(uuid, state) {
  if (resHandle === undefined) {
    console.log("~~~ resHandle currently unset");
    return;
  }

//  console.log(resHandle);
  console.log("~~~ pushing sticker event to SSE client");
  resHandle.write("event: newcontent\n");
//  resHandle.write('data: foobar\n\n');
  var stateChangeStr = 'data: { "uuid": "' + uuid + '", "state": "' + state + '" }\n\n';
//  console.log('data: { "uuid": "' + uuid + '", "state": "' + state + '" }\n\n');

 // console.log(stateChangeStr);
  resHandle.write(stateChangeStr);
}



var EstimoteSticker = require('./estimote-sticker');

var THRESHOLD = -45;
var RSSI_WIN_SIZE = 3;
var WIN_TIMEOUT = 8000;


stickers = {};

// true: in, false: out
function win_to_state(rssi_win) {
  var count = 0;
  var sum = 0;
  var rssi_ave;

  for (i in rssi_win) {
    sum += rssi_win[i];
    count++;
  }

  if (count === 0)
    return { rssi_ave: undefined, state: undefined };

  rssi_ave = sum / count;

  if (rssi_ave < THRESHOLD)
    return { rssi_ave: Math.floor(rssi_ave), state: "OUT" };
  else
    return { rssi_ave: Math.floor(rssi_ave), state: "IN" };
}


function winTimeoutHandler(uuid) {
  debugMore("Timeout for: " + uuid);
  
  pushStickerEventSSE(uuid, "OUT");
  stickers[uuid] = undefined;
}

EstimoteSticker.on('discover', function(estimoteSticker) {
  var id = estimoteSticker.id;
  var uuid = estimoteSticker.uuid;

  var rssi_win = [];
  var old_state;

  if (stickers[uuid] !== undefined)
    old_state = win_to_state(stickers[uuid].rssi_win);
  else
    old_state = { rssi_ave: undefined, state: undefined };

  if (stickers[uuid] !== undefined) {
    clearTimeout(stickers[uuid].timer);
    rssi_win = stickers[uuid].rssi_win;
  }

  debugMore(uuid + ":");
  debugMore({ old_state: old_state.state, rssi_win: rssi_win, rssi_ave: old_state.rssi_ave });

  if (rssi_win.length >= RSSI_WIN_SIZE)
    rssi_win.shift();

  rssi_win.push(estimoteSticker.rssi);

  var new_state = win_to_state(rssi_win);

  debugMore({ new_state: new_state.state, rssi_win: rssi_win, rssi_ave: new_state.rssi_ave });

  if (old_state.state !== new_state.state) {
    debug(uuid + ": State changed to: " + new_state.state);
    pushStickerEventSSE(uuid, new_state.state);
  }

  stickers[uuid] = { rssi_win: rssi_win };
  stickers[uuid].timer = setTimeout(function() {
     winTimeoutHandler(uuid);
  }, WIN_TIMEOUT);
});


EstimoteSticker.startScanning();

