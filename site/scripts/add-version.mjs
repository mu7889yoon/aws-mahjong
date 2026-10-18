import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const versionRoot = path.join(siteRoot, "src/content/versions");
const assetRoot = path.join(siteRoot, "public/assets");
const versionIdPattern = /^v\d+\.\d+\.\d+$/;
const requiredContentFiles = ["version.json", "rules.md", "tile-groups.json", "yaku.json"];

function usage() {
  return "Usage: npm run version:new -- <new-version-id> --from <source-version-id> (example: npm run version:new -- v2.0.2 --from v2.0.1)";
}

function parseArguments(args) {
  if (args.length !== 3 || args[1] !== "--from") {
    throw new Error(usage());
  }

  const [newId, , sourceId] = args;
  for (const [label, id] of [["new", newId], ["source", sourceId]]) {
    if (!versionIdPattern.test(id)) {
      throw new Error(`Invalid ${label} version id "${id}". Use v<major>.<minor>.<patch>.`);
    }
  }
  if (newId === sourceId) {
    throw new Error("The new version id must differ from the source version id.");
  }

  return { newId, sourceId };
}

async function requireDirectory(directory, label) {
  try {
    const info = await stat(directory);
    if (!info.isDirectory()) throw new Error(`${label} is not a directory: ${directory}`);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`${label} does not exist: ${directory}`);
    throw error;
  }
}

