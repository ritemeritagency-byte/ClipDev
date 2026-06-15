import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import esbuild from "esbuild";

const rootDir = process.cwd();
const watchMode = process.argv.includes("--watch");

const fileExists = (filePath) => {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const dirExists = (dirPath) => existsSync(dirPath) && statSync(dirPath).isDirectory();

const collectTsFiles = (startDir) => {
  const entries = readdirSync(startDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(startDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
};

const browserEntry = resolve(rootDir, "script.ts");
const apiEntries = dirExists(resolve(rootDir, "api"))
  ? collectTsFiles(resolve(rootDir, "api")).filter((file) => !file.endsWith(".test.ts"))
  : [];
const railwayEntry = resolve(rootDir, "railway-api/server.ts");
const railwayLibEntries = dirExists(resolve(rootDir, "railway-api/lib"))
  ? collectTsFiles(resolve(rootDir, "railway-api/lib")).filter((file) => !file.endsWith(".test.ts"))
  : [];
const railwayEntries = fileExists(railwayEntry) ? [railwayEntry, ...railwayLibEntries] : [];

const entryPoints = [browserEntry, ...apiEntries, ...railwayEntries].filter(fileExists);

if (!entryPoints.length) {
  console.log("No TypeScript entrypoints found yet.");
  process.exit(0);
}

const buildOptions = {
  entryPoints,
  outdir: rootDir,
  outbase: rootDir,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  splitting: false,
  sourcemap: false,
  minify: true,
  logLevel: "info",
  entryNames: "[dir]/[name]",
  outExtension: { ".js": ".js" },
};

const buildOnce = async () => {
  const browserBuild = await esbuild.build({
    ...buildOptions,
    entryPoints: entryPoints.filter((file) => file === browserEntry),
    platform: "browser",
  });

  const apiBuild = apiEntries.length
    ? await esbuild.build({
        ...buildOptions,
        format: "cjs",
        entryPoints: apiEntries,
        platform: "node",
        target: ["node20"],
      })
    : null;

  const railwayBuild = railwayEntries.length
    ? await esbuild.build({
        ...buildOptions,
        format: "cjs",
        entryPoints: railwayEntries,
        platform: "node",
        target: ["node20"],
      })
    : null;

  return { browserBuild, apiBuild, railwayBuild };
};

if (watchMode) {
  const contexts = [];

  if (entryPoints.includes(browserEntry)) {
    contexts.push(
      await esbuild.context({
        ...buildOptions,
        entryPoints: [browserEntry],
        platform: "browser",
      })
    );
  }

  if (apiEntries.length) {
    contexts.push(
      await esbuild.context({
        ...buildOptions,
        entryPoints: apiEntries,
        platform: "node",
        target: ["node20"],
      })
    );
  }

  if (railwayEntries.length) {
    contexts.push(
      await esbuild.context({
        ...buildOptions,
        entryPoints: railwayEntries,
        platform: "node",
        target: ["node20"],
      })
    );
  }

  for (const context of contexts) {
    await context.watch();
  }

  console.log("Watching TypeScript entrypoints...");
} else {
  await buildOnce();
}
