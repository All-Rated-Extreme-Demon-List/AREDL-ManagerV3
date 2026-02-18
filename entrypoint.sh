#!/bin/sh
set -eu

load_secret_env() {
    env_name="$1"
    secret_name="$2"
    secret_file="/run/secrets/$secret_name"

    current_value="$(eval "printf %s \"\${$env_name-}\"" )"

    if [ -n "$current_value" ]; then
        return 0
    fi

    if [ -f "$secret_file" ]; then
        secret_value="$(cat "$secret_file")"
        export "$env_name=$secret_value"
    fi
}

load_secret_env TOKEN TOKEN
load_secret_env API_TOKEN API_TOKEN
load_secret_env DB_FILE_NAME DB_FILE_NAME

exec "$@"
