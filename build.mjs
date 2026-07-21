import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const serverDir = path.join(dist, "server");
const openaiDir = path.join(dist, ".openai");

const read = (file) => readFile(path.join(root, file), "utf8");

await rm(dist, { recursive: true, force: true });
await mkdir(serverDir, { recursive: true });
await mkdir(openaiDir, { recursive: true });

const [indexHtml, appJs, stylesCss, manifest, hosting] = await Promise.all([
  read("index.html"),
  read("app.js"),
  read("styles.css"),
  read("manifest.webmanifest"),
  read(".openai/hosting.json"),
]);

const server = `const assets = {
  "/": { body: ${JSON.stringify(indexHtml)}, type: "text/html; charset=utf-8" },
  "/index.html": { body: ${JSON.stringify(indexHtml)}, type: "text/html; charset=utf-8" },
  "/app.js": { body: ${JSON.stringify(appJs)}, type: "text/javascript; charset=utf-8" },
  "/styles.css": { body: ${JSON.stringify(stylesCss)}, type: "text/css; charset=utf-8" },
  "/manifest.webmanifest": { body: ${JSON.stringify(manifest)}, type: "application/manifest+json; charset=utf-8" },
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = assets[url.pathname] || assets["/"];

    return new Response(asset.body, {
      headers: {
        "content-type": asset.type,
        "cache-control": url.pathname === "/" || url.pathname === "/index.html"
          ? "no-cache"
          : "public, max-age=3600",
      },
    });
  },
};
`;

await writeFile(path.join(serverDir, "index.js"), server);
await writeFile(path.join(openaiDir, "hosting.json"), hosting);
