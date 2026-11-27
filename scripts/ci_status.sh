#!/usr/bin/env bash
# Tells a person when a bot breaks, and stands down when it recovers.
#   scripts/ci_status.sh fail "Workflow name"   -> opens (or comments on) ONE issue "Automation failed: Workflow name" with a link to the run
#   scripts/ci_status.sh ok   "Workflow name"   -> closes that issue if it is open
# Needs GH_TOKEN (the workflow's own token, issues: write). If the issue call itself fails, it never fails the job (the job is already red).
set -uo pipefail
mode="${1:?fail|ok}"; name="${2:?workflow name}"
title="Automation failed: ${name}"
run_url="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
n="$(gh issue list --state open --search "\"${title}\" in:title" --json number,title --jq "[.[] | select(.title==\"${title}\")][0].number // empty" 2>/dev/null || true)"
if [ "$mode" = "fail" ]; then
  body="The scheduled job **${name}** failed. Nothing wrong was published (every publish step is behind the checks).

Run: ${run_url}

Safe next steps: read the red step in that run; to stop all bots while you fix it, set \`\"paused\": true\` in \`data/automation_pause.json\`. See RUNBOOK.md."
  if [ -n "$n" ]; then gh issue comment "$n" --body "Failed again: ${run_url}" >/dev/null 2>&1 || true
  else gh issue create --title "$title" --body "$body" >/dev/null 2>&1 || true; fi
elif [ -n "$n" ]; then
  gh issue close "$n" --comment "Recovered: ${run_url}" >/dev/null 2>&1 || true
fi
exit 0
