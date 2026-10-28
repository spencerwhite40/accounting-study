// Builds the app for hosting as a Claude artifact: relative asset paths, no service
// worker, and a page fragment (no doctype/html/head/body) with the CSS inlined.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

execSync("npx vite build", { stdio: "inherit", env: { ...process.env, ARTIFACT: "1" } });
const html = readFileSync("dist-artifact/index.html", "utf8");
const js = html.match(/src="\.\/(assets\/[^"]+\.js)"/)?.[1];
const css = html.match(/href="\.\/(assets\/[^"]+\.css)"/)?.[1];
if (!js || !css) throw new Error("could not find built assets");
const cssText = readFileSync(`dist-artifact/${css}`, "utf8");
const page = `<title>Accounting Study</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
html, body { height: 100%; }
${cssText}
</style>
<div id="root"></div>
<script type="module" src="${js}"></script>
`;
writeFileSync("dist-artifact/artifact.html", page);
console.log("artifact page:", "dist-artifact/artifact.html", "script:", js, "files:", readdirSync("dist-artifact/assets"));
