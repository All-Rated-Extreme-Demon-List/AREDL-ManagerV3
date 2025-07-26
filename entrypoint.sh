#!/bin/sh
set -e

if [ ! -f /app/data/.commands_deployed ] && [ -f /app/config.json ]; then
  node /app/deploy-commands.js && touch /app/data/.commands_deployed
fi

exec "$@"