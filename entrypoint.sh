#!/bin/sh
set -e

if [ ! -f /app/.commands_deployed ] && [ -f /app/config.json ]; then
  node /app/deploy-commands.js && touch /app/.commands_deployed
fi

exec "$@"