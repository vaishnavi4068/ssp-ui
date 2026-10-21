#!/bin/sh
set -eu

API_BASE_URL="${SPP_API_URL:-${VITE_SPP_API_URL:-http://ssp-cp.spp-platform.svc.cluster.local:8000}}"
DEFAULT_CMEK_KEY="${SPP_DEFAULT_CMEK_KEY:-projects/microdrive-dev/locations/us-east1/keyRings/spp-keyring/cryptoKeys/spp-gcs-cmek}"

cat <<EOF > /usr/share/nginx/html/config.js
window.__SPP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL}",
  DEFAULT_CMEK_KEY: "${DEFAULT_CMEK_KEY}"
};
EOF
