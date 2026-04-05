const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const targets = [
  path.join(root, "server.js"),
  path.join(root, "js"),
  path.join(root, "backend"),
  path.join(root, "scripts")
];

function collectJsFiles(entryPath) {
  if (!fs.existsSync(entryPath)) return [];
  const stat = fs.statSync(entryPath);

  if (stat.isFile()) {
    return entryPath.endsWith(".js") ? [entryPath] : [];
  }

  return fs.readdirSync(entryPath).flatMap((name) => {
    const fullPath = path.join(entryPath, name);
    const st = fs.statSync(fullPath);
    if (st.isDirectory()) {
      return collectJsFiles(fullPath);
    }
    return fullPath.endsWith(".js") ? [fullPath] : [];
  });
}

const files = [...new Set(targets.flatMap(collectJsFiles))];

if (!files.length) {
  console.log("No se encontraron archivos JS para validar.");
  process.exit(0);
}

let hasErrors = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "pipe",
    encoding: "utf8"
  });

  if (result.status !== 0) {
    hasErrors = true;
    console.error(`\nError de sintaxis en: ${path.relative(root, file)}`);
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log(`Sintaxis JS correcta en ${files.length} archivo(s).`);

