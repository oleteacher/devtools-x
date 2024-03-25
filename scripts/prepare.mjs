import fs from "fs/promises";

// copy node_modules/wasm-vips/lib/vips-es6.js to assets/vips-es6.js

await fs.mkdir("assets/vips", { recursive: true });

const vipsEs6 = await fs.readFile("node_modules/wasm-vips/lib/vips-es6.js");
await fs.writeFile("assets/vips/vips-es6.js", vipsEs6);

const vipsWasm = await fs.readFile("node_modules/wasm-vips/lib/vips.wasm");
await fs.writeFile("assets/vips/vips.wasm", vipsWasm);

const vipsWorker = await fs.readFile(
  "node_modules/wasm-vips/lib/vips-es6.worker.js"
);
await fs.writeFile("assets/vips/vips-es6.worker.js", vipsWorker);
