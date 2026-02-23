/**
 * AWS麻雀牌 - SVGジェネレーター
 * 
 * 牌のSVGデータを生成するモジュール
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */

import { promises as fs } from 'fs';
import {
  TileEntry,
  TileType,
  TileConfig,
  TileManifest,
  TileManifestEntry,
  TILE_TYPE_NAMES,
  HONOR_TILE_NAMES,
  OutputFormat,
} from './types';
import {
  replaceAllPlaceholders,
  LAYOUT_SPECS,
} from './template';

// ============================================================================
// 定数 (Constants)
// ============================================================================

/**
 * アイコンエリアのデフォルトサイズ（px）
 */
export const DEFAULT_ICON_AREA = {
  width: LAYOUT_SPECS.icon.width,
  height: LAYOUT_SPECS.icon.height,
} as const;

// ============================================================================
// 牌種類ラベル取得 (Tile Type Label)
// ============================================================================

/**
 * 牌エントリから表示用ラベルを取得
 * 
 * - 数牌（萬子、筒子、索子）: 番号 + 種類名（例: "1萬", "5筒", "9索"）
 * - 字牌: 字牌名（例: "東", "南", "白", "中"）
 * - カスタムラベルが設定されている場合はそれを使用
 * 
 * @param entry 牌エントリ
 * @returns 表示用ラベル
 */
export function getTileTypeLabel(entry: TileEntry): string {
  // カスタムラベルが設定されている場合はそれを使用
  if (entry.display?.typeLabel) {
    return entry.display.typeLabel;
  }

  // 字牌の場合は字牌名を返す
  if (entry.type === 'z') {
    return HONOR_TILE_NAMES[entry.number] || `${entry.number}z`;
  }

  // 数牌の場合は番号 + 種類の短縮名を返す
  const typeShortNames: Record<TileType, string> = {
    m: '萬',
    p: '筒',
    s: '索',
    z: '',
  };

  return `${entry.number}${typeShortNames[entry.type]}`;
}

/**
 * 牌種類の完全な日本語名を取得
 * 
 * @param type 牌種類
 * @returns 日本語名（例: "萬子", "筒子", "索子", "字牌"）
 */
export function getTileTypeName(type: TileType): string {
  return TILE_TYPE_NAMES[type];
}

// ============================================================================
// アイコン読み込み (Icon Loading)
// ============================================================================

/**
 * アイコンSVGファイルを読み込む
 * 
 * @param iconPath アイコンファイルのパス
 * @returns アイコンSVGコンテンツ
 * @throws アイコンファイルが見つからない場合
 */
export async function loadIcon(iconPath: string): Promise<string> {
  try {
    const content = await fs.readFile(iconPath, 'utf-8');
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`アイコンファイルの読み込みに失敗しました: ${iconPath} - ${errorMessage}`);
  }
}

/**
 * アイコンSVGファイルを同期的に読み込む（テスト用）
 * 
 * @param iconPath アイコンファイルのパス
 * @returns アイコンSVGコンテンツ
 * @throws アイコンファイルが見つからない場合
 */
export function loadIconSync(iconPath: string): string {
  const fsSync = require('fs');
  try {
    return fsSync.readFileSync(iconPath, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`アイコンファイルの読み込みに失敗しました: ${iconPath} - ${errorMessage}`);
  }
}

// ============================================================================
// アイコンスケーリング (Icon Scaling)
// ============================================================================

/**
 * SVGアイコンのviewBox情報を抽出
 * 
 * @param iconContent アイコンSVGコンテンツ
 * @returns viewBox情報 { minX, minY, width, height } または null
 */
