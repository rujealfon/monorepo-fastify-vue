#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v test_database="${POSTGRES_DB}_test" -v owner="$POSTGRES_USER" <<-'EOSQL'
    SELECT format('CREATE DATABASE %I OWNER %I', :'test_database', :'owner')
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'test_database')\gexec
EOSQL
