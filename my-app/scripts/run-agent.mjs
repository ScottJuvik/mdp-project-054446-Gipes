import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const agentDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "agent");
const env = {
  ...process.env,
  UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? resolve(agentDir, ".uv-cache"),
};
const candidates =
  process.platform === "win32"
    ? [
        ["uv.exe", ["run"]],
        ["py.exe", ["-m", "uv", "run"]],
        ["python.exe", ["-m", "uv", "run"]],
      ]
    : [
        ["uv", ["run"]],
        ["python3", ["-m", "uv", "run"]],
        ["python", ["-m", "uv", "run"]],
      ];

let command;
let argsPrefix;
for (const [candidateCommand, candidateArgs] of candidates) {
  const result = spawnSync(candidateCommand, [...candidateArgs, "langgraph", "--version"], {
    cwd: agentDir,
    env,
    stdio: "ignore",
  });

  if (!result.error && result.status === 0) {
    command = candidateCommand;
    argsPrefix = candidateArgs;
    break;
  }
}

if (!command || !argsPrefix) {
  console.error(
    [
      "",
      "Could not start the LangGraph agent because `uv` is not available.",
      "Run `npm run install:agent` first, then try `npm run dev` again.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(command, [...argsPrefix, "langgraph", "dev", "--port", "8123", "--no-browser"], {
  cwd: agentDir,
  env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Failed to start the LangGraph agent: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
