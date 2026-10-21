#!/bin/sh
set -eu

API_BASE_URL="${SPP_API_URL:-${VITE_SPP_API_URL:-}}"
DEFAULT_CMEK_KEY_TEMPLATE="${SPP_DEFAULT_CMEK_KEY_TEMPLATE:-projects/{lob}-kms-{env}/locations/us-east1/keyRings/{lob}-{env}-use1/cryptoKeys/gcs-default}"
MICRODRIVE_CMEK_KEY="${SPP_MICRODRIVE_CMEK_KEY:-projects/microdrive-dev/locations/us-east1/keyRings/spp-nonprod-use1/cryptoKeys/gcs-default}"

cat <<EOF > /usr/share/nginx/html/config.js
window.__SPP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL}",
  DEFAULT_CMEK_KEY_TEMPLATE: "${DEFAULT_CMEK_KEY_TEMPLATE}",
  MICRODRIVE_CMEK_KEY: "${MICRODRIVE_CMEK_KEY}"
};
EOF
