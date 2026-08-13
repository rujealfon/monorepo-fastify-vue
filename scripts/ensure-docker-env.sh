#!/usr/bin/env bash
set -euo pipefail

repo_root="${MONOREPO_DOCKER_ENV_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
openssl_bin="${MONOREPO_OPENSSL_BIN:-openssl}"
docker_env_file="$repo_root/.env"
api_env_file="$repo_root/apps/api/.env"
api_test_env_file="$repo_root/apps/api/.env.test"
api_env_example="$repo_root/apps/api/.env.example"
api_test_env_example="$repo_root/apps/api/.env.test.example"

read_env_value() {
  local file="$1"
  local key="$2"

  awk -v key="$key" '
    index($0, key "=") == 1 {
      print substr($0, length(key) + 2)
      exit
    }
  ' "$file"
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local temp_file

  temp_file="$(mktemp "${file}.tmp.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { replaced = 0 }
    index($0, key "=") == 1 {
      if (!replaced) {
        print key "=" value
        replaced = 1
      }
      next
    }
    { print }
    END {
      if (!replaced)
        print key "=" value
    }
  ' "$file" > "$temp_file"
  chmod 600 "$temp_file"
  mv "$temp_file" "$file"
}

ensure_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"

  if [[ -z "$(read_env_value "$file" "$key")" ]]; then
    set_env_value "$file" "$key" "$value"
  fi
}

initialize_api_env_file() {
  local file="$1"
  local example="$2"

  if [[ ! -f "$file" ]]; then
    cp "$example" "$file"
    chmod 600 "$file"
    printf 'Created %s from its example file.\n' "${file#"$repo_root/"}"
  fi
}

ensure_private_jwt_secret() {
  local file="$1"
  local example="$2"
  local current_secret
  local example_secret

  current_secret="$(read_env_value "$file" JWT_SECRET)"
  example_secret="$(read_env_value "$example" JWT_SECRET)"

  if [[ -z "$current_secret" || "$current_secret" == "$example_secret" ]]; then
    set_env_value "$file" JWT_SECRET "$("$openssl_bin" rand -base64 32)"
    printf 'Generated JWT_SECRET in %s.\n' "${file#"$repo_root/"}"
  fi
}

is_docker_host_database_url() {
  local value="$1"
  local value_without_query

  value_without_query="${value%%\?*}"
  [[ "$value_without_query" =~ ^postgres(ql)?://.*@(localhost|127\.0\.0\.1):5433/ ]]
}

sync_database_url() {
  local file="$1"
  local example="$2"
  local database="$3"
  local user="$4"
  local password="$5"
  local current_url
  local example_url
  local database_url

  current_url="$(read_env_value "$file" DATABASE_URL)"
  example_url="$(read_env_value "$example" DATABASE_URL)"

  if [[ -z "$current_url" || "$current_url" == "$example_url" ]] \
    || is_docker_host_database_url "$current_url"; then
    database_url="postgresql://${user}:${password}@localhost:5433/${database}"
    if [[ "$current_url" != "$database_url" ]]; then
      set_env_value "$file" DATABASE_URL "$database_url"
      printf 'Synchronized Docker DATABASE_URL in %s.\n' "${file#"$repo_root/"}"
    fi
  else
    printf 'Preserved custom DATABASE_URL in %s.\n' "${file#"$repo_root/"}"
  fi
}

main() {
  if [[ ! -f "$docker_env_file" ]]; then
    umask 077
    touch "$docker_env_file"
  fi

  ensure_env_value "$docker_env_file" POSTGRES_USER app
  if [[ -z "$(read_env_value "$docker_env_file" POSTGRES_PASSWORD)" ]]; then
    set_env_value "$docker_env_file" POSTGRES_PASSWORD "$("$openssl_bin" rand -hex 24)"
  fi
  if [[ -z "$(read_env_value "$docker_env_file" POSTGRES_DB)" ]]; then
    postgres_db_value="${POSTGRES_DB:-}"
    if [[ -n "$postgres_db_value" && ! "$postgres_db_value" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      printf 'Invalid POSTGRES_DB "%s": use letters, digits, and underscores, starting with a letter or underscore.\n' "$postgres_db_value" >&2
      exit 1
    fi
    if [[ -z "$postgres_db_value" && -t 0 ]]; then
      while true; do
        read -r -p "Postgres database name [monorepo_fastify_vue]: " postgres_db_value || { postgres_db_value=monorepo_fastify_vue; break; }
        [[ -z "$postgres_db_value" ]] && { postgres_db_value=monorepo_fastify_vue; break; }
        [[ "$postgres_db_value" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] && break
        printf 'Invalid database name: use letters, digits, and underscores, starting with a letter or underscore.\n'
      done
    fi
    set_env_value "$docker_env_file" POSTGRES_DB "${postgres_db_value:-monorepo_fastify_vue}"
  fi
  chmod 600 "$docker_env_file"

  postgres_user="$(read_env_value "$docker_env_file" POSTGRES_USER)"
  postgres_password="$(read_env_value "$docker_env_file" POSTGRES_PASSWORD)"
  postgres_database="$(read_env_value "$docker_env_file" POSTGRES_DB)"

  initialize_api_env_file "$api_env_file" "$api_env_example"
  initialize_api_env_file "$api_test_env_file" "$api_test_env_example"

  ensure_private_jwt_secret "$api_env_file" "$api_env_example"
  ensure_private_jwt_secret "$api_test_env_file" "$api_test_env_example"
  sync_database_url "$api_env_file" "$api_env_example" "$postgres_database" "$postgres_user" "$postgres_password"
  sync_database_url "$api_test_env_file" "$api_test_env_example" "${postgres_database}_test" "$postgres_user" "$postgres_password"
}

main "$@"
