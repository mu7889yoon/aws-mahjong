import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Yaku } from "../content/types";
import { parseMpsz, parseMpszToCounts, tileImageFile } from "./mpsz";
import {
  bestSampleForYaku,
  evaluateSampleMatch,
  getRecommendations,
} from "./search";
import {
  adjustTileCount,
  clearTileCounts,
  createEmptyTileCounts,
  isTileId,
  toMpsz,
  totalTileCount,
} from "./tiles";

function makeYaku(id: string, sampleMpszList: string[]): Yaku {
  return {
    id,
    name: id,
    sampleMpszList,
    isPonAllowed: false,
    isChiAllowed: false,
    han: 1,
    hanOpen: 1,
    isCombineAllowed: false,
    description: [],
  };
}

describe("tile selection", () => {
  it("starts with all 34 tiles at zero and clamps additions and removals", () => {
    const empty = createEmptyTileCounts();
    expect(Object.keys(empty)).toHaveLength(34);
    expect(totalTileCount(empty)).toBe(0);

    const full = adjustTileCount(empty, "5z", 8);
    expect(full["5z"]).toBe(4);
    expect(adjustTileCount(full, "5z", 1)).toBe(full);

    const removed = adjustTileCount(full, "5z", -9);
    expect(removed["5z"]).toBe(0);
    expect(adjustTileCount(removed, "5z", -1)).toBe(removed);
    expect(totalTileCount(full)).toBe(4);
    expect(totalTileCount(clearTileCounts(full))).toBe(0);
  });

  it("ignores unknown tile IDs and serializes known counts in suit order", () => {
    const counts = adjustTileCount(createEmptyTileCounts(), "8s", 2);
    const withMan = adjustTileCount(counts, "2m", 1);
    expect(isTileId("8s")).toBe(true);
    expect(isTileId("9z")).toBe(false);
    expect(adjustTileCount(withMan, "9z", 1)).toBe(withMan);
    expect(toMpsz({ ...withMan, "9z": 3 })).toBe("2m88s");
  });
});

describe("MPSZ parsing", () => {
  it("counts duplicate tiles, ignores separators, and handles unknown tile keys safely", () => {
    expect(parseMpszToCounts("555z-12m")).toEqual({ "5z": 3, "1m": 1, "2m": 1 });

    const score = evaluateSampleMatch(parseMpszToCounts("1m99z"), { "1m": 1, "99z": 2 });
    expect(score).toEqual({ matchedCount: 1, sampleCount: 3, matchRate: 1 / 3 });
    expect(parseMpszToCounts("1m-2p unknown")).toEqual({ "1m": 1, "2p": 1 });
  });

  it("preserves separators, rotated tiles, quoted pairs, and placeholder tokens", () => {
    expect(parseMpsz("1m-2'p-3''s-4\"z-Xx-Qq")).toEqual([
      { kind: "tile", tileKey: "1m", orientation: "upright" },
      { kind: "space" },
      { kind: "tile", tileKey: "2p", orientation: "sideways" },
      { kind: "space" },
      { kind: "tile", tileKey: "3s", orientation: "sidewaysTop" },
      { kind: "space" },
      { kind: "tile", tileKey: "4z", orientation: "sideways" },
      { kind: "tile", tileKey: "4z", orientation: "sidewaysTop" },
      { kind: "space" },
      { kind: "tile", tileKey: "x", orientation: "upright" },
      { kind: "space" },
      { kind: "tile", tileKey: "q", orientation: "upright" },
    ]);
    expect(tileImageFile("0m")).toBe("5m.svg");
    expect(tileImageFile("x")).toBe("1z.svg");
    expect(tileImageFile("unknown")).toBe("5z.svg");
  });

  it("parses every sample from all shipped versions into local tile assets", () => {
    const versions = readdirSync(new URL("../content/versions/", import.meta.url));
    for (const version of versions) {
      const dataPath = fileURLToPath(new URL(`../content/versions/${version}/yaku.json`, import.meta.url));
      const payload = JSON.parse(readFileSync(dataPath, "utf8")) as {
        yakus: Array<{ sampleMpszList?: string[] }>;
      };

      for (const sample of payload.yakus.flatMap((yaku) => yaku.sampleMpszList || [])) {
        const tiles = parseMpsz(sample).filter((token) => token.kind === "tile");
        expect(tiles.length, `${version} sample ${sample}`).toBeGreaterThan(0);
        for (const token of tiles) {
          if (token.kind !== "tile") continue;
          expect(isTileId(token.tileKey), `${version} sample ${sample}: ${token.tileKey}`).toBe(true);
          expect(
            existsSync(fileURLToPath(new URL(`../../public/assets/${version}/output/${tileImageFile(token.tileKey)}`, import.meta.url))),
            `${version} image for ${token.tileKey}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("sample matching", () => {
  it("keeps the 50 percent threshold inclusive and rejects lower matches", () => {
    const selected = { ...createEmptyTileCounts(), "1m": 1 };
    expect(bestSampleForYaku(makeYaku("half", ["1m2m"]), selected)?.matchRate).toBe(0.5);
    expect(bestSampleForYaku(makeYaku("below", ["1m2m3m"]), selected)).toBeNull();
  });

  it("uses duplicate counts and breaks sample ties by matched count, then string", () => {
    const selected = { ...createEmptyTileCounts(), "1m": 2, "2m": 2, "5z": 2 };
    const duplicate = bestSampleForYaku(makeYaku("duplicates", ["555z"]), selected);
    expect(duplicate).toMatchObject({ matchedCount: 2, sampleCount: 3, matchRate: 2 / 3 });

    const countTie = bestSampleForYaku(makeYaku("count", ["1m2m", "11m22m"]), selected);
    expect(countTie?.sample).toBe("11m22m");

    const stringTie = bestSampleForYaku(makeYaku("string", ["2m", "1m"]), selected);
    expect(stringTie?.sample).toBe("1m");
  });

  it("returns no matches for empty or unknown-only selections and keeps result ties stable", () => {
    const yakus = [makeYaku("first", ["1m"]), makeYaku("second", ["1m"])];
    expect(getRecommendations(yakus, createEmptyTileCounts())).toEqual([]);
    expect(getRecommendations(yakus, { "99z": 1 })).toEqual([]);
    expect(getRecommendations(yakus, { "1m": 1 }).map(({ yaku }) => yaku.id)).toEqual([
      "first",
      "second",
    ]);
  });
});
