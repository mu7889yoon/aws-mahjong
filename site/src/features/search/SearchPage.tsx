import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Slider from "@cloudscape-design/components/slider";
import { useEffect, useMemo, useState } from "react";
import type { SiteVersion } from "../../content/types";
import { TileHand } from "../../components/TileHand";
import { assetUrl } from "../../app/paths";
import {
  boolText,
  descriptionText,
  getRecommendations,
  hanText,
} from "../../domain/search";
import {
  adjustTileCount,
  clearTileCounts,
  createEmptyTileCounts,
  isTileId,
  tileLabel,
  toMpsz,
  totalTileCount,
  type TileCounts,
} from "../../domain/tiles";
import "./search.css";

type SearchPageProps = { version: SiteVersion };

export function SearchPage({ version }: SearchPageProps) {
  return <SearchPageForVersion key={version.id} version={version} />;
}

function SearchPageForVersion({ version }: SearchPageProps) {
  const tiles = useMemo(() => version.tileGroups.flatMap((group) => group.tiles), [version.tileGroups]);
  const [counts, setCounts] = useState(() => createEmptyTileCounts(tiles.map((tile) => tile.id)));
  const selectedTotal = totalTileCount(counts);
  const recommendations = useMemo(
    () => getRecommendations(version.yakus, counts),
    [version.yakus, counts],
  );
  const selectedTiles = tiles.filter((tile) => counts[tile.id] > 0);

  return (
    <SpaceBetween size="l">
      <Container header={<Header variant="h1">役検索</Header>}>
        <Box variant="p">{version.title}の牌を選ぶと、条件に合う役サンプルを表示します。</Box>
      </Container>

      <ImageClassifier onApply={(detectedCounts) => setCounts(detectedCounts)} version={version} />

      <ColumnLayout columns={2} borders="vertical" minColumnWidth={320}>
        <Container header={<Header variant="h2">牌を選ぶ</Header>}>
          <SpaceBetween size="s">
            {version.tileGroups.map((group) => (
              <section className="search-tile-group" key={group.id} aria-label={group.title}>
                <Box variant="h3">{group.title}</Box>
                {group.description ? <Box variant="small">{group.description}</Box> : null}
                <div className="search-tile-group__row">
                  {group.tiles.map((tile) => {
                    const count = counts[tile.id] || 0;
                    const imageUrl = assetUrl(
                      `${version.assetPath}/output/${tile.id}.svg`,
                    );
                    return (
                      <button
                        className="search-tile-button"
                        type="button"
                        key={tile.id}
                        aria-label={`${tile.name || tileLabel(tile.id)}を追加`}
                        aria-pressed={count > 0}
                        title={`${tile.name || tileLabel(tile.id)}を追加`}
                        disabled={count >= 4}
                        onClick={() => setCounts((current) => adjustTileCount(current, tile.id, 1))}
                      >
                        <span className="search-tile-button__face">
                          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
                        </span>
                        <span className="search-tile-button__count" aria-live="polite">
                          {count > 0 ? `x${count}` : " "}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </SpaceBetween>
        </Container>

        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button
                  onClick={() => setCounts((current) => clearTileCounts(current))}
                  disabled={selectedTotal === 0}
                >
                  すべてクリア
                </Button>
              }
            >
              選択中の牌
            </Header>
          }
        >
          <SpaceBetween size="m">
            {selectedTotal > 0 ? (
              <>
                <TileHand
                  mpsz={toMpsz(counts)}
                  assetPath={version.assetPath}
                  ariaLabel={`選択中の牌、合計${selectedTotal}枚`}
                />
                <Box color="text-body-secondary">合計 {selectedTotal} 枚</Box>
              </>
            ) : (
              <Box color="text-body-secondary">まだ牌が選ばれていません。</Box>
            )}

            {selectedTiles.length > 0 ? (
              <div className="search-selected-list">
                {selectedTiles.map((tile) => {
                  const count = counts[tile.id];
                  const name = tile.name || tileLabel(tile.id);
                  return (
                    <div className="search-selected-item" key={tile.id}>
                      <TileHand mpsz={tile.id} assetPath={version.assetPath} ariaLabel={name} />
                      <span className="search-selected-item__label">
                        {name} x{count}
                      </span>
                      <span className="search-selected-item__controls">
                        <Button
                          ariaLabel={`${name}を1枚減らす`}
                          disabled={count <= 0}
                          onClick={() => setCounts((current) => adjustTileCount(current, tile.id, -1))}
                        >
                          −
                        </Button>
                        <Button
                          ariaLabel={`${name}を1枚増やす`}
                          disabled={count >= 4}
                          onClick={() => setCounts((current) => adjustTileCount(current, tile.id, 1))}
                        >
                          ＋
                        </Button>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </SpaceBetween>
        </Container>
      </ColumnLayout>

      <Container header={<Header variant="h2">おすすめの役</Header>}>
        {selectedTotal === 0 ? (
          <Box color="text-body-secondary">牌を選ぶとおすすめの役が表示されます。</Box>
        ) : recommendations.length === 0 ? (
          <Box color="text-body-secondary">近い役サンプルが見つかりませんでした。</Box>
        ) : (
          <div className="search-recommendations">
            {recommendations.map(({ yaku, best }) => {
              const description = descriptionText(yaku.description);
              const matchPercent = `${Math.round(best.matchRate * 100)}%`;
              return (
                <Container
                  key={yaku.id}
                  header={
                    <Header
                      variant="h3"
                      actions={<Badge color="blue">一致度 {matchPercent}</Badge>}
                    >
                      {yaku.name || yaku.id}
                    </Header>
                  }
                >
                  <SpaceBetween size="s">
                    <Box>{hanText(yaku.han)}</Box>
                    <div className="search-recommendation__calls" aria-label="鳴きの可否">
                      <Badge>ポン: {boolText(yaku.isPonAllowed)}</Badge>
                      <Badge>チー: {boolText(yaku.isChiAllowed)}</Badge>
                    </div>
                    {description ? <Box>{description}</Box> : null}
                    <Box color="text-body-secondary">
                      一致度: {matchPercent}（{best.matchedCount}/{best.sampleCount}枚）
                    </Box>
                    <TileHand
                      mpsz={best.sample}
                      assetPath={version.assetPath}
                      ariaLabel={`${yaku.name || yaku.id}の近い牌サンプル: ${best.sample}`}
                    />
                    <Box>近いサンプル: {best.sample}</Box>
                  </SpaceBetween>
                </Container>
              );
            })}
          </div>
        )}
      </Container>
    </SpaceBetween>
  );
}

type TileCandidate = {
  id: string;
  label: string;
  probability: number;
};

type ClassificationResponse = {
  detections: TileCandidate[];
};

function ImageClassifier({
  onApply,
  version,
}: {
  onApply: (counts: TileCounts) => void;
  version: SiteVersion;
}) {
  const apiUrl = import.meta.env.VITE_TILE_CLASSIFIER_API_URL;
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ClassificationResponse>();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [threshold, setThreshold] = useState(0.5);
  const visibleDetections = result?.detections.filter(({ probability }) => probability >= threshold) ?? [];

  useEffect(() => {
    if (!file) {
      setPreviewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function classify() {
    if (!file || !apiUrl) return;
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      const payload = (await response.json().catch(() => null)) as
        | ClassificationResponse
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error : `判定に失敗しました（${response.status}）。`);
      }
      if (!payload || !("detections" in payload)) throw new Error("判定結果を読み取れませんでした。");
      setResult(payload);
      setQuantities(Object.fromEntries(payload.detections.map(({ id }) => [id, 1])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "画像を判定できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  function applyDetectedCounts() {
    if (!result) return;
    const next = clearTileCounts(createEmptyTileCounts());
    for (const candidate of visibleDetections) {
      if (isTileId(candidate.id)) {
        const count = quantities[candidate.id] ?? 0;
        next[candidate.id] = Math.max(0, Math.min(4, Math.trunc(count)));
      }
    }
    onApply(next);
  }

  return (
    <Container header={<Header variant="h2">画像から牌候補を探す</Header>}>
      <SpaceBetween size="m">
        <Box color="text-body-secondary">
          JPGまたはPNG（4MB以下）。画像は判定のためTypeSafeへ送信されます。このアプリでは保存しません。候補の枚数は人が確認して入力します。
        </Box>
        <FormField
          label={`候補の判定しきい値: ${Math.round(threshold * 100)}%`}
          description="値を下げると一致度の低い候補も表示されます。候補が牌かどうか画像を確認してください。"
        >
          <Slider
            ariaLabel="候補の判定しきい値"
            max={1}
            min={0}
            onChange={({ detail }) => setThreshold(detail.value)}
            referenceValues={[0, 0.5, 1]}
            step={0.05}
            value={threshold}
            valueFormatter={(value) => `${Math.round(value * 100)}%`}
          />
        </FormField>
        {!apiUrl ? (
          <Box color="text-status-warning">画像判定APIはまだ設定されていません。</Box>
        ) : null}
        <div className="search-classifier__controls">
          <input
            accept="image/jpeg,image/png"
            aria-label="判定する麻雀牌の画像"
            disabled={!apiUrl || loading}
            onChange={(event) => {
              const next = event.currentTarget.files?.[0];
              setError(undefined);
              setResult(undefined);
              if (!next) return;
              if (next.type !== "image/jpeg" && next.type !== "image/png") {
                setFile(undefined);
                setError("JPGまたはPNG画像を選択してください。");
                event.currentTarget.value = "";
                return;
              }
              if (next.size > 4 * 1024 * 1024) {
                setFile(undefined);
                setError("画像は4MB以下にしてください。");
                event.currentTarget.value = "";
                return;
              }
              setFile(next);
            }}
            type="file"
          />
          <Button disabled={!file || !apiUrl || loading} loading={loading} onClick={() => void classify()}>
            画像を判定
          </Button>
        </div>
        {error ? <div role="alert"><Box color="text-status-error">{error}</Box></div> : null}
        {previewUrl ? (
          <div className="search-classifier__preview">
            <img src={previewUrl} alt="選択した麻雀牌の画像" />
          </div>
        ) : null}
        {result ? (
          <>
            {result.detections.length === 0 ? (
              <Box color="text-body-secondary">牌の候補は見つかりませんでした。牌が大きく写るように撮り直してください。</Box>
            ) : visibleDetections.length === 0 ? (
              <Box color="text-body-secondary">このしきい値を超える候補はありません。しきい値を下げると候補が表示されることがあります。</Box>
            ) : (
              <>
                <div className="search-classifier__candidates">
                  {visibleDetections.map((candidate) => (
                    <label className="search-classifier__candidate" key={candidate.id}>
                      <TileHand compact mpsz={candidate.id} assetPath={version.assetPath} ariaLabel={candidate.label} />
                      <span>{candidate.label}</span>
                      <span className="search-classifier__confidence">
                        一致 {Math.round(candidate.probability * 100)}%
                      </span>
                      <input
                        aria-label={`${candidate.label}の枚数`}
                        inputMode="numeric"
                        max={4}
                        min={0}
                        onChange={(event) => {
                          const count = event.currentTarget.value === ""
                            ? 0
                            : Math.max(0, Math.min(4, Math.trunc(Number(event.currentTarget.value) || 0)));
                          setQuantities((current) => ({ ...current, [candidate.id]: count }));
                        }}
                        type="number"
                        value={quantities[candidate.id] ?? 0}
                      />
                    </label>
                  ))}
                </div>
                <Box color="text-body-secondary">候補は牌種ごとに1か所です。同じ牌が複数ある場合は枚数を調整してください。</Box>
                <Button onClick={applyDetectedCounts}>入力した枚数を役検索に反映</Button>
              </>
            )}
          </>
        ) : null}
      </SpaceBetween>
    </Container>
  );
}
