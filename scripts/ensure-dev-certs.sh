#!/usr/bin/env bash
# Guarantees .certs/{dev.pem,cert.pem} exist before docker compose creates any
# container -- see "Local HTTPS certs" in DOCKER.md.
#
# This blocks rather than warns on purpose: docker-compose.yml bind-mounts those
# two paths file-by-file (so the CA root never enters a container), and Docker
# silently creates a *directory* in their place when the source file is missing,
# which then breaks cert generation until .certs/ is deleted by hand.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cert_dir="$repo_root/.certs"

for file in dev.pem cert.pem; do
  if [[ -d "$cert_dir/$file" ]]; then
    cat >&2 <<EOF
-----------------------------------------------------------------------
$cert_dir/$file is a directory.

Docker creates one when it bind-mounts a cert file that does not exist
yet. Stop the containers and remove it before continuing:

  docker compose down
  rm -rf "$cert_dir"
  pnpm generate:certificates
-----------------------------------------------------------------------
EOF
    exit 1
  fi
done

if [[ ! -f "$cert_dir/dev.pem" || ! -f "$cert_dir/cert.pem" ]]; then
  echo 'No local HTTPS cert found -- generating one (pnpm generate:certificates)...' >&2
  pnpm generate:certificates
fi

# Older checkouts pointed vite-plugin-mkcert's savePath at .certs/, leaving the
# CA root in the dir that used to be bind-mounted wholesale. It no longer
# reaches any container, but it does not belong in the repo either.
if [[ -f "$cert_dir/rootCA-key.pem" ]]; then
  cat >&2 <<'EOF'
-----------------------------------------------------------------------
Found a CA private key in .certs/ (rootCA-key.pem).

It is no longer mounted into any container, but it should not live in
the repo either. Run this to relocate it to ~/.vite-plugin-mkcert:

  pnpm generate:certificates

If ~/.vite-plugin-mkcert already holds a different CA, that command
leaves both in place and explains what to remove by hand -- it will not
delete a CA key that may still be trusted by your keychain.
-----------------------------------------------------------------------
EOF
fi
