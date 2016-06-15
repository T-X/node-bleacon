var debug = require('debug')('box');
var debugMore = require('debug')('box-verbose');

var EstimoteSticker = require('./estimote-sticker');
var sse = require('./exil-sse.js');

var THRESHOLD = -41;
var RSSI_WIN_SIZE = 6;
var WIN_TIMEOUT = 8000;

var lidUUID = "d0d3fa86ca7645ec9bd96af4374cd69a87f92364";


var stickers = {};
var lidState = "OPEN";

// true: in, false: out
function win_to_state(rssi_win) {
  var count = 0;
  var sum = 0;
  var rssi_ave;
  /*
  for (var i in rssi_win) {
    sum += rssi_win[i];
    count++;
  }
  */

  if (rssi_win.length === 0)
    return { rssi_ave: undefined, state: undefined };
  
  rssi_win = rssi_win.slice();
  rssi_win.sort();

  rssi_ave = (
    rssi_win[Math.floor((rssi_win.length - 1) / 2)] +
    rssi_win[Math.ceil((rssi_win.length - 1) / 2)]) / 2;
  console.log("foobar" + rssi_ave);
  if (rssi_ave < THRESHOLD)
    return { rssi_ave: Math.floor(rssi_ave), state: "OUT" };
  else
    return { rssi_ave: Math.floor(rssi_ave), state: "IN" };
}


function winTimeoutHandler(uuid) {
  debugMore("Timeout for: " + uuid);
  
  sse.pushStickerEvent(uuid, "OUT");
  stickers[uuid] = undefined;
}

var LID_TOLERANCE = 0.2;
var LID_CLOSED_VAL = 1024;

function getLidState(z_state) {
  var min = LID_CLOSED_VAL * (1 - LID_TOLERANCE);
  var max = LID_CLOSED_VAL * (1 + LID_TOLERANCE);

  if (z_state > min && z_state < max) 
    return "CLOSED";
  else
    return "OPEN";
}

function discoverLid(sticker) {
  console.log("~~~ Lid: :) ");
  console.log(sticker.acceleration);
  /* acceleration.z === ~ +1024 -> upside down*/
  /* acceleration.z ===a ~     0 -> sideways */
  /* acceleration.z === ~ -1024 -> face up */

  var newLidState = getLidState(sticker.acceleration.z);

  console.log("+++ lidState: old: " + lidState + " new: " + newLidState);

  if (lidState === newLidState)
    return;

  console.log("+++ lidState: changed!");
  lidState = newLidState;
  sse.pushLidEvent(newLidState);
}

function discoverItem(uuid, rssi) {
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

  rssi_win.push(rssi);

  var new_state = win_to_state(rssi_win);

  debugMore({ new_state: new_state.state, rssi_win: rssi_win, rssi_ave: new_state.rssi_ave });

  if (old_state.state !== new_state.state) {
    debug(uuid + ": State changed to: " + new_state.state);
    sse.pushStickerEvent(uuid, new_state.state);
  }

  stickers[uuid] = { rssi_win: rssi_win };
  stickers[uuid].timer = setTimeout(function() {
     winTimeoutHandler(uuid);
  }, WIN_TIMEOUT);
}


EstimoteSticker.on('discover', function(estimoteSticker, rssi) {
  var uuid = estimoteSticker.uuid;

  if (uuid === lidUUID)
	discoverLid(estimoteSticker);
  else
	discoverItem(estimoteSticker.uuid, rssi);
});

EstimoteSticker.startScanning();
