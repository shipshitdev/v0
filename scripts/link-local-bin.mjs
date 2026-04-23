import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(repoRoot, "src");
const binDir = join(repoRoot, "node_modules", ".bin");
const binPath = join(binDir, "v0");
const targetPath = join(repoRoot, "dist", "index.js");
const relativeTarget = relative(binDir, targetPath);

if (!existsSync(sourceDir)) {
  process.exit(0);
}

mkdirSync(binDir, { recursive: true });
rmSync(binPath, { force: true });

symlinkSync(relativeTarget, binPath);
