import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { assetUrl, siteUrl } from "../app/paths";
import { versions } from "../content/versions";
import quickStartMarkdown from "../content/pages/quick-start.md?raw";
import type { SiteVersion, Yaku } from "../content/types";
import { MarkdownContent } from "../components/MarkdownContent";
import { TileHand } from "../components/TileHand";

interface VersionPageProps {
  version: SiteVersion;
}

export function HomePage() {
  return (
    <Container header={<Header variant="h1">AWS麻雀</Header>}>
      <SpaceBetween size="l">
        <ul>
          <li><Link href={siteUrl("quick-start/")}>Quick Start</Link></li>
          <li><Link href={siteUrl("rule/")}>全体ルール</Link></li>
          {versions.map((version) => (
            <li key={version.id}>
              <Link href={siteUrl(`${version.id}/`)}>{version.title}</Link>
            </li>
          ))}
        </ul>
      </SpaceBetween>
    </Container>
  );
}

export function QuickStartPage() {
  return (
    <Container header={<Header variant="h1">3分でわかる！麻雀の遊び方</Header>}>
      <MarkdownContent source={quickStartMarkdown} />
    </Container>
  );
}

export function GeneralRulePage() {
  return (
    <Container header={<Header variant="h1">Rule</Header>}>
      <MarkdownContent source="AWS麻雀の全体ルールです。" />
    </Container>
  );
}

interface DownloadItem {
  id: string;
  title: string;
  url: string;
}

export function DownloadsPage() {
  const items: DownloadItem[] = versions.map((version) => ({
    id: version.id,
    title: version.title,
    url: assetUrl(`${version.assetPath}/output/tile-layout.pdf`),
  }));

  return (
    <Container header={<Header variant="h1">Download</Header>}>
      <SpaceBetween size="m">
        <Box>pdfをダウンロードできます。</Box>
        <Table<DownloadItem>
          items={items}
          columnDefinitions={[
            {
              id: "version",
              header: "version",
              cell: (item) => <Link href={siteUrl(`${item.id}/`)}>{item.title}</Link>,
            },
            {
              id: "download",
              header: "URL",
              cell: (item) => <Link href={item.url}>ダウンロード</Link>,
            },
          ]}
          header={<Header variant="h2">牌山PDF</Header>}
          empty="ダウンロードできるファイルはありません。"
        />
      </SpaceBetween>
    </Container>
  );
}

export function VersionOverviewPage({ version }: VersionPageProps) {
  const pages = [
    { label: "ルール", path: "rule/" },
    { label: "牌一覧", path: "tile/" },
    { label: "役一覧", path: "yaku/" },
    { label: "役検索(BETA)", path: "search/" },
  ];

  return (
    <Container header={<Header variant="h1">{version.title}</Header>}>
      <SpaceBetween size="m">
        <Box>{version.description}</Box>
        <ul>
          {pages.map((page) => (
            <li key={page.path}>
              <Link href={siteUrl(`${version.id}/${page.path}`)}>{page.label}</Link>
            </li>
          ))}
        </ul>
      </SpaceBetween>
    </Container>
  );
}

export function RulesPage({ version }: VersionPageProps) {
  return (
    <Container header={<Header variant="h1">ルール</Header>}>
      <MarkdownContent source={version.rules} assetPath={version.assetPath} />
    </Container>
  );
}

function groupHand(groupId: string, tileIds: string[]): string {
  const suit = tileIds[0]?.slice(-1) ?? groupId;
  return `${tileIds.map((tileId) => tileId.slice(0, -1)).join("")}${suit}`;
}

