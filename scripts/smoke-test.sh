#!/bin/sh
set -eu

cleanup() {
  docker compose down --remove-orphans
}

trap cleanup EXIT

echo "==> Building StarUp"
docker compose build

echo "==> Starting StarUp"
docker compose up -d

echo "==> Waiting for API"

attempt=1

while [ "$attempt" -le 30 ]; do
  if curl --fail --silent \
    http://localhost:3000/health \
    > /tmp/starup-health.json
  then
    echo
    echo "StarUp health endpoint:"
    cat /tmp/starup-health.json
    echo
    echo "==> Smoke test passed"
    exit 0
  fi

  echo "Waiting... ($attempt/30)"
  attempt=$((attempt + 1))
  sleep 2
done

echo "==> StarUp did not become healthy"
docker compose ps
docker compose logs starup
exit 1
