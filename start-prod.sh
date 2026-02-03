#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VITE_API_BASE="http://127.0.0.1:8000/api"

kill_port() {
  local port="$1"

  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" >/dev/null 2>&1 || true
    return 0
  fi

  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti tcp:"${port}" 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      kill -9 ${pids} >/dev/null 2>&1 || true
    fi
    return 0
  fi

  if command -v ss >/dev/null 2>&1; then
    local pids
    pids="$(ss -ltnp 2>/dev/null | awk -v p=":${port}" '$4 ~ p {print $0}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)"
    if [[ -n "${pids}" ]]; then
      kill -9 ${pids} >/dev/null 2>&1 || true
    fi
  fi
}

make_runner_script() {
  local title="$1"; shift
  local cmd="$*"

  mkdir -p "$ROOT/.run"
  local slug
  slug="$(echo "$title" | tr ' ' '_' | tr -cd '[:alnum:]_-' )"
  local script="$ROOT/.run/${slug}.sh"

  cat > "$script" <<SCRIPT
#!/usr/bin/env bash
set -euo pipefail

${cmd}

if [[ "${KEEP_OPEN:-0}" == "1" ]]; then
  echo
  echo "[$title] exited. You can close this window or keep using this shell."
  exec bash
fi
SCRIPT

  chmod +x "$script"
  echo "$script"
}

run_in_terminal() {
  local title="$1"; shift
  local cmd="$*"
  local runner
  runner="$(make_runner_script "$title" "$cmd")"

  local slug
  slug="$(echo "$title" | tr ' ' '_' | tr -cd '[:alnum:]_-' )"

  if [[ -n "${DISPLAY:-}" ]]; then
    if command -v gnome-terminal >/dev/null 2>&1; then
      KEEP_OPEN=1 gnome-terminal --title="$title" -- bash "$runner" &
      return 0
    elif command -v xfce4-terminal >/dev/null 2>&1; then
      KEEP_OPEN=1 xfce4-terminal --title="$title" --hold --command="bash \"$runner\"" &
      return 0
    elif command -v konsole >/dev/null 2>&1; then
      KEEP_OPEN=1 konsole --new-tab -p tabtitle="$title" -e bash "$runner" &
      return 0
    elif command -v mate-terminal >/dev/null 2>&1; then
      KEEP_OPEN=1 mate-terminal --title="$title" -- bash "$runner" &
      return 0
    elif command -v xterm >/dev/null 2>&1; then
      KEEP_OPEN=1 xterm -T "$title" -e bash "$runner" &
      return 0
    fi
  fi

  mkdir -p "$ROOT/.logs"
  local logfile="$ROOT/.logs/${slug}.log"
  nohup bash "$runner" >"$logfile" 2>&1 &
  echo "[$title] started (PID $!) -> $logfile"
}

kill_port 5173
kill_port 8000

PY="$ROOT/backend/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  echo "Backend venv not found at: $ROOT/backend/.venv"
  echo "Create it first (from repo root):"
  echo "  python3 -m venv backend/.venv"
  echo "  backend/.venv/bin/python -m pip install -r backend/requirements.txt"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js then try again."
  exit 1
fi

(
  cd "$ROOT/frontend"
  VITE_API_BASE="$VITE_API_BASE" npm run build
)

run_in_terminal "Backend" "cd \"$ROOT/backend\" && \"$PY\" -m uvicorn main:app --host 127.0.0.1 --port 8000"
run_in_terminal "Frontend" "cd \"$ROOT/frontend\" && npm run preview -- --host 127.0.0.1 --port 5173"

echo "Prod started: backend on http://127.0.0.1:8000 , frontend preview on http://127.0.0.1:5173"
