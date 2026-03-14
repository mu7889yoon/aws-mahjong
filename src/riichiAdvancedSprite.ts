/**
 * riichi-advanced向けスプライトシートPNG生成モジュール
 *
 * ImageMagickを完全に排除し、@resvg/resvg-js（SVG→PNG変換）と
 * sharp（画像回転・合成・縦結合）のみで全処理を行う。
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { Resvg } from '@resvg/resvg-js';
import sharp = require('sharp');
import {
  SPRITE_BASE_TILE_TEMPLATE,
  replaceSpriteAllPlaceholders,
  LAYOUT_SPECS,
  SPRITE_LAYOUT_SPECS,
} from './template';

// ============================================================================
// スプライトシート寸法定数
// ============================================================================

/** Combined_Tile_PNG幅 */
export const SPRITE_WIDTH = 448;

/** 1行の高さ = Combined_Tile_PNG高さ */
export const SPRITE_ROW_HEIGHT = 256;

/** 総行数 */
export const SPRITE_ROWS = 214;

/** スプライトシート全体の高さ (214 × 256 = 54784) */
export const SPRITE_HEIGHT = SPRITE_ROWS * SPRITE_ROW_HEIGHT;

// ============================================================================
// Upright_PNG寸法（resvgレンダリング結果）
// ============================================================================

/** Upright_PNG幅 */
export const UPRIGHT_TILE_WIDTH = 256;

/** Upright_PNG高さ */
export const UPRIGHT_TILE_HEIGHT = 192;

// ============================================================================
// Sideways_PNG寸法（Upright_PNGをCCW90°回転）
// ============================================================================

/** Sideways_PNG幅 (= UPRIGHT_TILE_HEIGHT) */
export const SIDEWAYS_TILE_WIDTH = 192;

/** Sideways_PNG高さ (= UPRIGHT_TILE_WIDTH) */
export const SIDEWAYS_TILE_HEIGHT = 256;

// ============================================================================
// パス定数
// ============================================================================

/** SVGファイルディレクトリ */
export const TILE_SVG_DIR = 'output';

/** マニフェストJSONパス */
export const TILE_MANIFEST_PATH = 'output/tiles-manifest.json';

/** スプライトシート出力パス */
export const RIICHI_ADVANCED_TILE_SPRITE_PATH = 'output/riichi-advanced-tiles.png';

/** ストックスプライト参照パス */
export const STOCK_TILE_SPRITE_PATH = 'assets/stock-sprite.png';

// ============================================================================
// インターフェース
// ============================================================================

/** スプライトシートの1行分の置換定義 */
export interface SpriteReplacement {
  rowIndex: number;
  spriteTileId: string;
  sourceTileId: string | null;
  kind: 'tile' | 'back' | 'transparent';
}

/** buildRiichiAdvancedAwsSprite のオプション */
export interface BuildRiichiAdvancedAwsSpriteOptions {
  /** スプライトシート出力パス（デフォルト: RIICHI_ADVANCED_TILE_SPRITE_PATH） */
  outputPath?: string;
  /** 個別PNG出力ディレクトリ（指定時のみ出力） */
  individualOutputDir?: string;
  /** マニフェストJSONパス */
  manifestPath?: string;
  /** SVGファイルディレクトリ */
  svgDir?: string;
}

// ============================================================================
// RIICHI_ADVANCED_AWS_REPLACEMENTS（38エントリ）
// ============================================================================

