import { mkdir, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repositoryDirectory = path.dirname(backendDirectory);
const sourceDirectory = path.join(
  repositoryDirectory,
  "site",
  "public",
  "assets",
  "v2.0.1",
  "output",
);
const referenceDirectory = path.join(backendDirectory, "references");
const tileIds = [
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}m`),
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}p`),
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}s`),
  ...Array.from({ length: 7 }, (_, index) => `${index + 1}z`),
];

await rm(referenceDirectory, { recursive: true, force: true });
await mkdir(referenceDirectory, { recursive: true });

for (const tileId of tileIds) {
  await copyFile(
    path.join(sourceDirectory, `${tileId}.svg`),
    path.join(referenceDirectory, `${tileId}.svg`),
  );
}

console.log(`Copied ${tileIds.length} tile reference images.`);
