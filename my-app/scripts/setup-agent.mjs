import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const agentDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "agent");
const env = {
  ...process.env,
  UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? resolve(agentDir, ".uv-cache"),
};
const commands =
  process.platform === "win32"
    ? [
        ["uv.exe", ["sync"]],
        ["py.exe", ["-m", "uv", "sync"]],
        ["python.exe", ["-m", "uv", "sync"]],
      ]
    : [
        ["uv", ["sync"]],
        ["python3", ["-m", "uv", "sync"]],
        ["python", ["-m", "uv", "sync"]],
      ];

let result;
for (const [command, args] of commands) {
  result = spawnSync(command, args, {
    cwd: agentDir,
    env,
    stdio: "inherit",
  });

  if (result.error?.code !== "ENOENT") {
    break;
  }
}

if (result.error?.code === "ENOENT") {
  console.error(
    [
      "",
      "Could not find `uv`, which is required to install the Python agent dependencies.",
      "Install it, then run `npm run install:agent` again:",
      "  py -m pip install uv",
      "  or follow https://docs.astral.sh/uv/getting-started/installation/",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
