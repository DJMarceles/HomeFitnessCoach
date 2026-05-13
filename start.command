#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "node_modules ontbreekt."
  echo "Run eerst: npm install"
  echo ""
  read -k 1 "reply?Druk op een toets om te sluiten..."
  exit 1
fi

echo "VormCoach wordt gestart..."
echo "URL: http://localhost:5173/"
echo ""

(sleep 2 && open "http://localhost:5173/") &
npm run dev