export const RIICHI_ADVANCED_AWS_REPLACEMENTS: SpriteReplacement[] = [
  // 萬子 (rows 0-9)
  { rowIndex: 0,  spriteTileId: '0m', sourceTileId: null, kind: 'transparent' },
  { rowIndex: 1,  spriteTileId: '1m', sourceTileId: '1m', kind: 'tile' },
  { rowIndex: 2,  spriteTileId: '2m', sourceTileId: '2m', kind: 'tile' },
  { rowIndex: 3,  spriteTileId: '3m', sourceTileId: '3m', kind: 'tile' },
  { rowIndex: 4,  spriteTileId: '4m', sourceTileId: '4m', kind: 'tile' },
  { rowIndex: 5,  spriteTileId: '5m', sourceTileId: '5m', kind: 'tile' },
  { rowIndex: 6,  spriteTileId: '6m', sourceTileId: '6m', kind: 'tile' },
  { rowIndex: 7,  spriteTileId: '7m', sourceTileId: '7m', kind: 'tile' },
  { rowIndex: 8,  spriteTileId: '8m', sourceTileId: '8m', kind: 'tile' },
  { rowIndex: 9,  spriteTileId: '9m', sourceTileId: '9m', kind: 'tile' },
  // 筒子 (rows 10-19)
  { rowIndex: 10, spriteTileId: '0p', sourceTileId: null, kind: 'transparent' },
  { rowIndex: 11, spriteTileId: '1p', sourceTileId: '1p', kind: 'tile' },
  { rowIndex: 12, spriteTileId: '2p', sourceTileId: '2p', kind: 'tile' },
  { rowIndex: 13, spriteTileId: '3p', sourceTileId: '3p', kind: 'tile' },
  { rowIndex: 14, spriteTileId: '4p', sourceTileId: '4p', kind: 'tile' },
  { rowIndex: 15, spriteTileId: '5p', sourceTileId: '5p', kind: 'tile' },
  { rowIndex: 16, spriteTileId: '6p', sourceTileId: '6p', kind: 'tile' },
  { rowIndex: 17, spriteTileId: '7p', sourceTileId: '7p', kind: 'tile' },
  { rowIndex: 18, spriteTileId: '8p', sourceTileId: '8p', kind: 'tile' },
  { rowIndex: 19, spriteTileId: '9p', sourceTileId: '9p', kind: 'tile' },
  // 索子 (rows 20-29)
  { rowIndex: 20, spriteTileId: '0s', sourceTileId: null, kind: 'transparent' },
  { rowIndex: 21, spriteTileId: '1s', sourceTileId: '1s', kind: 'tile' },
  { rowIndex: 22, spriteTileId: '2s', sourceTileId: '2s', kind: 'tile' },
  { rowIndex: 23, spriteTileId: '3s', sourceTileId: '3s', kind: 'tile' },
  { rowIndex: 24, spriteTileId: '4s', sourceTileId: '4s', kind: 'tile' },
  { rowIndex: 25, spriteTileId: '5s', sourceTileId: '5s', kind: 'tile' },
  { rowIndex: 26, spriteTileId: '6s', sourceTileId: '6s', kind: 'tile' },
  { rowIndex: 27, spriteTileId: '7s', sourceTileId: '7s', kind: 'tile' },
  { rowIndex: 28, spriteTileId: '8s', sourceTileId: '8s', kind: 'tile' },
  { rowIndex: 29, spriteTileId: '9s', sourceTileId: '9s', kind: 'tile' },
  // 字牌 (rows 30-36)
  { rowIndex: 30, spriteTileId: '1z', sourceTileId: '1z', kind: 'tile' },
  { rowIndex: 31, spriteTileId: '2z', sourceTileId: '2z', kind: 'tile' },
  { rowIndex: 32, spriteTileId: '3z', sourceTileId: '3z', kind: 'tile' },
  { rowIndex: 33, spriteTileId: '4z', sourceTileId: '4z', kind: 'tile' },
  { rowIndex: 34, spriteTileId: '5z', sourceTileId: '5z', kind: 'tile' },
  { rowIndex: 35, spriteTileId: '6z', sourceTileId: '6z', kind: 'tile' },
  { rowIndex: 36, spriteTileId: '7z', sourceTileId: '7z', kind: 'tile' },
  // 裏面牌 (row 44)
  { rowIndex: 44, spriteTileId: '1x', sourceTileId: null, kind: 'back' },
];

// ============================================================================
// RED_DORA_MAPPING
// ============================================================================

/** 赤ドラ個別ファイル生成用マッピング */
export const RED_DORA_MAPPING: Array<{ id: string; sourceTileId: string }> = [
  { id: '0m', sourceTileId: '5m' },
  { id: '0p', sourceTileId: '5p' },
  { id: '0s', sourceTileId: '5s' },
];


// ============================================================================
// Re-export template constants used by generateSpriteTile
// ============================================================================

