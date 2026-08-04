#!/usr/bin/env bash
# Warns (non-blocking) when .certs/ is missing before a docker rebuild -- see
# "Local HTTPS certs" in DOCKER.md. Without it, the web container mints its
# own untrusted CA instead of reusing one the host browser already trusts.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cert_dir="$repo_root/.certs"

if [[ ! -f "$cert_dir/dev.pem" || ! -f "$cert_dir/cert.pem" ]]; then
  cat <<'EOF' >&2
-----------------------------------------------------------------------
No .certs/ found. Docker will still start, but web/site/api will each
serve HTTPS with a cert minted inside their own container -- your
browser will show it as "Not Secure" (it's never been told to trust it).

To get a cert your browser already trusts, run this once first:
  pnpm generate:certificates

See DOCKER.md > "Local HTTPS certs" for details.
-----------------------------------------------------------------------
EOF
fi
