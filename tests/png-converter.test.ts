/**
 * AWS麻雀牌 - PNG変換モジュール テスト
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import fc from 'fast-check';
import { convertSvgToPng, writeTilePng } from '../src/png-converter';

// ============================================================================
// テスト用ヘルパー (Test Helpers)
// ============================================================================

/**
 * テスト用の有効なSVG文字列（viewBox 68x96）
 */
const VALID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 96" width="68" height="96">
  <rect x="0" y="0" width="68" height="96" fill="#FFFFFF" stroke="#000000" stroke-width="1"/>
  <text x="34" y="48" text-anchor="middle" fill="#333333" font-size="12">Test</text>
</svg>`;

/**
 * PNGシグネチャ（先頭8バイト）
 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

/**
 * テスト用出力ディレクトリ
 */
const TEST_OUTPUT_DIR = path.join('tests', 'tmp-png-converter');

// ============================================================================
// convertSvgToPng テスト
// ============================================================================

describe('convertSvgToPng', () => {
  describe('正常系 - 有効なSVG変換', () => {
    it('有効なSVGをPNGに変換し、success: true を返す', () => {
      const result = convertSvgToPng(VALID_SVG);
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('デフォルトスケール（2倍）で136x192pxのPNGを生成する', () => {
      const result = convertSvgToPng(VALID_SVG);
      expect(result.success).toBe(true);
      expect(result.width).toBe(136);
      expect(result.height).toBe(192);
    });

    it('返されたBufferはPNGシグネチャで始まる', () => {
      const result = convertSvgToPng(VALID_SVG);
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      const header = result.buffer!.subarray(0, 8);
      expect(Buffer.compare(header, PNG_SIGNATURE)).toBe(0);
    });

    it('スケール1で68x96pxのPNGを生成する', () => {
      const result = convertSvgToPng(VALID_SVG, { scale: 1 });
      expect(result.success).toBe(true);
      expect(result.width).toBe(68);
      expect(result.height).toBe(96);
    });

    it('スケール3で204x288pxのPNGを生成する', () => {
      const result = convertSvgToPng(VALID_SVG, { scale: 3 });
      expect(result.success).toBe(true);
      expect(result.width).toBe(204);
      expect(result.height).toBe(288);
    });

    it('スケール4で272x384pxのPNGを生成する', () => {
      const result = convertSvgToPng(VALID_SVG, { scale: 4 });
      expect(result.success).toBe(true);
      expect(result.width).toBe(272);
      expect(result.height).toBe(384);
    });
  });

  describe('異常系 - 無効なSVG', () => {
    it('空文字列の場合、success: false とエラーメッセージを返す', () => {
      const result = convertSvgToPng('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.length).toBeGreaterThan(0);
    });

    it('無効なSVG文字列の場合、success: false とエラーメッセージを返す', () => {
      const result = convertSvgToPng('this is not svg');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// writeTilePng テスト
// ============================================================================

describe('writeTilePng', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // テスト用ディレクトリをクリーンアップ
    try {
      await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch {
      // クリーンアップ失敗は無視
    }
  });

  it('PNGバッファをファイルに書き込む', async () => {
    // 有効なPNGバッファを生成
    const result = convertSvgToPng(VALID_SVG);
    expect(result.success).toBe(true);

    const filename = 'test-tile.png';
    await writeTilePng(result.buffer!, TEST_OUTPUT_DIR, filename);

    // ファイルが存在することを確認
    const filePath = path.join(TEST_OUTPUT_DIR, filename);
    const stat = await fs.stat(filePath);
    expect(stat.isFile()).toBe(true);

    // ファイル内容がPNGシグネチャで始まることを確認
    const content = await fs.readFile(filePath);
    const header = content.subarray(0, 8);
    expect(Buffer.compare(header, PNG_SIGNATURE)).toBe(0);
  });

  it('既存ファイルを上書きする', async () => {
    const filename = 'overwrite-test.png';
    const filePath = path.join(TEST_OUTPUT_DIR, filename);

    // 最初のファイルを書き込み
    const result1 = convertSvgToPng(VALID_SVG, { scale: 1 });
    expect(result1.success).toBe(true);
    await writeTilePng(result1.buffer!, TEST_OUTPUT_DIR, filename);
    const size1 = (await fs.stat(filePath)).size;

    // 異なるスケールで上書き
    const result2 = convertSvgToPng(VALID_SVG, { scale: 3 });
    expect(result2.success).toBe(true);
    await writeTilePng(result2.buffer!, TEST_OUTPUT_DIR, filename);
    const size2 = (await fs.stat(filePath)).size;

    // ファイルサイズが変わっていることで上書きを確認
    expect(size2).not.toBe(size1);
  });

  it('存在しないディレクトリへの書き込みでエラーをスローする', async () => {
    const result = convertSvgToPng(VALID_SVG);
    expect(result.success).toBe(true);

    await expect(
      writeTilePng(result.buffer!, '/nonexistent/directory', 'test.png')
    ).rejects.toThrow('PNGファイルの書き込みに失敗しました');
  });
});


// ============================================================================
// プロパティベーステスト (Property-Based Tests)
// ============================================================================

describe('Property 2: SVG→PNG変換のPNGシグネチャ', () => {
  /**
   * **Validates: Requirements 2.1**
   * 
   * For any 有効なSVG文字列（viewBoxを持つ最小限のSVG）、
   * convertSvgToPng の結果は success: true であり、
   * 返されたBufferはPNGシグネチャ（先頭8バイト: \x89PNG\r\n\x1a\n）で始まる。
   */
  it('任意の有効なSVGに対して、変換結果はsuccess: trueであり、PNGシグネチャで始まるBufferを返す', () => {
    // ランダムな16進カラーコードを生成するArbitrary
    const hexColorArb = fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`);

    // ランダムなテキストコンテンツを生成するArbitrary（SVGに安全な文字のみ）
    const svgTextArb = fc.stringOf(
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
      { minLength: 1, maxLength: 20 }
    );

    // 有効なSVG文字列を生成するArbitrary
    const validSvgArb = fc.tuple(hexColorArb, hexColorArb, svgTextArb).map(
      ([fillColor, textColor, textContent]) =>
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 96" width="68" height="96">
  <rect x="0" y="0" width="68" height="96" fill="${fillColor}" stroke="#000000" stroke-width="1"/>
  <text x="34" y="48" text-anchor="middle" fill="${textColor}" font-size="12">${textContent}</text>
</svg>`
    );

    const expectedPngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    fc.assert(
      fc.property(validSvgArb, (svgContent) => {
        const result = convertSvgToPng(svgContent);

        // 変換が成功すること
        expect(result.success).toBe(true);

        // bufferが定義されていること
        expect(result.buffer).toBeDefined();

        // 先頭8バイトがPNGシグネチャと一致すること
        const header = Array.from(result.buffer!.subarray(0, 8));
        expect(header).toEqual(expectedPngSignature);
      }),
      { numRuns: 100 }
    );
  }, 300_000); // resvg の初期化が各呼び出しで約1-2秒かかるため、100回のイテレーションに十分なタイムアウトを設定
});


describe('Property 3: PNG出力寸法の正確性', () => {
  /**
   * **Validates: Requirements 2.2, 2.5**
   * 
   * For any 正の整数スケールファクター（1〜4の範囲）、viewBox 68x96のSVGを変換した場合、
   * 出力PNGの幅は 68 * scale、高さは 96 * scale に等しい。
   */
  it('任意のスケールファクター（1〜4）に対して、出力PNGの寸法は 68*scale x 96*scale である', () => {
    const scaleArb = fc.integer({ min: 1, max: 4 });

    fc.assert(
      fc.property(scaleArb, (scale) => {
        const result = convertSvgToPng(VALID_SVG, { scale });

        // 変換が成功すること
        expect(result.success).toBe(true);

        // 出力幅が 68 * scale であること
        expect(result.width).toBe(68 * scale);

        // 出力高さが 96 * scale であること
        expect(result.height).toBe(96 * scale);
      }),
      { numRuns: 100 }
    );
  }, 300_000);
});


describe('Property 4: 無効SVGのエラーハンドリング', () => {
  /**
   * **Validates: Requirements 2.3**
   * 
   * For any 無効なSVG文字列（空文字列、ランダムなテキスト）、
   * convertSvgToPng の結果は success: false であり、
   * error フィールドに空でないエラーメッセージが含まれる。
   */
  it('任意の無効なSVG文字列に対して、変換結果はsuccess: falseであり、空でないエラーメッセージを含む', () => {
    // 無効なSVG文字列を生成するArbitrary
    // `<svg` を含む文字列はresvgが有効なSVGとして解釈する可能性があるため除外
    // `<` で始まる文字列もXML/SVGとして解釈される可能性があるため除外
    const invalidSvgArb = fc.string()
      .filter(s => !s.includes('<svg'))
      .filter(s => !s.startsWith('<'));

    fc.assert(
      fc.property(invalidSvgArb, (invalidSvg) => {
        const result = convertSvgToPng(invalidSvg);

        // 変換が失敗すること
        expect(result.success).toBe(false);

        // errorフィールドが定義されていること
        expect(result.error).toBeDefined();

        // エラーメッセージが空でないこと
        expect(result.error!.length).toBeGreaterThan(0);

        // bufferが未定義であること
        expect(result.buffer).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  }, 300_000);
});