export function TilesPage({ version }: VersionPageProps) {
  return (
    <Container header={<Header variant="h1">牌一覧</Header>}>
      <SpaceBetween size="l">
        {version.tileGroups.map((group) => (
          <Container key={group.id} header={<Header variant="h2">{group.title}</Header>}>
            <SpaceBetween size="m">
              <Box>{group.description}</Box>
              <TileHand mpsz={groupHand(group.id, group.tiles.map((tile) => tile.id))} assetPath={version.assetPath} />
              <ColumnLayout columns={3} borders="vertical">
                {group.tiles.map((tile) => (
                  <Box key={tile.id} padding="s">
                    {tile.url ? <Link href={tile.url}>{tile.name}</Link> : tile.name}
                  </Box>
                ))}
              </ColumnLayout>
            </SpaceBetween>
          </Container>
        ))}
      </SpaceBetween>
    </Container>
  );
}

function valueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "未設定";
  return String(value);
}

function boolLabel(value: unknown): string {
  if (value === true) return "あり";
  if (value === false || value === null || value === undefined || value === "") return "なし";
  return "未設定";
}

function sampleMpszList(yaku: Yaku): string[] {
  if (Array.isArray(yaku.sampleMpszList) && yaku.sampleMpszList.length > 0) {
    return yaku.sampleMpszList;
  }
  return yaku.compositionExampleMpsz ? [yaku.compositionExampleMpsz] : [];
}

function yakuDescription(yaku: Yaku): string[] {
  if (Array.isArray(yaku.description)) return yaku.description.map(String);
  if (yaku.description === null || yaku.description === undefined || yaku.description === "") return [];
  return [String(yaku.description)];
}

function yakusByHan(yakus: Yaku[]): [string, Yaku[]][] {
  const groups = new Map<string, Yaku[]>();
  for (const yaku of yakus) {
    const key = valueLabel(yaku.han);
    const group = groups.get(key);
    if (group) group.push(yaku);
    else groups.set(key, [yaku]);
  }
  return Array.from(groups.entries());
}

export function YakuPage({ version }: VersionPageProps) {
  return (
    <Container header={<Header variant="h1">役一覧</Header>}>
      <SpaceBetween size="l">
        {yakusByHan(version.yakus).map(([han, yakus]) => (
          <Container key={han} header={<Header variant="h2">{han === "未設定" ? "飜数未設定" : `${han}飜`}</Header>}>
            <SpaceBetween size="l">
              {yakus.map((yaku, index) => {
                const name = valueLabel(yaku.name) === "未設定" ? yaku.id : String(yaku.name);
                const samples = sampleMpszList(yaku);
                const hasOpenHan = yaku.isPonAllowed === true || yaku.isChiAllowed === true;

                return (
                  <section key={`${yaku.id}-${index}`}>
                    <SpaceBetween size="s">
                      <Header variant="h3">{name}</Header>
                      {yakuDescription(yaku).length > 0 && (
                        <div className="yaku-description">
                          {yakuDescription(yaku).map((line, descriptionIndex) => (
                            <p key={`${yaku.id}-description-${descriptionIndex}`}>{line}</p>
                          ))}
                        </div>
                      )}
                      <SpaceBetween direction="horizontal" size="xs">
                        <Badge>ポン: {boolLabel(yaku.isPonAllowed)}</Badge>
                        <Badge>チー: {boolLabel(yaku.isChiAllowed)}</Badge>
                        <Badge>飜数: {valueLabel(yaku.han)}</Badge>
                        {hasOpenHan && <Badge>鳴いた時の飜数: {valueLabel(yaku.hanOpen)}</Badge>}
                        <Badge>複合の有無: {boolLabel(yaku.isCombineAllowed)}</Badge>
                      </SpaceBetween>
                      {samples.map((sample, sampleIndex) => (
                        <TileHand
                          key={`${yaku.id}-sample-${sampleIndex}`}
                          mpsz={sample}
                          assetPath={version.assetPath}
                        />
                      ))}
                    </SpaceBetween>
                    {index < yakus.length - 1 && <hr />}
                  </section>
                );
              })}
            </SpaceBetween>
          </Container>
        ))}
      </SpaceBetween>
    </Container>
  );
}
