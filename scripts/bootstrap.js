#!/usr/bin/env node

"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

function die(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function run(cmd, args, options = {}) {
  const pretty = [cmd, ...args].join(" ");
  console.log(`\n> ${pretty}`);

  const isCmdShim =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd);

  const result = isCmdShim
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", cmd, ...args], {
        stdio: "inherit",
        shell: false,
        ...options,
      })
    : spawnSync(cmd, args, {
        stdio: "inherit",
        shell: false,
        ...options,
      });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${pretty}`);
  }
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

function pickPython() {
  const candidates =
    process.platform === "win32" ? ["python"] : ["python3", "python"];

  for (const cmd of candidates) {
    const probe = spawnSync(cmd, ["--version"], {
      stdio: "ignore",
      shell: false,
    });
    if (probe.status === 0) return cmd;
  }

  throw new Error(
    "Python not found on PATH. Install Python 3 and ensure the python executable is available.",
  );
}

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function venvPythonPath(backendDir) {
  const venvDir = path.join(backendDir, ".venv");
  return process.platform === "win32"
    ? path.join(venvDir, "Scripts", "python.exe")
    : path.join(venvDir, "bin", "python");
}

function main() {
  const scriptDir = path.dirname(fs.realpathSync(__filename));
  const repoRoot = path.resolve(scriptDir, "..");
  process.chdir(repoRoot);

  const backendDir = path.join(repoRoot, "backend");
  const frontendDir = path.join(repoRoot, "frontend");
  const requirementsFile = path.join(backendDir, "requirements.txt");

  console.log("Bootstrapping project dependencies...");

  console.log("Installing backend Python dependencies...");

  if (!isDir(backendDir)) die("backend directory not found");
  if (!isFile(requirementsFile)) die("backend/requirements.txt not found");

  const py = pickPython();

  run(py, ["-m", "venv", ".venv"], { cwd: backendDir });

  const venvPy = venvPythonPath(backendDir);
  if (!isFile(venvPy))
    die(`Virtualenv python not found at expected path: ${venvPy}`);

  run(venvPy, ["-m", "pip", "install", "--upgrade", "pip"], {
    cwd: backendDir,
  });

  run(venvPy, ["-m", "pip", "install", "-r", "requirements.txt"], {
    cwd: backendDir,
  });

  console.log("Installing frontend npm dependencies...");

  if (!isDir(frontendDir)) die("frontend directory not found");

  run(npmExecutable(), ["install"], { cwd: frontendDir });

  console.log("\n✅ Bootstrap complete. Dependencies installed.");
}

try {
  main();
} catch (err) {
  if (err && err.code === "ENOENT") {
    die(
      `Command not found: ${err.path || "unknown"} (is it installed and on PATH?)`,
    );
  }
  die(err?.message || String(err));
}
