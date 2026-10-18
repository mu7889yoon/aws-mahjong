export const TILE_SUITS = ["m", "p", "s", "z"] as const;

export const TILE_IDS = [
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}m`),
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}p`),
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}s`),
  ...Array.from({ length: 7 }, (_, index) => `${index + 1}z`),
] as const;

export type TileId = (typeof TILE_IDS)[number];
export type TileCounts = Record<string, number>;

const tileIdSet: ReadonlySet<string> = new Set(TILE_IDS);

export function isTileId(value: string): value is TileId {
  return tileIdSet.has(value);
}

export function createEmptyTileCounts(tileIds: readonly string[] = TILE_IDS): TileCounts {
  return Object.fromEntries(tileIds.map((tile) => [tile, 0]));
}

export function adjustTileCount(
  counts: TileCounts,
  tile: string,
  delta: number,
  maxCopies = 4,
): TileCounts {
  if (!isTileId(tile) || !Number.isFinite(delta) || delta === 0) {
    return counts;
  }

  const current = Number.isFinite(counts[tile]) ? Math.trunc(counts[tile]) : 0;
  const next = Math.min(maxCopies, Math.max(0, current + Math.trunc(delta)));
  if (next === current) {
    return counts;
  }

  return { ...counts, [tile]: next };
}

export function clearTileCounts(counts: TileCounts): TileCounts {
  return Object.fromEntries(Object.keys(counts).map((tile) => [tile, 0]));
}

export function totalTileCount(counts: TileCounts): number {
  return Object.values(counts).reduce((total, count) => {
    return total + (Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0);
  }, 0);
}

export function toMpsz(counts: TileCounts): string {
  return TILE_SUITS.map((suit) => {
    const digits = TILE_IDS.filter((tile) => tile.endsWith(suit))
      .map((tile) => tile[0].repeat(Math.max(0, Math.min(4, Math.trunc(counts[tile] || 0)))))
      .join("");
    return digits ? `${digits}${suit}` : "";
  }).join("");
}

export function tileLabel(tile: string): string {
  return tile.replace("m", "萬").replace("p", "筒").replace("s", "索").replace("z", "字");
}
