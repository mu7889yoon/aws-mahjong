import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useMemo, useState } from "react";
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
  tileLabel,
  toMpsz,
  totalTileCount,
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

      <ColumnLayout columns={2} borders="vertical" minColumnWidth={320}>
        <Container header={<Header variant="h2">牌を選ぶ</Header>}>
          <SpaceBetween size="l">
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
