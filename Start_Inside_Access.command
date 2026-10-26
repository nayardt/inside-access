#!/bin/bash
# Double-click in Finder after the one-time upgrade. No commands to type.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null; then
  echo 'Node is not available. Ask your setup helper to install Node 24 LTS.'
  read -r -p 'Press Return to close.'
  exit 1
fi
node scripts/start-browser.mjs
