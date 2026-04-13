const fs = require("fs");
const path = require("path");

const version = Date.now().toString(36);
const swPath = path.join(__dirname, "..", "out", "sw.js");

if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, "utf-8");
  content = content.replace("__BUILD_VERSION__", version);
  fs.writeFileSync(swPath, content);
  console.log(`SW stamped with version: ${version}`);
} else {
  console.log("sw.js not found in out/, skipping stamp");
}
