import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const includeDirs = ["lib", "routes", "test"];
const includeFiles = ["server.js"];

const collectJsFiles = (startDir) => {
  const entries = readdirSync(startDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(startDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
};

const targets = [
  ...includeFiles.map((file) => join(rootDir, file)).filter((file) => statSync(file).isFile()),
  ...includeDirs.flatMap((dir) => collectJsFiles(join(rootDir, dir))),
];

for (const target of targets) {
  execFileSync(process.execPath, ["--check", target], { stdio: "inherit" });
  console.log(`Syntax OK: ${relative(rootDir, target)}`);
}
