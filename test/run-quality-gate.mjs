import { spawn } from "node:child_process";
import process from "node:process";

const checks = [
  ["品質檢查", ["test/quality-gate.mjs"]],
  ["違規 fixture", ["test/quality-gate.test.mjs"]]
];

for (const [name, args] of checks) {
  const status = await new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
  if (status !== 0) {
    console.error(`品質閘門失敗：${name}`);
    process.exit(status);
  }
}

console.log("完整離線品質閘門通過。");
