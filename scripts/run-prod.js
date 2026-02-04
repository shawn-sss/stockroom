#!/usr/bin/env node

"use strict";

const { spawnSync, spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const PORT_FRONTEND = 5173;
const PORT_BACKEND = 8000;
const HOST = "127.0.0.1";
const VITE_API_BASE = `http://${HOST}:${PORT_BACKEND}/api`;

function die(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}


function uniq(arr) {
  return [...new Set(arr)];
}

function run(cmd, args, options = {}) {
  const pretty = [cmd, ...args].join(" ");
  console.log(`\n> ${pretty}`);

  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${pretty}`);
  }
}

function commandExists(cmd) {
  const probe = spawnSync(cmd, ["--version"], { stdio: "ignore", shell: false });
  return probe.status === 0;
}

function npmCmd() {

  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function venvPythonPath(backendDir) {

  const venvDir = path.join(backendDir, ".venv");
  return process.platform === "win32"
    ? path.join(venvDir, "Scripts", "python.exe")
    : path.join(venvDir, "bin", "python");
}

function killPid(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/F", "/PID", String(pid)], {
      stdio: "ignore",
      shell: false,
    });
  } else {
    spawnSync("kill", ["-9", String(pid)], { stdio: "ignore", shell: false });
  }
}

function parseWindowsNetstatPids(output, port) {


  const pids = [];
  const lines = output.split(/\r?\n/);
  const needle = `:${port}`;
  for (const line of lines) {
    if (!line.includes(needle)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid)) pids.push(pid);
  }
  return uniq(pids);
}

function killPortWindows(port) {
  const ns = spawnSync("netstat", ["-ano"], { encoding: "utf8", shell: false });
  if (ns.status !== 0 || !ns.stdout) return;
  const pids = parseWindowsNetstatPids(ns.stdout, port);
  for (const pid of pids) killPid(pid);
}

function killPortUnix(port) {

  if (commandExists("lsof")) {
    const out = spawnSync("lsof", ["-ti", `tcp:${port}`], {
      encoding: "utf8",
      shell: false,
    });
    const pids = (out.stdout || "").split(/\s+/).filter(Boolean);
    for (const pid of uniq(pids)) killPid(pid);
    return;
  }

  if (commandExists("fuser")) {
    spawnSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore", shell: false });
    return;
  }

  if (commandExists("ss")) {
    const out = spawnSync("ss", ["-ltnp"], { encoding: "utf8", shell: false });
    const lines = (out.stdout || "").split(/\r?\n/);
    const needle = `:${port}`;
    const pids = [];
    for (const line of lines) {
      if (!line.includes(needle)) continue;
      const matches = line.match(/pid=(\d+)/g);
      if (!matches) continue;
      for (const hit of matches) {
        const m = hit.match(/pid=(\d+)/);
        if (m && m[1]) pids.push(m[1]);
      }
    }
    for (const pid of uniq(pids)) killPid(pid);
  }
}

function killPort(port) {
  console.log(`\n> Killing anything on port ${port} (best effort)`);
  try {
    if (process.platform === "win32") killPortWindows(port);
    else killPortUnix(port);
  } catch {

  }
}

function runInTerminalOrLog(title, cwd, commandString, extraEnv = {}) {
  const root = process.cwd();

  if (process.platform === "win32") {
    const inner = `cd /d "${cwd}" && ${commandString}`;
    spawn("cmd.exe", ["/c", "start", title, "cmd.exe", "/k", inner], {
      stdio: "ignore",
      shell: false,
      detached: true,
      env: { ...process.env, ...extraEnv },
    }).unref();
    return;
  }


  const hasDisplay = !!process.env.DISPLAY || !!process.env.WAYLAND_DISPLAY;

  const bashCmd = `cd "${cwd}" && ${commandString}; echo; echo "[${title}] exited."; exec bash`;

  if (hasDisplay) {
    const candidates = [
      { cmd: "gnome-terminal", args: ["--title", title, "--", "bash", "-lc", bashCmd] },
      { cmd: "konsole", args: ["--new-tab", "-p", `tabtitle=${title}`, "-e", "bash", "-lc", bashCmd] },
      { cmd: "xfce4-terminal", args: ["--title", title, "--hold", "--command", `bash -lc '${bashCmd.replace(/'/g, `'\\''`)}'`] },
      { cmd: "mate-terminal", args: ["--title", title, "--", "bash", "-lc", bashCmd] },
      { cmd: "xterm", args: ["-T", title, "-e", "bash", "-lc", bashCmd] },
    ];

    for (const c of candidates) {
      if (commandExists(c.cmd)) {
        spawn(c.cmd, c.args, {
          stdio: "ignore",
          shell: false,
          detached: true,
          env: { ...process.env, ...extraEnv },
        }).unref();
        return;
      }
    }
  }

  const child = spawn(commandString, {
    cwd,
    env: { ...process.env, ...extraEnv },
    shell: true,
    stdio: "ignore",
    detached: true,
  });

  child.unref();
  console.log(`[${title}] started (PID ${child.pid})`);
}

function main() {
  const scriptDir = path.dirname(fs.realpathSync(__filename));
  const repoRoot = path.resolve(scriptDir, "..");
  process.chdir(repoRoot);

  const backendDir = path.join(repoRoot, "backend");
  const frontendDir = path.join(repoRoot, "frontend");

  if (!isDir(backendDir)) die("backend directory not found");
  if (!isDir(frontendDir)) die("frontend directory not found");

  const py = venvPythonPath(backendDir);
  if (!isFile(py)) {
    die(
      `Backend venv not found at: ${path.join(backendDir, ".venv")}\n` +
        `Run scripts/bootstrap.js first to create it.`
    );
  }

  if (!commandExists(npmCmd())) {
    die("npm not found. Install Node.js then try again.");
  }

  killPort(PORT_FRONTEND);
  killPort(PORT_BACKEND);

  console.log("\nBuilding frontend for production preview...");
  run(npmCmd(), ["run", "build"], {
    cwd: frontendDir,
    env: { ...process.env, VITE_API_BASE },
  });

  const backendCmd = `"${py}" -m uvicorn main:app --host ${HOST} --port ${PORT_BACKEND}`;
  const frontendCmd = `${npmCmd()} run preview -- --host ${HOST} --port ${PORT_FRONTEND}`;

  runInTerminalOrLog("Backend", backendDir, backendCmd);
  runInTerminalOrLog("Frontend", frontendDir, frontendCmd);

  console.log(
    `\n✅ Production preview started:\n` +
      `- Backend:  http://${HOST}:${PORT_BACKEND}\n` +
      `- Frontend: http://${HOST}:${PORT_FRONTEND}\n`
  );
}

try {
  main();
} catch (err) {
  if (err && err.code === "ENOENT") {
    die(`Command not found: ${err.path || "unknown"} (is it installed and on PATH?)`);
  }
  die(err?.message || String(err));
}
