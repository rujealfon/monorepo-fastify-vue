#!/usr/bin/env bash
set -euo pipefail

docker_env_file='.env'

if [[ ! -f "$docker_env_file" ]]; then
  umask 077
  touch "$docker_env_file"
fi

ensure_value() {
  local key="$1"
  local value="$2"

  if ! grep -q "^${key}=" "$docker_env_file"; then
    printf '%s=%s\n' "$key" "$value" >> "$docker_env_file"
  fi
}

ensure_value POSTGRES_USER app
ensure_value POSTGRES_PASSWORD "$(openssl rand -hex 24)"
ensure_value POSTGRES_DB monorepo_fastify_vue

chmod 600 "$docker_env_file"
