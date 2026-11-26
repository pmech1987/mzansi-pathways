#!/usr/bin/env bash
# The ONLY way the bots publish. Usage: scripts/push_data.sh "commit message" path [path ...]
#
# Safety rails, in order. Any failure stops here and publishes nothing:
#   1. Paused?          data/automation_pause.json with "paused": true  -> exit 0, nothing pushed (the kill switch).
#   2. Data valid?      scripts/validate_data.py --against HEAD  (bad JSON, bad links, injected script, sudden shrink).
#   3. Only the paths you named are staged. Too many files, or any huge file -> refuse.
#   4. Secret scan of the staged change (API keys, tokens, private keys) -> refuse, unstage, never print the secret.
# Then commit and push. If the remote moved on, rebase on top and retry (5 times, waiting longer each time).
# A rebase that conflicts is aborted and the run fails, so a person looks at it. It never forces a push and never rewrites history.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/.." && pwd)"
cd "$root"

msg="${1:?commit message required}"; shift
[ "$#" -ge 1 ] || { echo "no paths given" >&2; exit 2; }

if [[ -e data/automation_pause.json ]] && grep -Eq '"paused"[[:space:]]*:[[:space:]]*true' data/automation_pause.json; then
  echo "PAUSED: data/automation_pause.json says paused. Nothing was pushed."
  exit 0
fi

python3 "$here/validate_data.py" --against HEAD || { echo "data validation failed: nothing was pushed" >&2; exit 1; }

git config user.name  "mzansi-data-bot"
git config user.email "mzansi-data-bot@users.noreply.github.com"
git add -A -- "$@"
if git diff --cached --quiet; then
  echo "nothing to commit"
  exit 0
fi

max_files="${MZ_MAX_FILES:-300}"
n_files="$(git diff --cached --name-only | wc -l | tr -d ' ')"
if [ "$n_files" -gt "$max_files" ]; then
  git reset -q
  echo "refusing: $n_files files changed (limit $max_files)" >&2
  exit 1
fi
while IFS= read -r changed; do
  if [[ -e "$changed" ]] && [ "$(wc -c < "$changed")" -gt 20000000 ]; then
    git reset -q
    echo "refusing: $changed is larger than 20 MB" >&2
    exit 1
  fi
done < <(git diff --cached --name-only)

secret_re='(sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16})'
if git diff --cached -U0 | grep '^+' | grep -Eq "$secret_re"; then
  git reset -q
  echo "refusing: the change looks like it contains a secret (API key, token or private key). Nothing was committed." >&2
  exit 1
fi

git commit -q -m "$msg"

branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$branch" != "HEAD" ] || { echo "detached HEAD: refusing to push" >&2; exit 1; }
for attempt in 1 2 3 4 5; do
  if git push origin "HEAD:${branch}"; then
    echo "pushed (attempt ${attempt})"
    exit 0
  fi
  echo "push rejected, rebasing onto origin/${branch} (attempt ${attempt})" >&2
  if ! git pull --rebase origin "${branch}"; then
    git rebase --abort 2>/dev/null || true
    echo "rebase conflict: stopped, nothing forced. A person needs to look." >&2
    exit 1
  fi
  sleep $((attempt * 3))
done
echo "could not push after 5 attempts; nothing was forced" >&2
exit 1
