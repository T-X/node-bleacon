var debug = require('debug')('box');
var debugMore = require('debug')('box-verbose');

var EstimoteSticker = require('./estimote-sticker');
var sse = require('./exil-sse.js');

var THRESHOLD_TO_IN = -43;
var THRESHOLD_TO_OUT = -48;
var RSSI_WIN_SIZE = 6;
var WIN_TIMEOUT = 8000;

var CORRECT = {
  "d62d3ca7158a442d": [-43, -46], // Taschenmesser
  "7567870c5a2e07f1": [-54, -56], // Smartphone
  "509d21d91f7094f5": [-41, -48], // Erinnerungen
  "21cd478197c9638b": [-39, -45], // Taschenlampe
  "d927ca5fe7f3eb3f": [-42, -45], // Kuscheltier
//  "79286228f1897216": [-46, -50], // Medizin - alt
//  "2e7a03b23a6f759b": ... // Medizin - neu
};

var lidID = "374cd69a87f92364";


var stickers = {};
var oldStates = {};
var lidState = "OPEN";

// true: in, false: out
function win_to_state(rssi_win, old_state, id) {
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

  var local_threshold = THRESHOLD_TO_IN;

  if (CORRECT[id] !== undefined)
    local_threshold = CORRECT[id][0];

  if (old_state.state === "IN") {
    local_threshold = THRESHOLD_TO_OUT;
    if (CORRECT[id] !== undefined) {
      local_threshold = CORRECT[id][1];
    }
  }

  if (rssi_ave < local_threshold)
    return { rssi_ave: Math.floor(rssi_ave), state: "OUT" };
  else
    return { rssi_ave: Math.floor(rssi_ave), state: "IN" };
}


function winTimeoutHandler(id) {
  debug(id + ": State changed to: OUT (timeout)");
  
  sse.pushStickerEvent(id, "OUT");
  stickers[id] = undefined;
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
  debugMore("~~~ Lid:");
  debugMore(sticker.acceleration);
  /* acceleration.z === ~ +1024 -> upside down*/
  /* acceleration.z ===a ~     0 -> sideways */
  /* acceleration.z === ~ -1024 -> face up */

  var newLidState = getLidState(sticker.acceleration.z);

  if (lidState === newLidState)
    return;

  debug("lidState changed: Now " + newLidState);
  lidState = newLidState;
  sse.pushLidEvent(newLidState);
}

function discoverItem(id, rssi) {
  var rssi_win = [];
  var old_state;

  if (oldStates[id] !== undefined)
    old_state = oldStates[id]; // win_to_state(stickers[id].rssi_win);
  else
    old_state = { rssi_ave: undefined, state: undefined };

  if (stickers[id] !== undefined) {
    clearTimeout(stickers[id].timer);
    rssi_win = stickers[id].rssi_win;
  }

  debugMore(id + ":");
  debugMore({ old_state: old_state.state, rssi_win: rssi_win, rssi_ave: old_state.rssi_ave });

  if (rssi_win.length >= RSSI_WIN_SIZE)
    rssi_win.shift();

  rssi_win.push(rssi);

  var new_state = win_to_state(rssi_win, old_state, id);

  oldStates[id] = new_state;


  debugMore({ new_state: new_state.state, rssi_win: rssi_win, rssi_ave: new_state.rssi_ave });

  if (old_state.state !== new_state.state) {
    debug(id + ": State changed to: " + new_state.state);
    sse.pushStickerEvent(id, new_state.state);
  }

  stickers[id] = { rssi_win: rssi_win };
  stickers[id].timer = setTimeout(function() {
     winTimeoutHandler(id);
  }, WIN_TIMEOUT);
}


EstimoteSticker.on('discover', function(estimoteSticker) {
  var id = estimoteSticker.id;

  if (id === lidID)
	discoverLid(estimoteSticker);
  else
	discoverItem(estimoteSticker.id, estimoteSticker.rssi);
});

EstimoteSticker.startScanning();
