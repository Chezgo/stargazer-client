#!/bin/sh
set -eu

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  KEYCLOAK_URL: "${KEYCLOAK_URL:-}",
  KEYCLOAK_REALM: "${KEYCLOAK_REALM:-}",
  KEYCLOAK_CLIENT_ID: "${KEYCLOAK_CLIENT_ID:-}",
  AUTH_API_URL: "${AUTH_API_URL:-}",
  API_BASE_URL: "${API_BASE_URL:-}"
};
EOF

exec nginx -g "daemon off;"
