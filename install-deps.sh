#!/usr/bin/env bash
set -euo pipefail

# install-deps.sh — install backend Python venv deps and frontend npm deps

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Installing backend Python dependencies..."
if [ ! -d backend ]; then
  echo "backend directory not found"
  exit 1
fi
cd backend

# create virtualenv
python3 -m venv .venv

# use venv's python to upgrade pip and install requirements
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

echo "Installing frontend npm dependencies..."
if [ ! -d ../frontend ]; then
  echo "frontend directory not found"
  exit 1
fi
cd ../frontend
npm install

echo "All dependencies installed."
