import type { Yaku } from "../content/types";
import { isTileId, type TileCounts } from "./tiles";
import { parseMpszToCounts } from "./mpsz";

export type SampleEvaluation = {
  sample: string;
  matchedCount: number;
  sampleCount: number;
  matchRate: number;
};

export type YakuRecommendation = {
  yaku: Yaku;
  best: SampleEvaluation;
};

export function evaluateSampleMatch(
  sampleCounts: Readonly<Record<string, number>>,
  selected: Readonly<TileCounts>,
): Omit<SampleEvaluation, "sample"> {
  const sampleCount = Object.values(sampleCounts).reduce((sum, count) => sum + count, 0);
  if (sampleCount === 0) {
    return { matchedCount: 0, sampleCount: 0, matchRate: 0 };
  }

  const matchedCount = Object.entries(selected).reduce((sum, [tile, count]) => {
    if (!isTileId(tile) || !Number.isFinite(count) || count <= 0) {
      return sum;
    }
    return sum + Math.min(Math.trunc(count), sampleCounts[tile] || 0);
  }, 0);

  return { matchedCount, sampleCount, matchRate: matchedCount / sampleCount };
}

export function compareSampleEvaluations(left: SampleEvaluation, right: SampleEvaluation): number {
  return (
    right.matchRate - left.matchRate ||
    right.matchedCount - left.matchedCount ||
    left.sample.localeCompare(right.sample)
  );
}

export function bestSampleForYaku(yaku: Yaku, selected: Readonly<TileCounts>): SampleEvaluation | null {
  const selectedCount = Object.entries(selected).reduce((sum, [tile, count]) => {
    return sum + (isTileId(tile) && count > 0 ? count : 0);
  }, 0);
  if (selectedCount === 0) {
    return null;
  }

  const samples = Array.isArray(yaku.sampleMpszList) ? yaku.sampleMpszList : [];
  const best = samples
    .map((sample) => ({ sample, ...evaluateSampleMatch(parseMpszToCounts(sample), selected) }))
    .filter((evaluation) => evaluation.matchedCount > 0)
    .sort(compareSampleEvaluations)[0];

  return best && best.matchRate >= 0.5 ? best : null;
}

export function getRecommendations(
  yakus: readonly Yaku[],
  selected: Readonly<TileCounts>,
): YakuRecommendation[] {
  return yakus
    .map((yaku, index) => ({ yaku, index, best: bestSampleForYaku(yaku, selected) }))
    .filter((item): item is { yaku: Yaku; index: number; best: SampleEvaluation } => item.best !== null)
    .sort((left, right) => right.best.matchRate - left.best.matchRate || left.index - right.index)
    .map(({ yaku, best }) => ({ yaku, best }));
}

export function descriptionText(description: Yaku["description"]): string {
  return Array.isArray(description) ? description.join(" ") : description || "";
}

export function hanText(han: Yaku["han"]): string {
  return han ? `${han}飜` : "飜数未設定";
}

export function boolText(value: boolean | null | undefined): string {
  return value === true ? "あり" : "なし";
}
