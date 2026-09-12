import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(root, "test/fixtures/quality-gate");
const fixtures = [
  ["remote-code", "遠端程式碼", true],
  ["all-urls", "<all_urls>", true],
  ["unexpected-permission", "非預期權限", true],
  ["dangerous-dom", "危險 DOM API", true],
  ["sensitive-data", "敏感資料 API", true],
  ["syntax-error", "JavaScript 語法錯誤", true],
  ["test-failure", "完整離線測試失敗", false]
];

for (const [name, expectedMessage, skipTests] of fixtures) {
  const result = await execute([
    "test/quality-gate.mjs",
    path.join(fixtureRoot, name),
    ...(skipTests ? ["--skip-tests"] : [])
  ]);
  assert.notEqual(result.code, 0, `${name} 必須使品質閘門回傳非零狀態`);
  assert.match(result.output, new RegExp(expectedMessage), `${name} 必須回報正確失敗類型`);
}

console.log("quality-gate.test.mjs: all violation fixtures returned non-zero status");

function execute(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => resolve({ code: 1, output: error.message }));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}
