import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const runtimeDirectory = path.join(backendDirectory, "runtime-package");

await rm(runtimeDirectory, { recursive: true, force: true });
await mkdir(runtimeDirectory, { recursive: true });
for (const name of ["dist", "node_modules", "references"]) {
  await cp(path.join(backendDirectory, name), path.join(runtimeDirectory, name), {
    recursive: true,
  });
}
await cp(path.join(backendDirectory, "package.json"), path.join(runtimeDirectory, "package.json"));

console.log("Prepared the Lambda runtime package.");
