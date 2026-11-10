import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const assetsDir = resolve(root, "public");
const outputDir = resolve(root, "dist");
const workerDir = resolve(outputDir, "server");
const assetTypes = {
  "/login-helper.mjs": "text/javascript; charset=utf-8",
  "/index.html": "text/html; charset=utf-8",
  "/app.js": "text/javascript; charset=utf-8",
  "/styles.css": "text/css; charset=utf-8"
};
const assets = {};
for (const [pathname, type] of Object.entries(assetTypes)) {
  const contents = await readFile(resolve(assetsDir, pathname.slice(1)), "utf8");
  assets[pathname] = { body: contents, type };
}
const template = await readFile(resolve(root, "worker/index.template.js"), "utf8");
if (!template.includes("__RELAY_ASSETS__")) throw new Error("Worker template is missing the asset insertion point.");
const builtWorker = template.replace("__RELAY_ASSETS__", JSON.stringify(assets)).replace("__ACCOUNT_CORE__", await readFile(resolve(root,"worker/accounts.js"),"utf8"));
await mkdir(workerDir, { recursive: true });
await mkdir(resolve(outputDir, ".openai"), { recursive: true });
await writeFile(resolve(workerDir, "index.js"), builtWorker, "utf8");
await copyFile(resolve(root, ".openai/hosting.json"), resolve(outputDir, ".openai/hosting.json"));
console.log(`Built Worker and embedded ${Object.keys(assets).length} app assets.`);
