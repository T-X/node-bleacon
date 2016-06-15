#!/bin/sh

cd /home/nbsp/dev/estimote/node-bleacon/estimote-sticker

while true; do
	env DEBUG=box,box-verbose NOBLE_REPORT_ALL_HCI_EVENTS=1 node ./exil-sticker.js
	sleep 5
done