async function validateContentSource(directory, sourceId) {
  await requireDirectory(directory, "Source content version");
  for (const file of requiredContentFiles) {
    const filePath = path.join(directory, file);
    const info = await stat(filePath).catch((error) => {
      if (error?.code === "ENOENT") throw new Error(`Source version is incomplete; missing ${filePath}`);
      throw error;
    });
    if (!info.isFile()) throw new Error(`Source version is incomplete; expected a file at ${filePath}`);
  }

  const metadataPath = path.join(directory, "version.json");
  let metadata;
  try {
    metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read source metadata ${metadataPath}: ${error.message}`);
  }
  if (
    !metadata ||
    metadata.id !== sourceId ||
    typeof metadata.title !== "string" ||
    typeof metadata.description !== "string"
  ) {
    throw new Error(`Source metadata must include matching id, title, and description: ${metadataPath}`);
  }

  const rules = await readFile(path.join(directory, "rules.md"), "utf8");
  if (!rules.trim()) throw new Error(`Source rules are empty: ${path.join(directory, "rules.md")}`);
  const tileGroups = JSON.parse(await readFile(path.join(directory, "tile-groups.json"), "utf8"));
  if (!Array.isArray(tileGroups) || tileGroups.length === 0) {
    throw new Error(`Source tile-groups.json must contain at least one group: ${directory}`);
  }
  const yakuData = JSON.parse(await readFile(path.join(directory, "yaku.json"), "utf8"));
  if (!yakuData || !Array.isArray(yakuData.yakus)) {
    throw new Error(`Source yaku.json must contain a yakus array: ${directory}`);
  }

  return metadata;
}

async function validateAssetsSource(directory, contentDirectory) {
  await requireDirectory(directory, "Source public assets");
  await requireDirectory(path.join(directory, "output"), "Source tile output assets");
  const tileGroups = JSON.parse(await readFile(path.join(contentDirectory, "tile-groups.json"), "utf8"));
  const tileFiles = tileGroups.flatMap((group) => group.tiles.map((tile) => {
    if (!/^(?:[1-9][mps]|[1-7]z)$/.test(tile.id)) {
      throw new Error(`Invalid tile id in source: ${tile.id}`);
    }
    return `output/${tile.id}.svg`;
  }));
  for (const file of [...new Set(tileFiles), "output/tile-layout.pdf"]) {
    const filePath = path.join(directory, file);
    const info = await stat(filePath).catch((error) => {
      if (error?.code === "ENOENT") throw new Error(`Source assets are incomplete; missing ${filePath}`);
      throw error;
    });
    if (!info.isFile()) throw new Error(`Source assets are incomplete; expected a file at ${filePath}`);
  }

  const outputFiles = await readdir(path.join(directory, "output"));
  if (outputFiles.length === 0) throw new Error(`Source tile output assets are empty: ${directory}`);
}

function replaceVersionLabel(value, sourceId, newId) {
  return value.includes(sourceId) ? value.split(sourceId).join(newId) : `${value} ${newId}`;
}

async function rewriteCopiedMetadata(directory, sourceMetadata, sourceId, newId) {
  const metadata = {
    ...sourceMetadata,
    id: newId,
    title: replaceVersionLabel(sourceMetadata.title, sourceId, newId),
    description: replaceVersionLabel(sourceMetadata.description, sourceId, newId),
  };
  await writeFile(path.join(directory, "version.json"), `${JSON.stringify(metadata, null, 2)}\n`);

  const rulesPath = path.join(directory, "rules.md");
  const rules = await readFile(rulesPath, "utf8");
  const escapedSourceId = sourceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assetReference = new RegExp(`(assets/)${escapedSourceId}(?=/)`, "g");
  await writeFile(rulesPath, rules.replace(assetReference, `$1${newId}`));
}

async function copyDirectoryContents(source, destination) {
  for (const entry of await readdir(source)) {
    await cp(path.join(source, entry), path.join(destination, entry), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
  }
}

async function copyBoth(operations) {
  const results = await Promise.allSettled(operations);
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}

async function createVersion(newId, sourceId) {
  const sourceContent = path.join(versionRoot, sourceId);
  const sourceAssets = path.join(assetRoot, sourceId);
  const targetContent = path.join(versionRoot, newId);
  const targetAssets = path.join(assetRoot, newId);

  const [sourceMetadata] = await Promise.all([
    validateContentSource(sourceContent, sourceId),
    validateAssetsSource(sourceAssets, sourceContent),
  ]);

  for (const target of [targetContent, targetAssets]) {
    try {
      await stat(target);
      throw new Error(`Target already exists: ${target}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const stagingRoot = await mkdtemp(path.join(siteRoot, `.version-${newId}-`));
  const stagedContent = path.join(stagingRoot, "content");
  const stagedAssets = path.join(stagingRoot, "assets");
  let contentCreated = false;
  let assetsCreated = false;

  try {
    await copyBoth([
      cp(sourceContent, stagedContent, { recursive: true, errorOnExist: true }),
      cp(sourceAssets, stagedAssets, { recursive: true, errorOnExist: true }),
    ]);
    await rewriteCopiedMetadata(stagedContent, sourceMetadata, sourceId, newId);

    // This is a generated public URL. The authoritative yaku data stays in src
    // and generate-static-routes.mjs publishes it into dist during builds.
    await rm(path.join(stagedAssets, "yaku.json"), { force: true });

    // Reserve both destinations exclusively before copying either tree. If the
    // second reservation or any later copy fails, remove only directories this
    // invocation created.
    await mkdir(targetContent);
    contentCreated = true;
    await mkdir(targetAssets);
    assetsCreated = true;
    await copyBoth([
      copyDirectoryContents(stagedContent, targetContent),
      copyDirectoryContents(stagedAssets, targetAssets),
    ]);
  } catch (error) {
    await Promise.all([
      contentCreated ? rm(targetContent, { recursive: true, force: true }) : Promise.resolve(),
      assetsCreated ? rm(targetAssets, { recursive: true, force: true }) : Promise.resolve(),
    ]);
    throw error;
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }

  console.log(`Created ${newId} from ${sourceId}.`);
}

try {
  const { newId, sourceId } = parseArguments(process.argv.slice(2));
  await createVersion(newId, sourceId);
} catch (error) {
  console.error(`Could not create version: ${error.message}`);
  process.exitCode = 1;
}
