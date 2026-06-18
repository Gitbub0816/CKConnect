#!/usr/bin/env bash
# Push SDK environment variables to Vercel.
# Usage: VERCEL_TOKEN=xxx VERCEL_PROJECT_ID=xxx bash scripts/push-vercel-env.sh
# Find VERCEL_PROJECT_ID in your Vercel project Settings → General → Project ID.
# Find VERCEL_TEAM_ID in your Vercel team Settings → General → Team ID (leave blank for personal).
set -euo pipefail

TOKEN="${VERCEL_TOKEN:?Set VERCEL_TOKEN}"
PROJECT="${VERCEL_PROJECT_ID:?Set VERCEL_PROJECT_ID}"
TEAM="${VERCEL_TEAM_ID:-}"
BASE="https://api.vercel.com/v10/projects/${PROJECT}/env"
TEAM_PARAM="${TEAM:+?teamId=${TEAM}}"

upsert() {
  local key="$1" value="$2" type="${3:-encrypted}" targets="${4:-production preview development}"

  # Build targets JSON array
  local targets_json
  targets_json=$(printf '"%s",' $targets | sed 's/,$//')
  targets_json="[${targets_json}]"

  # Check if env var already exists
  local existing_id
  existing_id=$(curl -sf -H "Authorization: Bearer ${TOKEN}" \
    "${BASE}${TEAM_PARAM}" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
envs = data.get('envs', [])
match = next((e for e in envs if e['key'] == '${key}'), None)
print(match['id'] if match else '')
" 2>/dev/null || echo "")

  if [ -n "$existing_id" ]; then
    # Update existing
    curl -sf -X PATCH \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      "${BASE}/${existing_id}${TEAM_PARAM}" \
      -d "{\"value\":$(printf '%s' "$value" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))'),\"type\":\"${type}\",\"target\":${targets_json}}" \
      > /dev/null
    echo "  updated  ${key}"
  else
    # Create new
    curl -sf -X POST \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      "${BASE}${TEAM_PARAM}" \
      -d "{\"key\":\"${key}\",\"value\":$(printf '%s' "$value" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))'),\"type\":\"${type}\",\"target\":${targets_json}}" \
      > /dev/null
    echo "  created  ${key}"
  fi
}

echo "=== CK Collaboration SDK ==="
upsert NEXT_PUBLIC_CKCOLLAB_API_URL  "https://ckcollab-api.clearkey.solutions"   plain
upsert CKCOLLAB_API_KEY              "pk_vzn9l8CiAbCP6B9FvmQcfdCmyVJ2SvRD"       encrypted
upsert CKCOLLAB_WEBHOOK_SECRET       "whsec_10d85c9525f0d9e2a4b04a80f0f10e0efe4bcffccb5878d3" encrypted

echo ""
echo "=== KPI Dashboard SDK ==="
upsert NEXT_PUBLIC_KPI_API_URL       "https://kpi-api.clearkey.solutions"         plain
upsert KPI_API_KEY                   "dk_6HxhjZjvAbNgaIOcpckyCN13R6sSqHqvKQss3sb1MOlGANSV" encrypted

echo ""
echo "=== Calendar SDK ==="
upsert NEXT_PUBLIC_CALENDAR_API_URL  "https://calendar-api.clearkey.solutions"    plain
upsert CALENDAR_API_KEY              "ck_live_d9pjnaOGf3mwSegfzW3z6R1DlIqt28U1y8rVTzco" encrypted
upsert CALENDAR_JWT_CERTIFICATE      "3189O7ot0OlHoAvbEIkrM8JncU5NEkXLCp5EKZEbr0igJufN" encrypted
upsert CALENDAR_SHARED_SECRET        "Aid2024!!"                                   encrypted

echo ""
echo "=== Website Builder SDK ==="
upsert NEXT_PUBLIC_BUILDER_API_URL   "https://builder-api.clearkey.solutions"     plain
upsert BUILDER_API_KEY               "ck_live_grvbgdpkwpn08cuze6xjl08"            encrypted
upsert BUILDER_OAUTH_CLIENT_ID       "346d03e62cbeee22d93c807d0ee55b99"            encrypted
upsert BUILDER_OAUTH_CLIENT_SECRET   "cfoc_wskkAveEvrNEZiN1L5KiztVwJdglBzvZtYXEmwyA4905fa8c" encrypted
upsert BUILDER_OAUTH_REDIRECT_URI    "https://connect.clearkey.solutions/api/builder/oauth/callback" plain

echo ""
echo "=== CK Sites Hosting ==="
upsert NEXT_PUBLIC_SITES_ROOT_DOMAIN "cksites.dev"  plain
upsert NEXT_PUBLIC_SITES_APP_SUBDOMAIN "app"        plain

echo ""
echo "=== Cloudflare (cksites.dev zone) ==="
upsert CLOUDFLARE_SITES_ZONE_ID      "6b522e4f55b49bb2b394f7006c819a00"  encrypted
upsert CLOUDFLARE_ACCOUNT_ID         "f79ff34dae9f11ac6bf1d717cf63bd39"  encrypted

echo ""
echo "Done. Trigger a new deployment in Vercel to pick up the changes."
