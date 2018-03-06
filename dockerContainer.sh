#!/bin/bash

docker run --name electron-builder --rm -ti \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_') \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  --env SENTRY_API_KEY="${SENTRY_API_KEY:?'$SENTRY_API_KEY is EMPTY. Please set $SENTRY_API_KEY env variable before proceeding'}" \
  --env MIXPANEL_API_TOKEN="${MIXPANEL_API_TOKEN:?'$MIXPANEL_API_TOKEN is EMPTY. Please set $MIXPANEL_API_TOKEN env variable before proceeding'}" \
  --env SENTRY_LINK="${SENTRY_LINK}:?'$SENTRY_LINK is EMPTY. Please set $SENTRY_LINK env variable before proceeding'" \
  -v ${PWD}:/project \
  -v ${PWD##*/}-node-modules:/project/node_modules \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  chronos/builder:wine
