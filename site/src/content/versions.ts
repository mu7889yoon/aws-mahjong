import type { SiteVersion, TileGroup, VersionMetadata, Yaku } from "./types";

interface YakuFile {
  yakus: Yaku[];
}

const metadataFiles = import.meta.glob<VersionMetadata>(
  "./versions/*/version.json",
  { eager: true, import: "default" },
);
const ruleFiles = import.meta.glob<string>("./versions/*/rules.md", {
  eager: true,
  query: "?raw",
  import: "default",
});
const tileGroupFiles = import.meta.glob<TileGroup[]>(
  "./versions/*/tile-groups.json",
  { eager: true, import: "default" },
);
const yakuFiles = import.meta.glob<YakuFile>("./versions/*/yaku.json", {
  eager: true,
  import: "default",
});

function compareVersions(left: SiteVersion, right: SiteVersion): number {
  const parse = (id: string) => id.match(/\d+/g)?.map(Number) ?? [];
  const leftParts = parse(left.id);
  const rightParts = parse(right.id);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (rightParts[index] ?? 0) - (leftParts[index] ?? 0);
    if (difference !== 0) return difference;
  }

  return right.id.localeCompare(left.id);
}

function requireFile<T>(files: Record<string, T>, path: string, versionId: string): T {
  const file = files[path];
  if (file === undefined) {
    throw new Error(`Version ${versionId} is missing ${path}`);
  }
  return file;
}

export const versions: SiteVersion[] = Object.entries(metadataFiles)
  .map(([metadataPath, metadata]) => {
    const directory = metadataPath.split("/").at(-2);
    if (!directory || directory !== metadata.id) {
      throw new Error(`Version directory and metadata id must match: ${metadataPath}`);
    }

    const prefix = `./versions/${directory}`;
    const yakuFile = requireFile(yakuFiles, `${prefix}/yaku.json`, metadata.id);

    return {
      ...metadata,
      rules: requireFile(ruleFiles, `${prefix}/rules.md`, metadata.id),
      tileGroups: requireFile(tileGroupFiles, `${prefix}/tile-groups.json`, metadata.id),
      yakus: yakuFile.yakus,
      assetPath: `assets/${metadata.id}`,
    };
  })
  .sort(compareVersions);

export function getVersion(id: string): SiteVersion | undefined {
  return versions.find((version) => version.id === id);
}