export { SPRITE_BASE_TILE_TEMPLATE, replaceSpriteAllPlaceholders };

// ============================================================================
// ManifestEntry type for readManifestEntries
// ============================================================================

/** マニフェストエントリ（readManifestEntries が返す Map の値型） */
export interface ManifestEntry {
  id: string;
  filePath?: string;
}

// ============================================================================
// SVG加工関数（既存ロジック移植）
// ============================================================================

/**
 * マニフェストエントリからSVGファイルパスを解決する。
 * `{tileId}.svg` ファイル名を優先して解決する。
 *
 * @param svgDir SVGファイルディレクトリ
 * @param entry マニフェストエントリ
 * @returns 解決されたSVGファイルパス
 */
export function resolveTileSvgPath(svgDir: string, entry: ManifestEntry): string {
  return path.join(svgDir, `${entry.id}.svg`);
}

/**
 * マニフェストJSONを読み込み、Map<string, ManifestEntry> として返す。
 *
 * @param manifestPath マニフェストJSONファイルパス
 * @returns tileId → ManifestEntry のマップ
 */
export async function readManifestEntries(
  manifestPath: string
): Promise<Map<string, ManifestEntry>> {
  const content = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(content) as { tiles: ManifestEntry[] };
  const entries = new Map<string, ManifestEntry>();
  for (const tile of manifest.tiles) {
    entries.set(tile.id, tile);
  }
  return entries;
}

/**
 * マニフェストからtileIdに対応するSVGファイルを読み込む。
 * `{tileId}.svg` ファイル名を優先して解決する。
 *
 * @param manifestEntries マニフェストエントリのマップ
 * @param svgDir SVGファイルディレクトリ
 * @param tileId 牌ID
 * @returns SVG文字列
 */
export async function readTileSvg(
  manifestEntries: Map<string, ManifestEntry>,
  svgDir: string,
  tileId: string
): Promise<string> {
  const entry = manifestEntries.get(tileId);
  if (!entry) {
    throw new Error(`Manifest entry not found for tileId: ${tileId}`);
  }
  const svgPath = resolveTileSvgPath(svgDir, entry);
  return fs.readFile(svgPath, 'utf-8');
}

/**
 * SVGから `id="service-name-placeholder"` のtext要素を除去する。
 * 牌種類ラベルとアイコンは保持する。冪等性を持つ（2回適用しても結果は同じ）。
 *
 * @param svg SVG文字列
 * @returns サービス名を除去したSVG文字列
 */
export function stripServiceNameFromTileSvg(svg: string): string {
  return svg.replace(/<text[^>]*id="service-name-placeholder"[^>]*>[\s\S]*?<\/text>/g, '');
}

/**
 * 牌表面背景（グラデーション、ボーダー、シャドウ、ハイライト）を追加する。
 * viewBoxは68×96のまま保持し、192×256へのスケーリングはresvgレンダリング時に行う。
 *
 * @param rawSvg 元の68×96 viewBoxのSVG
 * @returns 背景装飾を追加したSVG文字列
 */
export function addTileFaceBackground(rawSvg: string): string {
  // 元のSVGの <svg ...> 開始タグの直後に背景要素を挿入する
  const backgroundMarkup = `
  <defs>
    <linearGradient id="aws-tile-front-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#faf7f2" />
      <stop offset="100%" stop-color="#f1ebe4" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="68" height="96" fill="#f1ebe4" />
  <rect x="0" y="0" width="68" height="96" rx="8" fill="url(#aws-tile-front-gradient)" />
  <rect x="1.4" y="1.4" width="65.2" height="93.2" rx="7" fill="none" stroke="#e6ddd4" stroke-width="1" />
  <rect x="0" y="0" width="7" height="96" rx="8" fill="#e8ddd1" opacity="0.95" />
  <rect x="0" y="83" width="68" height="8" fill="#e3d7ca" opacity="0.7" />
  <rect x="3" y="3" width="62" height="2" rx="1" fill="#ffffff" opacity="0.75" />`;

  // <svg ...> タグの終了位置を見つけて、その直後に背景を挿入
  const svgTagMatch = rawSvg.match(/<svg\b[^>]*>/);
  if (!svgTagMatch || svgTagMatch.index === undefined) {
    throw new Error('Invalid SVG: no <svg> opening tag found');
  }
  const insertPos = svgTagMatch.index + svgTagMatch[0].length;

  return rawSvg.slice(0, insertPos) + backgroundMarkup + rawSvg.slice(insertPos);
}

