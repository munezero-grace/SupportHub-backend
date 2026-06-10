"use strict";

const { spawn } = require("child_process");
const path = require("path");
const readline = require("readline");

const ROOT = path.join(__dirname, "..");

function runWithPrefix(name, command, args, options) {
  const child = spawn(command, args, { ...options, stdio: ["inherit", "pipe", "pipe"] });
  const prefix = `[${name}] `;

  for (const [stream, out] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    readline.createInterface({ input: stream }).on("line", (line) => {
      out.write(prefix + line + "\n");
    });
  }

  child.on("exit", (code, signal) => {
    console.log(`${prefix}exited with ${signal ? `signal ${signal}` : `code ${code}`}`);
  });

  return child;
}

const backend = runWithPrefix(
  "backend",
  process.execPath,
  [require.resolve("ts-node-dev/lib/bin.js"), "--respawn", "--transpile-only", "src/index.ts"],
  { cwd: ROOT }
);

const mlService = runWithPrefix(
  "ml-service",
  "python",
  [
    "-m", "uvicorn", "main:app",
    "--app-dir", "../ml-service",
    "--port", "8000",
    "--reload",
    "--reload-dir", "../ml-service",
  ],
  { cwd: ROOT }
);

const children = [backend, mlService];

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
