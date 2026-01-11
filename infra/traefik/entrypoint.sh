#!/bin/sh
set -e

# Process templates with sed (envsubst not available in Traefik image)
sed "s|\${DOMAIN_API}|${DOMAIN_API}|g; s|\${LE_EMAIL}|${LE_EMAIL}|g" \
  < /templates/traefik.yml.template > /config/traefik.yml

sed "s|\${DOMAIN_API}|${DOMAIN_API}|g; s|\${LE_EMAIL}|${LE_EMAIL}|g" \
  < /templates/dynamic.yml.template > /config/dynamic.yml

# Execute Traefik entrypoint with processed config files
exec /entrypoint.sh --configfile=/config/traefik.yml "$@"
