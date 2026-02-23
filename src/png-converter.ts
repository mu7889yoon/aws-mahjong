/**
 * AWS麻雀牌 - PNG変換モジュール
 * 
 * SVG文字列をPNGバイナリに変換する責務を持つ。
 * @resvg/resvg-js ライブラリを使用してSVG→PNG変換を行う。
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3
 */

import { Resvg } from '@resvg/resvg-js';
import { PngConvertOptions, PngConvertResult } from './types.js';
import { promises as fs } from 'fs';
import * as path from 'path';

// ============================================================================
// 定数 (Constants)
// ============================================================================

/**
 * SVGのベースviewBoxサイズ（px）
 */
const BASE_SVG_WIDTH = 68;

/**
 * デフォルトのスケールファクター
 */
const DEFAULT_SCALE = 2;

// ============================================================================
// SVG→PNG変換 (SVG to PNG Conversion)
// ============================================================================

/**
 * SVG文字列をPNGバイナリに変換
 * 
 * Resvgを使用してSVG文字列をレンダリングし、PNGバイナリデータを生成する。
 * デフォルトでは2倍のスケールファクター（136x192px）で出力する。
 * 
 * Requirements: 2.1 - SVGをPNGバイナリデータに変換
 * Requirements: 2.2 - viewBox 68x96に対応するPNG画像を生成
 * Requirements: 2.3 - エラー発生時はエラーオブジェクトを返す
 * Requirements: 2.4 - SVG文字列をPNGバイナリ（Buffer）に変換する関数を提供
 * Requirements: 2.5 - デフォルトで2倍のスケールファクター（136x192px）
 * 
 * @param svgContent SVG文字列
 * @param options PNG変換オプション（スケールファクター等）
 * @returns PNG変換結果（成功時はBuffer、失敗時はエラーメッセージ）
 */
export function convertSvgToPng(
  svgContent: string,
  options?: PngConvertOptions
): PngConvertResult {
  try {
    const scale = options?.scale ?? DEFAULT_SCALE;

    // Resvgインスタンスを作成し、fitToオプションでスケーリング
    const resvg = new Resvg(svgContent, {
      fitTo: {
        mode: 'width',
        value: BASE_SVG_WIDTH * scale,
      },
    });

    // レンダリングしてPNG Bufferを取得
    const rendered = resvg.render();
    const pngBuffer = rendered.asPng();

    return {
      success: true,
      buffer: pngBuffer,
      width: rendered.width,
      height: rendered.height,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `PNG変換に失敗しました: ${errorMessage}`,
    };
  }
}

// ============================================================================
// PNGファイル書き込み (PNG File Writing)
// ============================================================================

/**
 * PNGバイナリをファイルに書き込み
 * 
 * 指定された出力ディレクトリにPNGファイルを保存する。
 * 既存のwriteTileSvgと同様のパターンで実装。
 * 
 * Requirements: 3.1 - PNGファイルをMPSZ形式のファイル名で出力ディレクトリに保存
 * Requirements: 3.3 - 既存のPNGファイルを上書き
 * 
 * @param pngBuffer PNGバイナリデータ
 * @param outputDir 出力ディレクトリのパス
 * @param filename ファイル名（例: "1m.png"）
 * @throws ファイルの書き込みに失敗した場合
 */
export async function writeTilePng(
  pngBuffer: Buffer,
  outputDir: string,
  filename: string
): Promise<void> {
  const filePath = path.join(outputDir, filename);

  try {
    await fs.writeFile(filePath, pngBuffer);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`PNGファイルの書き込みに失敗しました: ${filePath} - ${errorMessage}`);
  }
}
