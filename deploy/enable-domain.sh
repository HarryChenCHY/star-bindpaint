#!/usr/bin/env bash
# Run on the CVM after both DNS records point to its public IPv4 address.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'Run as root on the CVM.' >&2; exit 1; }
config_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
test -f "$config_dir/nginx-https.conf.example"
command -v certbot >/dev/null
command -v nginx >/dev/null
command -v dig >/dev/null
exec 9>/run/startrace-domain.lock
flock -n 9 || { echo 'Domain activation is already running.' >&2; exit 1; }

python3 - <<'PY'
import socket
for domain in ('startracepaint.com', 'www.startracepaint.com'):
    try:
        addresses = {entry[4][0] for entry in socket.getaddrinfo(domain, 80, socket.AF_INET)}
    except socket.gaierror:
        raise SystemExit('DNS is not ready: ' + domain)
    if addresses != {'1.13.169.247'}:
        raise SystemExit('Unexpected IPv4 DNS for ' + domain + ': ' + ', '.join(sorted(addresses)))
    print('DNS OK: ' + domain)
PY
for domain in startracepaint.com www.startracepaint.com; do
    if [[ -n "$(dig +short +time=3 +tries=1 "$domain" AAAA)" ]]; then
        echo "Review IPv6 DNS before activating $domain; this deployment uses IPv4." >&2
        exit 1
    fi
    probe=$(curl --noproxy '*' --fail --silent --show-error --connect-timeout 5 --max-time 15 \
        "http://$domain/.well-known/acme-challenge/startrace-connectivity.txt")
    [[ "$probe" == 'startrace-domain-check-20260922' ]] || { echo "HTTP validation failed: $domain" >&2; exit 1; }
done

certbot certonly --webroot --webroot-path /var/lib/letsencrypt \
    --non-interactive --agree-tos --register-unsafely-without-email \
    --keep-until-expiring --cert-name startracepaint.com \
    -d startracepaint.com -d www.startracepaint.com

backup=$(mktemp /etc/nginx/conf.d/startrace.before-https.XXXXXX)
cp -p /etc/nginx/conf.d/startrace.conf "$backup"
restore_config() {
    cp -p "$backup" /etc/nginx/conf.d/startrace.conf
    nginx -t && systemctl reload nginx
}
trap restore_config ERR
install -m 644 "$config_dir/nginx-https.conf.example" /etc/nginx/conf.d/startrace.conf
nginx -t
systemctl reload nginx
curl --noproxy '*' --fail --silent --show-error --connect-timeout 5 --max-time 15 \
    --resolve startracepaint.com:443:127.0.0.1 https://startracepaint.com/api/studies >/dev/null
trap - ERR

install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
printf '%s\n' '#!/bin/sh' 'set -eu' '/usr/sbin/nginx -t' '/usr/bin/systemctl reload nginx' \
    > /etc/letsencrypt/renewal-hooks/deploy/startrace-nginx
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/startrace-nginx
systemctl enable --now certbot-renew.timer
echo 'HTTPS is active: https://startracepaint.com (www redirects to the canonical domain).'
echo 'Verify public port 443, renewal dry-run, the ICP footer, and study cookies before handoff.'
