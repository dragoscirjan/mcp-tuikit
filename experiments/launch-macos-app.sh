#!/usr/bin/env bash

APP_NAME=${1:-alacritty}

open -a "$APP_NAME"
sleep 1
APP_PID=$(pgrep -n "$APP_NAME")

JSON=$(swift $(dirname $0)/get-macos-app-wid.swift "$APP_PID")

APP_WID=$(echo "$JSON" | jq -r '.window_id')
APP_OWNER=$(echo "$JSON" | jq -r '.owner_name')
APP_TITLE=$(echo "$JSON" | jq -r '.title')
APP_LAYER=$(echo "$JSON" | jq -r '.layer')
APP_ALPHA=$(echo "$JSON" | jq -r '.alpha')
APP_BOUNDS=$(echo "$JSON" | jq -r '.bounds')

echo "APP_NAME=$APP_NAME"
echo "APP_PID=$APP_PID"
echo "APP_WID=$APP_WID"
echo "APP_OWNER=$APP_OWNER"
echo "APP_TITLE=$APP_TITLE"
echo "APP_LAYER=$APP_LAYER"
echo "APP_ALPHA=$APP_ALPHA"
echo "APP_BOUNDS=$APP_BOUNDS"

SCREENSHOT="/tmp/${APP_NAME}_${APP_WID}.png"
screencapture -l "$APP_WID" "$SCREENSHOT"
echo "Screenshot saved to $SCREENSHOT"
open "$SCREENSHOT"

kill -9 $APP_PID
