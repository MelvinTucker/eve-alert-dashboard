#!/usr/bin/env bash
set -euo pipefail
cd /home/clawdbot/clawd/projects/eve-alert-dashboard

export SUPABASE_URL="https://lkureladedcghxknchse.supabase.co"
# Use the current service role key from the Supabase CLI output.
export SUPABASE_SERVICE_ROLE_KEY="$(supabase projects api-keys --project-ref lkureladedcghxknchse | awk '/service_role/{print $3; exit}')"

npm run ingest
