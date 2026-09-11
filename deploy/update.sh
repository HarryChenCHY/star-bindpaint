#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
exec 9>/run/startrace-deploy.lock
flock -n 9 || exit 0
base=/srv/startrace
repo=$base/repository.git
mkdir -p "$base/releases" "$base/backups"
if [[ ! -d "$repo" ]]; then
  git clone --depth=1 --branch=main --bare https://github.com/HarryChenCHY/star-bindpaint.git "$repo"
fi
git --git-dir="$repo" fetch --depth=1 origin main
sha=$(git --git-dir="$repo" rev-parse FETCH_HEAD)
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
if [[ -f "$base/deployed-commit" ]] && [[ "$(<"$base/deployed-commit")" == "$sha" ]]; then exit 0; fi
if [[ -f "$base/failed-commit" ]] && [[ "$(<"$base/failed-commit")" == "$sha" ]]; then
  echo "Commit $sha previously failed; push a fix or remove failed-commit to retry."
  exit 0
fi
release=$(mktemp -d "$base/releases/$sha.XXXXXX")
git --git-dir="$repo" archive "$sha" | tar -x -C "$release"
image=localhost/startrace:$sha
if ! podman build --format docker --memory=1400m --memory-swap=3g --pull-never -t "$image" "$release"; then
  printf '%s\n' "$sha" > "$base/failed-commit"
  exit 1
fi
# Check startup and database initialization using an isolated, disposable data set.
checkdir=$(mktemp -d "$base/releases/health.XXXXXX")
checkname=startrace-check-${sha:0:12}
podman run -d --name "$checkname" --pull=never --env NODE_ENV=production --env STUDY_DATA_DIR=/app/data/studies --publish 127.0.0.1:3002:3000 --volume "$checkdir:/app/data/studies:Z" "$image"
healthy() {
  local port=$1
  for i in {1..40}; do
    if curl --fail --silent --max-time 3 "http://127.0.0.1:$port/api/studies" >/dev/null; then return 0; fi
    sleep 1
  done
  return 1
}
if ! healthy 3002; then
  podman stop "$checkname" || true
  printf '%s\n' "$sha" > "$base/failed-commit"
  exit 1
fi
podman stop "$checkname"
podman rm "$checkname"
previous=$(podman image inspect localhost/startrace:current --format '{{.Id}}' 2>/dev/null || true)
restart_previous() {
  if [[ -n "$previous" ]]; then
    podman tag "$previous" localhost/startrace:current
    systemctl restart startrace.service
  fi
}
systemctl stop startrace.service || true
trap 'restart_previous' ERR
# Stop the only writer before copying SQLite, its journals and all private files.
if [[ -f "$base/studies/study.sqlite" ]]; then
  tar -czf "$base/backups/$(date -u +%Y%m%dT%H%M%SZ)-${sha:0:12}.tgz" -C "$base" studies
fi
podman tag "$image" localhost/startrace:current
systemctl start startrace.service
if ! healthy 3000; then
  systemctl stop startrace.service || true
  restart_previous
  printf '%s\n' "$sha" > "$base/failed-commit"
  exit 1
fi
trap - ERR
printf '%s\n' "$sha" > "$base/deployed-commit"
printf '%s\n' "$previous" > "$base/previous-image"
echo "Deployed $sha; frontend and research API healthy."
