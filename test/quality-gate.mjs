import { spawn } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const argumentsAfterNode = process.argv.slice(2);
const ROOT = path.resolve(argumentsAfterNode.find((argument) => !argument.startsWith("--")) || ".");
const RUN_TESTS = !argumentsAfterNode.includes("--skip-tests");
const EXPECTED_ROOT_MANIFEST = {
  permissions: ["sidePanel", "search"],
  hostPermissions: ["https://nhentai.net/*"],
  csp: "script-src 'self'; object-src 'self'"
};
const EXPECTED_PROBE_MANIFEST = {
  permissions: ["tabs"],
  hostPermissions: ["https://www.dlsite.com/*"],
  csp: "script-src 'self'; object-src 'self'"
};
const REQUIRED_TEST_IMPORTS = [
  "./lookup.test.mjs",
  "./nhentai/nhentai-v2.test.mjs",
  "./source/message-schema-v2.test.mjs",
  "./source/message-context-v2.test.mjs",
  "./matching/text-normalization.test.mjs",
  "./matching/matching-evaluation.test.mjs",
  "./security/accessibility-v2.test.mjs",
  "./manifest-check-v2.mjs"
];
const FORBIDDEN_PATTERNS = [
  ["遠端程式碼", /\bimport\s*\(\s*["']https?:\/\//iu],
  ["遠端程式碼", /<script\b[^>]*\bsrc\s*=\s*["']?https?:\/\//iu],
  ["危險 DOM API", /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/iu],
  ["危險 DOM API", /\bdocument\.write\s*\(/iu],
  ["危險 DOM API", /\b(?:eval|Function)\s*\(/iu],
  ["敏感資料 API", /\bdocument\.cookie\b/iu],
  ["敏感資料 API", /\bchrome\.cookies\b/iu],
  ["敏感資料 API", /\bheaders\.get\s*\(\s*["']authorization["']\s*\)/iu]
];

const failures = [];
await inspectManifest("manifest.json", EXPECTED_ROOT_MANIFEST);
await inspectManifest("probe/dlsite-feasibility/manifest.json", EXPECTED_PROBE_MANIFEST);
await inspectTestRunner();

const scripts = await collectScripts();
for (const script of scripts) {
  await checkSyntax(script);
  if (!isTestScript(script)) await checkForbiddenPatterns(script);
}

if (RUN_TESTS) await runTests();

if (failures.length) {
  for (const failure of failures) console.error(`品質閘門失敗：${failure}`);
  process.exitCode = 1;
} else {
  console.log(`品質閘門通過：${scripts.length} 個 JavaScript 檔案、manifest、CSP、權限、禁止 API、語法、測試與效能基線均已檢查。`);
}

async function inspectManifest(relativePath, expected) {
  const manifestPath = path.join(ROOT, relativePath);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    failures.push(`${relativePath} 無法解析：${error.message}`);
    return;
  }
  const serialized = JSON.stringify(manifest);
  if (manifest.manifest_version !== 3) failures.push(`${relativePath} 必須是 Manifest V3`);
  if (JSON.stringify(manifest.permissions || []) !== JSON.stringify(expected.permissions)) {
    failures.push(`${relativePath} 含有非預期權限`);
  }
  if (JSON.stringify(manifest.host_permissions || []) !== JSON.stringify(expected.hostPermissions)) {
    failures.push(`${relativePath} 含有非預期網域或 <all_urls>`);
  }
  if (manifest.content_security_policy?.extension_pages !== expected.csp) {
    failures.push(`${relativePath} 的 CSP 必須限制為封裝內腳本`);
  }
  if (/<all_urls>|\*:\/\/|http:\/\//iu.test(serialized)) {
    failures.push(`${relativePath} 含有寬廣網域、非 HTTPS 網域或 <all_urls>`);
  }
}

async function inspectTestRunner() {
  const runnerPath = path.join(ROOT, "test/run-tests.mjs");
  let runner;
  try {
    runner = await readFile(runnerPath, "utf8");
  } catch (error) {
    failures.push(`測試入口無法讀取：${error.message}`);
    return;
  }
  for (const requiredImport of REQUIRED_TEST_IMPORTS) {
    if (!runner.includes(requiredImport)) failures.push(`測試入口缺少必要測試 ${requiredImport}`);
  }
}

async function collectScripts() {
  const files = [];
  for (const relativeDirectory of ["src", "probe", "test"]) {
    const directory = path.join(ROOT, relativeDirectory);
    try {
      await walk(directory, files);
    } catch (error) {
      failures.push(`${relativeDirectory} 無法掃描：${error.message}`);
    }
  }
  return files.sort();
}

async function walk(directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "fixtures") await walk(entryPath, files);
    else if (entry.isFile() && /\.(?:js|mjs)$/u.test(entry.name)) files.push(entryPath);
  }
}

async function checkSyntax(scriptPath) {
  const result = await execute(process.execPath, ["--check", scriptPath], ROOT);
  if (result.code !== 0) failures.push(`JavaScript 語法錯誤：${displayPath(scriptPath)}`);
}

async function checkForbiddenPatterns(scriptPath) {
  const source = await readFile(scriptPath, "utf8");
  for (const [label, pattern] of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) failures.push(`${label}：${displayPath(scriptPath)}`);
  }
}

async function runTests() {
  const runnerPath = path.join(ROOT, "test/run-tests.mjs");
  try {
    await stat(runnerPath);
  } catch {
    failures.push("測試入口不存在");
    return;
  }
  const result = await execute(process.execPath, [runnerPath], ROOT);
  if (result.code !== 0) failures.push("完整離線測試失敗");
}

function execute(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => resolve({ code: 1, output: error.message }));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

function displayPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function isTestScript(filePath) {
  return displayPath(filePath).startsWith("test/");
}