/**
 * 裏面牌のSVGを生成する。
 * 192×256 viewBoxのSVGを返す。
 *
 * @returns 裏面牌SVG文字列
 */
export function buildBackFaceSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="256" viewBox="0 0 192 256">
  <defs>
    <clipPath id="tile-clip">
      <rect x="0" y="0" width="192" height="256" rx="22" ry="22" />
    </clipPath>
  </defs>
  <g clip-path="url(#tile-clip)">
    <rect x="0" y="0" width="192" height="256" fill="#f1974d" />
    <rect x="10" y="10" width="172" height="236" rx="14" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.5" />
  </g>
</svg>`;
}

/**
 * スプライト用の牌SVGを生成
 *
 * 192×256 viewBox の SPRITE_BASE_TILE_TEMPLATE を使用し、
 * 170×170 のアイコンエリアにスケーリングして埋め込む。
 *
 * sprite-base-tile テンプレートはサービス名を含まないため、
 * stripServiceNameFromTileSvg は不要。
 *
 * @param tileSvg 生成済みの 68×96 viewBox 牌SVG（icon-placeholder 内にアイコンが埋め込み済み）
 * @returns 192×256 viewBox のスプライト用SVG文字列
 */
export function generateSpriteTile(tileSvg: string): string {
  // 牌種類ラベルを抽出
  const tileTypeMatch = tileSvg.match(
    /<text[^>]*id="tile-type-placeholder"[^>]*>([\s\S]*?)<\/text>/
  );
  const tileType = tileTypeMatch?.[1]?.trim() ?? '';

  // サービス名を抽出
  const serviceNameMatch = tileSvg.match(
    /<text[^>]*id="service-name-placeholder"[^>]*>([\s\S]*?)<\/text>/
  );
  const serviceName = serviceNameMatch?.[1]?.trim() ?? '';

  // icon-placeholder グループの中身を抽出（ネストされた<g>タグに対応）
  let iconContent = '';
  const iconStartMatch = tileSvg.match(/<g id="icon-placeholder"[^>]*>/);
  if (iconStartMatch && iconStartMatch.index !== undefined) {
    const contentStart = iconStartMatch.index + iconStartMatch[0].length;
    // ネストされた<g>タグを正しくカウントして、icon-placeholderの閉じ</g>を見つける
    let depth = 1;
    const gOpenRegex = /<g[\s>]/g;
    const gCloseRegex = /<\/g>/g;
    // 全ての<g>開始と</g>終了の位置を収集
    const events: Array<{ pos: number; type: 'open' | 'close' }> = [];
    gOpenRegex.lastIndex = contentStart;
    gCloseRegex.lastIndex = contentStart;
    let m: RegExpExecArray | null;
    while ((m = gOpenRegex.exec(tileSvg)) !== null) {
      events.push({ pos: m.index, type: 'open' });
    }
    while ((m = gCloseRegex.exec(tileSvg)) !== null) {
      events.push({ pos: m.index, type: 'close' });
    }
    events.sort((a, b) => a.pos - b.pos);
    let contentEnd = tileSvg.length;
    for (const event of events) {
      if (event.type === 'open') {
        depth++;
      } else {
        depth--;
        if (depth === 0) {
          contentEnd = event.pos;
          break;
        }
      }
    }
    const innerContent = tileSvg.slice(contentStart, contentEnd).trim();
    if (innerContent) {
      // 170/60 ≈ 2.8333 のスケールで拡大
      const rescale = SPRITE_LAYOUT_SPECS.icon.width / LAYOUT_SPECS.icon.width;
      iconContent = `<g transform="scale(${rescale.toFixed(4)})">${innerContent}</g>`;
    }
  }

  return replaceSpriteAllPlaceholders(SPRITE_BASE_TILE_TEMPLATE, {
    tileType,
    serviceName,
    iconContent,
  });
}

// ============================================================================
// SVG→PNG変換
// ============================================================================

/**
 * resvgを使用してSVG文字列をPNGバッファに変換する。
 *
 * `fitTo: { mode: 'width', value }` を指定し、192×256 viewBoxのSVGを
 * 256×192ピクセルのPNGにレンダリングする。
 *
 * Requirements: 2.1, 2.2, 2.3, 8.1
 *
 * @param svgString SVG文字列
 * @param options オプション（width: レンダリング幅、デフォルト UPRIGHT_TILE_WIDTH=256）
 * @returns PNGバッファ
 */
export async function renderSvgToPngBuffer(
  svgString: string,
  options?: { width?: number; height?: number }
): Promise<Buffer> {
  // SVGのviewBox高さに合わせてレンダリング（192×256 SVG → 192×256 PNG）
  // SPRITE_BASE_TILE_TEMPLATE は 192×256 viewBox なので、
  // height=256 でフィットさせると 192×256 PNG が得られる
  const height = options?.height ?? SPRITE_ROW_HEIGHT;

  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'height', value: height },
  });

  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

/**
 * Upright_PNG（256×192）からCombined_Tile_PNG（448×256）を生成する。
 *
 * 処理手順:
 * 1. Upright_PNGをsharpで読み込み
 * 2. sharp.rotate(-90) で反時計回り90°回転 → Sideways_PNG（192×256）
 * 3. 448×256の透明キャンバスを作成
 * 4. Upright_PNG（256×192）を左上 (0, 0) に合成（下部64pxは透明パディング）
 * 5. Sideways_PNG（192×256）を右側 (256, 0) に合成
 * 6. PNGバッファとして返す
 *
 * @param uprightPngBuffer Upright_PNG（256×192）のバッファ
 * @returns Combined_Tile_PNG（448×256）のPNGバッファ
 */
export async function buildCombinedTilePng(uprightPngBuffer: Buffer): Promise<Buffer> {
  // Upright_PNGの実際の寸法を取得
  const uprightMeta = await sharp(uprightPngBuffer).metadata();
  const uprightWidth = uprightMeta.width!;

  // Upright_PNGを反時計回り90°回転 → Sideways_PNG
  const sidewaysPngBuffer = await sharp(uprightPngBuffer)
    .rotate(-90)
    .toBuffer();

  // 448×256の透明キャンバスにUpright_PNGとSideways_PNGを合成
  return sharp({
    create: {
      width: SPRITE_WIDTH,
      height: SPRITE_ROW_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: uprightPngBuffer, left: 0, top: 0 },
      { input: sidewaysPngBuffer, left: uprightWidth, top: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * 1つのSpriteReplacementエントリからCombined_Tile_PNGバッファを生成する。
 *
 * - kind: 'tile': SVG読み込み → addTileFaceBackground → generateSpriteTile → renderSvgToPngBuffer → buildCombinedTilePng
 * - kind: 'back': buildBackFaceSvg → renderSvgToPngBuffer → buildCombinedTilePng
 * - kind: 'transparent': sharpで448×256の透明PNGバッファを生成
 *
 * @param replacement SpriteReplacementエントリ
 * @param manifestEntries マニフェストエントリのMap
 * @param svgDir SVGファイルディレクトリ
 * @returns Combined_Tile_PNG（448×256）のPNGバッファ
 */
export async function buildReplacementRow(
  replacement: SpriteReplacement,
  manifestEntries: Map<string, ManifestEntry>,
  svgDir: string
): Promise<Buffer> {
  switch (replacement.kind) {
    case 'tile': {
      const rawSvg = await readTileSvg(manifestEntries, svgDir, replacement.sourceTileId!);
      const withBackground = addTileFaceBackground(rawSvg);
      const spriteSvg = generateSpriteTile(withBackground);
      const uprightPng = await renderSvgToPngBuffer(spriteSvg);
      return buildCombinedTilePng(uprightPng);
    }
    case 'back': {
      const backSvg = buildBackFaceSvg();
      const uprightPng = await renderSvgToPngBuffer(backSvg);
      return buildCombinedTilePng(uprightPng);
    }
    case 'transparent': {
      return sharp({
        create: {
          width: SPRITE_WIDTH,
          height: SPRITE_ROW_HEIGHT,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer();
    }
  }
}


/**
 * 全行のPNGバッファを受け取り、sharpのcompositeで縦結合してスプライトシートを生成する。
 *
 * - 448×54784の透明キャンバスを作成
 * - rowBuffers に含まれる行のみを composite で配置（top: rowIndex * SPRITE_ROW_HEIGHT）
 * - rowBuffers に含まれない行は透明のまま
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.3
 *
 * @param rowBuffers 行インデックス → PNGバッファのマップ
 * @returns スプライトシートPNGバッファ (448×54784)
 */
export async function composeSpriteSheet(
  rowBuffers: Map<number, Buffer>
): Promise<Buffer> {
  // composite 入力を構築（rowBuffers に含まれる行のみ）
  const compositeInputs: sharp.OverlayOptions[] = [];
  for (const [rowIndex, buffer] of rowBuffers) {
    compositeInputs.push({
      input: buffer,
      top: rowIndex * SPRITE_ROW_HEIGHT,
      left: 0,
    });
  }

  // 448×54784 の透明キャンバスを作成し、各行を composite で配置
  return sharp({
    create: {
      width: SPRITE_WIDTH,
      height: SPRITE_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();
}


/**
 * メインエントリポイント。全処理を統括する。
 *
 * 1. マニフェスト読み込み
 * 2. RIICHI_ADVANCED_AWS_REPLACEMENTS の各エントリに対して buildReplacementRow を実行
 * 3. individualOutputDir 指定時: 各行PNGを個別ファイルとして保存
 * 4. individualOutputDir 指定時: RED_DORA_MAPPING に基づいて赤ドラ個別ファイルを生成
 * 5. composeSpriteSheet でスプライトシートを生成・保存（Task 8.2で追加予定）
 *
 * Requirements: 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3
 *
 * @param options ビルドオプション
 */
export async function buildRiichiAdvancedAwsSprite(
  options?: BuildRiichiAdvancedAwsSpriteOptions
): Promise<void> {
  const manifestPath = options?.manifestPath ?? TILE_MANIFEST_PATH;
  const svgDir = options?.svgDir ?? TILE_SVG_DIR;
  const individualOutputDir = options?.individualOutputDir;

  // 1. マニフェスト読み込み
  const manifestEntries = await readManifestEntries(manifestPath);

  // 2. 各エントリに対して buildReplacementRow を実行し、結果を Map に収集
  const rowBuffers = new Map<number, Buffer>();
  for (const entry of RIICHI_ADVANCED_AWS_REPLACEMENTS) {
    const buffer = await buildReplacementRow(entry, manifestEntries, svgDir);
    rowBuffers.set(entry.rowIndex, buffer);
  }

  // 3. individualOutputDir 指定時: 個別ファイル出力
  if (individualOutputDir) {
    // 出力ディレクトリを再帰的に作成
    await fs.mkdir(individualOutputDir, { recursive: true });

    // 各行PNGを {spriteTileId}.png として保存
    for (const entry of RIICHI_ADVANCED_AWS_REPLACEMENTS) {
      const buffer = rowBuffers.get(entry.rowIndex)!;
      const filePath = path.join(individualOutputDir, `${entry.spriteTileId}.png`);
      await fs.writeFile(filePath, buffer);
    }

    // RED_DORA_MAPPING に基づいて赤ドラ個別ファイルを生成
    for (const mapping of RED_DORA_MAPPING) {
      const rawSvg = await readTileSvg(manifestEntries, svgDir, mapping.sourceTileId);
      const withBackground = addTileFaceBackground(rawSvg);
      const spriteSvg = generateSpriteTile(withBackground);
      const uprightPng = await renderSvgToPngBuffer(spriteSvg);
      const combinedPng = await buildCombinedTilePng(uprightPng);
      const filePath = path.join(individualOutputDir, `${mapping.id}.png`);
      await fs.writeFile(filePath, combinedPng);
    }
  }

  // 4. スプライトシート生成・保存
  const outputPath = options?.outputPath ?? RIICHI_ADVANCED_TILE_SPRITE_PATH;
  const spriteSheet = await composeSpriteSheet(rowBuffers);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, spriteSheet);
}