export function extractViewBox(iconContent: string): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} | null {
  // viewBox属性を抽出
  const viewBoxMatch = iconContent.match(/viewBox=["']([^"']+)["']/);
  if (viewBoxMatch && viewBoxMatch[1]) {
    const parts = viewBoxMatch[1].split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      const [minX, minY, width, height] = parts as [number, number, number, number];
      return {
        minX,
        minY,
        width,
        height,
      };
    }
  }

  // width/height属性から推測
  const widthMatch = iconContent.match(/width=["'](\d+(?:\.\d+)?)/);
  const heightMatch = iconContent.match(/height=["'](\d+(?:\.\d+)?)/);
  
  if (widthMatch && heightMatch && widthMatch[1] && heightMatch[1]) {
    const width = parseFloat(widthMatch[1]);
    const height = parseFloat(heightMatch[1]);
    if (!isNaN(width) && !isNaN(height)) {
      return { minX: 0, minY: 0, width, height };
    }
  }

  return null;
}

/**
 * アイコンを指定サイズにフィットするようにスケーリング
 * アスペクト比を維持しながら、指定エリア内に収まるようにスケーリングします。
 * 
 * Requirements: 3.5 - アスペクト比を維持しながらスケーリング
 * 
 * @param iconContent アイコンSVGコンテンツ
 * @param targetWidth 目標幅（px）
 * @param targetHeight 目標高さ（px）
 * @returns スケーリングされたアイコンSVGコンテンツ
 */
export function scaleIconToFit(
  iconContent: string,
  targetWidth: number = DEFAULT_ICON_AREA.width,
  targetHeight: number = DEFAULT_ICON_AREA.height
): string {
  // 空のコンテンツの場合はそのまま返す
  if (!iconContent || iconContent.trim() === '') {
    return '';
  }

  // viewBox情報を抽出
  const viewBox = extractViewBox(iconContent);
  
  // viewBoxが取得できない場合は、そのままラップして返す
  if (!viewBox || viewBox.width === 0 || viewBox.height === 0) {
    return `<g>${extractSvgContent(iconContent)}</g>`;
  }

  // アスペクト比を維持しながらスケール係数を計算
  const scaleX = targetWidth / viewBox.width;
  const scaleY = targetHeight / viewBox.height;
  const scale = Math.min(scaleX, scaleY);

  // スケーリング後のサイズ
  const scaledWidth = viewBox.width * scale;
  const scaledHeight = viewBox.height * scale;

  // 中央配置のためのオフセット
  const offsetX = (targetWidth - scaledWidth) / 2;
  const offsetY = (targetHeight - scaledHeight) / 2;

  // SVGコンテンツを抽出（<svg>タグを除去）
  const innerContent = extractSvgContent(iconContent);

  // スケーリングと中央配置を適用したグループでラップ
  return `<g transform="translate(${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}) scale(${scale.toFixed(4)})">${innerContent}</g>`;
}

/**
 * SVGコンテンツから内部要素を抽出（<svg>タグを除去）
 * 
 * @param svgContent SVGコンテンツ
 * @returns 内部要素のみ
 */
export function extractSvgContent(svgContent: string): string {
  // XML宣言を除去
  let content = svgContent.replace(/<\?xml[^?]*\?>/gi, '');
  
  // DOCTYPE宣言を除去
  content = content.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // コメントを除去
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  
  // <svg>タグの開始と終了を除去
  const svgStartMatch = content.match(/<svg[^>]*>/i);
  const svgEndMatch = content.match(/<\/svg>/i);
  
  if (svgStartMatch && svgEndMatch) {
    const startIndex = content.indexOf(svgStartMatch[0]) + svgStartMatch[0].length;
    const endIndex = content.lastIndexOf(svgEndMatch[0]);
    content = content.substring(startIndex, endIndex);
  }
  
  return content.trim();
}

// ============================================================================
// 牌生成 (Tile Generation)
// ============================================================================

/**
 * 単一の牌SVGを生成
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.5
 * - 3.1: 有効なTileConfigから各牌エントリのSVGファイルを生成
 * - 3.2: 指定されたService_IconをBase_Tileに埋め込む
 * - 3.3: サービス名テキストをBase_Tileに埋め込む
 * - 3.5: アイコンをアスペクト比を維持しながらスケーリング
 * 
 * @param entry 牌エントリ
 * @param template SVGテンプレート文字列
 * @param iconContent アイコンSVGコンテンツ（オプション、指定しない場合はプレースホルダー）
 * @returns 生成されたSVG文字列
 */
export function generateTile(
  entry: TileEntry,
  template: string,
  iconContent?: string
): string {
  // 牌種類ラベルを取得
  const tileTypeLabel = getTileTypeLabel(entry);
  
  // サービス名を取得
  const serviceName = entry.awsService.displayName;
  
  // アイコンコンテンツを処理
  let processedIconContent: string;
  
  if (iconContent && iconContent.trim() !== '') {
    // アイコンスケールを取得（デフォルト: 1.0）
    const iconScale = entry.display?.iconScale ?? 1.0;
    const targetWidth = DEFAULT_ICON_AREA.width * iconScale;
    const targetHeight = DEFAULT_ICON_AREA.height * iconScale;
    
    // アイコンをスケーリング
    processedIconContent = scaleIconToFit(iconContent, targetWidth, targetHeight);
  } else {
    // アイコンがない場合はプレースホルダーテキスト
    processedIconContent = `<text x="20" y="24" font-family="sans-serif" font-size="6" text-anchor="middle" fill="#999999">${entry.awsService.id}</text>`;
  }
  
  // テンプレートにすべてのプレースホルダーを置換
  const generatedSvg = replaceAllPlaceholders(template, {
    tileType: tileTypeLabel,
    serviceName: serviceName,
    iconContent: processedIconContent,
  });
  
  return generatedSvg;
}

/**
 * 牌エントリとアイコンコンテンツから牌SVGを非同期で生成
 * アイコンファイルを自動的に読み込みます。
 * 
 * @param entry 牌エントリ
 * @param template SVGテンプレート文字列
 * @returns 生成されたSVG文字列
 */
export async function generateTileWithIcon(
  entry: TileEntry,
  template: string
): Promise<string> {
  let iconContent: string | undefined;
  
  try {
    iconContent = await loadIcon(entry.awsService.iconPath);
  } catch {
    // アイコンが読み込めない場合はundefinedのまま
    iconContent = undefined;
  }
  
  return generateTile(entry, template, iconContent);
}

// ============================================================================
// ファイル名生成 (Filename Generation)
// ============================================================================

/**
 * MPSZ形式のファイル名を生成
 * 
 * Requirements: 3.4 - MPSZ形式のファイル命名規則
 * 
 * @param entry 牌エントリ
 * @returns ファイル名（例: "1m.svg", "5p.svg", "7z.svg"）
 */
export function generateFilename(entry: TileEntry): string {
  return `${entry.number}${entry.type}.svg`;
}

/**
 * 牌IDからファイル名を生成
 * 
 * @param tileId 牌ID（MPSZ形式、例: "1m", "5p", "7z"）
 * @returns ファイル名（例: "1m.svg"）
 */
export function generateFilenameFromId(tileId: string): string {
  return `${tileId}.svg`;
}

/**
 * MPSZ形式のPNGファイル名を生成
 * 
 * Requirements: 6.1, 6.2 - PNGファイル名を `{number}{type}.png` 形式で生成
 * SVGファイル名の拡張子を `.svg` から `.png` に変更したものと一致する
 * 
 * @param entry 牌エントリ
 * @returns PNGファイル名（例: "1m.png", "5p.png", "7z.png"）
 */
export function generatePngFilename(entry: TileEntry): string {
  return `${entry.number}${entry.type}.png`;
}

// ============================================================================
// ファイル出力処理 (File Output Processing)
// ============================================================================

import * as path from 'path';

/**
 * 出力ディレクトリを確保（存在しない場合は作成）
 * 
 * Requirements: 4.1 - 設定可能な出力ディレクトリへの出力
 * 
 * @param outputDir 出力ディレクトリのパス
 * @throws ディレクトリの作成に失敗した場合
 */
export async function ensureOutputDirectory(outputDir: string): Promise<void> {
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`出力ディレクトリの作成に失敗しました: ${outputDir} - ${errorMessage}`);
  }
}

/**
 * 牌エントリの出力ファイルパスを取得
 * 
 * Requirements: 3.4 - MPSZ形式のファイル命名規則
 * Requirements: 4.1 - 設定可能な出力ディレクトリへの出力
 * 
 * @param outputDir 出力ディレクトリのパス
 * @param entry 牌エントリ
 * @returns 完全な出力ファイルパス（例: "output/1m.svg"）
 */
export function getOutputPath(outputDir: string, entry: TileEntry): string {
  const filename = generateFilename(entry);
  return path.join(outputDir, filename);
}

/**
 * SVGコンテンツをファイルに書き込む
 * 
 * Requirements: 3.4 - MPSZ形式のファイル命名規則
 * Requirements: 4.1 - 設定可能な出力ディレクトリへの出力
 * Requirements: 4.3 - 再生成時のファイル上書き
 * 
 * @param svgContent SVGコンテンツ
 * @param outputDir 出力ディレクトリのパス
 * @param filename ファイル名（例: "1m.svg"）
 * @throws ファイルの書き込みに失敗した場合
 */
export async function writeTileSvg(
  svgContent: string,
  outputDir: string,
  filename: string
): Promise<void> {
  const filePath = path.join(outputDir, filename);
  
  try {
    await fs.writeFile(filePath, svgContent, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SVGファイルの書き込みに失敗しました: ${filePath} - ${errorMessage}`);
  }
}


// ============================================================================
// マニフェスト生成 (Manifest Generation)
// ============================================================================

/**
 * マニフェストファイル名
 */
export const MANIFEST_FILENAME = 'tiles-manifest.json';

/**
 * マニフェストバージョン
 */
export const MANIFEST_VERSION = '1.0.0';

/**
 * 牌エントリからマニフェストエントリを作成
 * 
 * Requirements: 4.1, 4.2, 4.3 - マニフェストファイルの生成（形式に応じたパス設定）
 * 
 * 形式に応じた `filePath` と `pngFilePath` の設定:
 * - `'svg'` (デフォルト): `filePath` = SVGパス (.svg), `pngFilePath` = undefined
 * - `'png'`: `filePath` = PNGパス (.png), `pngFilePath` = undefined
 * - `'svg,png'`: `filePath` = SVGパス (.svg), `pngFilePath` = PNGパス (.png)
 * 
 * @param entry 牌エントリ
 * @param outputDir 出力ディレクトリのパス
 * @param format 出力形式（デフォルト: 'svg'）
 * @returns マニフェストエントリ
 */
export function createManifestEntry(entry: TileEntry, outputDir: string, format: OutputFormat = 'svg'): TileManifestEntry {
  const svgFilename = generateFilename(entry);
  const pngFilename = generatePngFilename(entry);

  let filePath: string;
  let pngFilePath: string | undefined;

  switch (format) {
    case 'png':
      // PNG形式のみ: filePathにPNGパスを設定、pngFilePathは省略
      filePath = path.join(outputDir, pngFilename);
      pngFilePath = undefined;
      break;
    case 'svg,png':
      // SVG+PNG形式: filePathにSVGパス、pngFilePathにPNGパスを設定
      filePath = path.join(outputDir, svgFilename);
      pngFilePath = path.join(outputDir, pngFilename);
      break;
    case 'svg':
    default:
      // SVG形式のみ（デフォルト）: filePathにSVGパスを設定、pngFilePathは省略
      filePath = path.join(outputDir, svgFilename);
      pngFilePath = undefined;
      break;
  }

  const manifestEntry: TileManifestEntry = {
    id: entry.id,
    type: entry.type,
    number: entry.number,
    filePath: filePath,
    awsService: {
      id: entry.awsService.id,
      displayName: entry.awsService.displayName,
    },
  };

  if (pngFilePath !== undefined) {
    manifestEntry.pngFilePath = pngFilePath;
  }

  return manifestEntry;
}

/**
 * TileConfigから完全なマニフェストを作成
 * 
 * Requirements: 4.1, 4.2, 4.3 - マニフェストファイルの生成（形式に応じたパス設定）
 * 
 * @param config 牌設定
 * @param outputDir 出力ディレクトリのパス
 * @param format 出力形式（デフォルト: 'svg'）
 * @returns 牌マニフェスト
 */
export function createManifest(config: TileConfig, outputDir: string, format?: OutputFormat): TileManifest {
  const effectiveFormat: OutputFormat = format ?? 'svg';
  const tiles = config.tiles.map((entry) => createManifestEntry(entry, outputDir, effectiveFormat));
  
  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    tileCount: tiles.length,
    tiles: tiles,
  };
}

/**
 * マニフェストをJSONファイルとして書き込む
 * 
 * Requirements: 4.2 - マニフェストファイルの生成
 * 
 * @param manifest 牌マニフェスト
 * @param outputDir 出力ディレクトリのパス
 * @throws ファイルの書き込みに失敗した場合
 */
export async function writeManifest(manifest: TileManifest, outputDir: string): Promise<void> {
  const manifestPath = path.join(outputDir, MANIFEST_FILENAME);
  const jsonContent = JSON.stringify(manifest, null, 2);
  
  try {
    await fs.writeFile(manifestPath, jsonContent, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`マニフェストファイルの書き込みに失敗しました: ${manifestPath} - ${errorMessage}`);
  }
}

// ============================================================================
// バッチ生成 (Batch Generation)
// ============================================================================

import { validateTileConfig } from './validator';
import { GenerationResult, GenerationError } from './types';
import { BASE_TILE_TEMPLATE } from './template';
import { convertSvgToPng, writeTilePng } from './png-converter';

/**
 * 指定された形式にSVGが含まれるかどうかを判定
 * @param format 出力形式
 * @returns SVGが含まれる場合はtrue
 */
function includesSvg(format: OutputFormat): boolean {
  return format === 'svg' || format === 'svg,png';
}

/**
 * 指定された形式にPNGが含まれるかどうかを判定
 * @param format 出力形式
 * @returns PNGが含まれる場合はtrue
 */
function includesPng(format: OutputFormat): boolean {
  return format === 'png' || format === 'svg,png';
}

/**
 * 全牌を一括生成
 * 
 * Requirements: 1.1 - 指定された形式で牌画像を生成
 * Requirements: 3.1 - PNGファイルをMPSZ形式のファイル名で出力
 * Requirements: 3.2 - SVGとPNGの両方を同じ出力ディレクトリに生成
 * Requirements: 3.4 - PNGファイル書き込みエラー時も残りの牌の生成を継続
 * Requirements: 4.4 - バッチ生成コマンド
 * Requirements: 4.5 - 生成結果レポート
 * Requirements: 5.1, 5.2 - 形式ごとの生成数をレポート
 * 
 * @param config 牌設定
 * @param outputDir 出力ディレクトリのパス
 * @param format 出力形式（デフォルト: 'svg'）
 * @returns 生成結果（成功数、失敗数、エラー、マニフェスト）
 */
export async function generateAll(
  config: TileConfig,
  outputDir: string,
  format?: OutputFormat,
  options?: { scale?: number }
): Promise<GenerationResult> {
  const effectiveFormat: OutputFormat = format ?? 'svg';
  const errors: GenerationError[] = [];
  let generated = 0;
  let failed = 0;

  // 1. 設定の検証
  const validationResult = validateTileConfig(config);
  if (!validationResult.valid) {
    // バリデーションエラーをGenerationErrorに変換
    const validationErrors: GenerationError[] = validationResult.errors.map((err) => ({
      tileId: err.tileId || 'config',
      message: err.message,
      type: 'unknown' as const,
    }));

    // 空のマニフェストを作成
    const emptyManifest: TileManifest = {
      version: MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      tileCount: 0,
      tiles: [],
    };

    return {
      success: false,
      generated: 0,
      failed: validationResult.errors.length,
      errors: validationErrors,
      manifest: emptyManifest,
      format: effectiveFormat,
    };
  }

  // 2. 出力ディレクトリの作成
  try {
    await ensureOutputDirectory(outputDir);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const emptyManifest: TileManifest = {
      version: MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      tileCount: 0,
      tiles: [],
    };

    return {
      success: false,
      generated: 0,
      failed: 1,
      errors: [{
        tileId: 'output_dir',
        message: `出力ディレクトリの作成に失敗しました: ${errorMessage}`,
        type: 'output_error',
      }],
      manifest: emptyManifest,
      format: effectiveFormat,
    };
  }

  // 3. 各牌のSVG/PNGを生成して書き込み
  for (const entry of config.tiles) {
    try {
      // アイコンを読み込み（失敗してもSVG生成は続行）
      let iconContent: string | undefined;
      try {
        iconContent = await loadIcon(entry.awsService.iconPath);
      } catch {
        // アイコンが読み込めない場合はundefinedのまま（プレースホルダーが使用される）
        errors.push({
          tileId: entry.id,
          message: `アイコンファイルが見つかりません: ${entry.awsService.iconPath}`,
          type: 'icon_not_found',
        });
      }

      // SVG文字列を生成（常に実行 - PNG変換にも必要）
      const svgContent = generateTile(entry, BASE_TILE_TEMPLATE, iconContent);

      // 少なくとも1つの形式が正常に書き込まれたかを追跡
      let tileWrittenSuccessfully = false;

      // SVG形式が含まれる場合: SVGファイルを書き込み
      if (includesSvg(effectiveFormat)) {
        try {
          const svgFilename = generateFilename(entry);
          await writeTileSvg(svgContent, outputDir, svgFilename);
          tileWrittenSuccessfully = true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({
            tileId: entry.id,
            message: `SVGファイルの書き込みに失敗しました: ${errorMessage}`,
            type: 'output_error',
          });
        }
      }

      // PNG形式が含まれる場合: SVG→PNG変換 → PNGファイルを書き込み
      if (includesPng(effectiveFormat)) {
        const pngResult = convertSvgToPng(svgContent, options?.scale ? { scale: options.scale } : undefined);
        if (pngResult.success && pngResult.buffer) {
          try {
            const pngFilename = generatePngFilename(entry);
            await writeTilePng(pngResult.buffer, outputDir, pngFilename);
            tileWrittenSuccessfully = true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push({
              tileId: entry.id,
              message: `PNGファイルの書き込みに失敗しました: ${errorMessage}`,
              type: 'output_error',
            });
          }
        } else {
          // PNG変換エラー
          errors.push({
            tileId: entry.id,
            message: pngResult.error || 'PNG変換に失敗しました',
            type: 'png_conversion_error',
          });
        }
      }

      // 少なくとも1つの形式が正常に書き込まれた場合、生成成功とカウント
      if (tileWrittenSuccessfully) {
        generated++;
      } else {
        failed++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        tileId: entry.id,
        message: `牌の生成に失敗しました: ${errorMessage}`,
        type: 'output_error',
      });
      failed++;
    }
  }

  // 4. マニフェストを生成して書き込み
  const manifest = createManifest(config, outputDir, effectiveFormat);
  
  try {
    await writeManifest(manifest, outputDir);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push({
      tileId: 'manifest',
      message: `マニフェストの書き込みに失敗しました: ${errorMessage}`,
      type: 'output_error',
    });
  }

  // 5. 結果を返す
  // Requirements: 4.5 - 生成数とエラー数をレポート
  // Requirements: 5.3 - 生成された形式の情報を含む
  return {
    success: failed === 0,
    generated,
    failed,
    errors,
    manifest,
    format: effectiveFormat,
  };
}
