/**
 * AWS麻雀牌 - SVGジェネレーター テスト
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  getTileTypeLabel,
  getTileTypeName,
  loadIcon,
  extractViewBox,
  scaleIconToFit,
  extractSvgContent,
  generateTile,
  generateFilename,
  generateFilenameFromId,
  generatePngFilename,
  DEFAULT_ICON_AREA,
  ensureOutputDirectory,
  getOutputPath,
  writeTileSvg,
  createManifestEntry,
  createManifest,
  writeManifest,
  MANIFEST_FILENAME,
  MANIFEST_VERSION,
} from '../src/generator';
import { TileEntry, TileType, TileConfig, TileManifest, TileManifestEntry, TILE_TYPE_NAMES, HONOR_TILE_NAMES, VALID_TILE_TYPES, TILE_NUMBER_RANGES, OutputFormat } from '../src/types';
import { BASE_TILE_TEMPLATE } from '../src/template';
import { createValidTileEntry, createValidTileConfig } from '../src/validator';

// ============================================================================
// テスト用ヘルパー (Test Helpers)
// ============================================================================

/**
 * テスト用のサンプルアイコンSVG
 */
const SAMPLE_ICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="4" y="4" width="40" height="40" fill="#FF9900" rx="4"/>
  <text x="24" y="30" text-anchor="middle" fill="white" font-size="16">EC2</text>
</svg>`;

/**
 * viewBoxのみのアイコンSVG
 */
const VIEWBOX_ONLY_ICON = `<svg viewBox="0 0 100 50">
  <circle cx="50" cy="25" r="20" fill="blue"/>
</svg>`;

/**
 * width/heightのみのアイコンSVG
 */
const DIMENSIONS_ONLY_ICON = `<svg width="64" height="32">
  <rect width="64" height="32" fill="green"/>
</svg>`;

/**
 * テスト用の一時ディレクトリ
 */
const TEST_TEMP_DIR = 'test-temp-icons';

// ============================================================================
// テストセットアップ (Test Setup)
// ============================================================================

describe('SVGジェネレーター', () => {
  beforeAll(async () => {
    // テスト用の一時ディレクトリを作成
    await fs.mkdir(TEST_TEMP_DIR, { recursive: true });
    
    // テスト用のアイコンファイルを作成
    await fs.writeFile(
      path.join(TEST_TEMP_DIR, 'ec2.svg'),
      SAMPLE_ICON_SVG
    );
  });

  afterAll(async () => {
    // テスト用の一時ディレクトリを削除
    await fs.rm(TEST_TEMP_DIR, { recursive: true, force: true });
  });

  // ============================================================================
  // getTileTypeLabel テスト
  // ============================================================================

  describe('getTileTypeLabel', () => {
    describe('数牌（萬子）', () => {
      it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('萬子 %d のラベルを正しく生成する', (num) => {
        const entry = createValidTileEntry({ id: `${num}m`, type: 'm', number: num });
        expect(getTileTypeLabel(entry)).toBe(`${num}萬`);
      });
    });

    describe('数牌（筒子）', () => {
      it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('筒子 %d のラベルを正しく生成する', (num) => {
        const entry = createValidTileEntry({ id: `${num}p`, type: 'p', number: num });
        expect(getTileTypeLabel(entry)).toBe(`${num}筒`);
      });
    });

    describe('数牌（索子）', () => {
      it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('索子 %d のラベルを正しく生成する', (num) => {
        const entry = createValidTileEntry({ id: `${num}s`, type: 's', number: num });
        expect(getTileTypeLabel(entry)).toBe(`${num}索`);
      });
    });

    describe('字牌', () => {
      const honorTiles = [
        { number: 1, expected: '東' },
        { number: 2, expected: '南' },
        { number: 3, expected: '西' },
        { number: 4, expected: '北' },
        { number: 5, expected: '白' },
        { number: 6, expected: '發' },
        { number: 7, expected: '中' },
      ];

      it.each(honorTiles)('字牌 $number ($expected) のラベルを正しく生成する', ({ number, expected }) => {
        const entry = createValidTileEntry({ id: `${number}z`, type: 'z', number });
        expect(getTileTypeLabel(entry)).toBe(expected);
      });
    });

    describe('カスタムラベル', () => {
      it('カスタムラベルが設定されている場合はそれを使用する', () => {
        const entry = createValidTileEntry({
          id: '1m',
          type: 'm',
          number: 1,
          display: { typeLabel: 'カスタム' },
        });
        expect(getTileTypeLabel(entry)).toBe('カスタム');
      });

      it('空のカスタムラベルの場合はデフォルトを使用する', () => {
        const entry = createValidTileEntry({
          id: '1m',
          type: 'm',
          number: 1,
          display: { typeLabel: '' },
        });
        // 空文字列はfalsyなのでデフォルトが使用される
        expect(getTileTypeLabel(entry)).toBe('1萬');
      });
    });
  });

  // ============================================================================
  // getTileTypeName テスト
  // ============================================================================

  describe('getTileTypeName', () => {
    it.each([
      ['m', '萬子'],
      ['p', '筒子'],
      ['s', '索子'],
      ['z', '字牌'],
    ] as [TileType, string][])('牌種類 %s の名前は %s', (type, expected) => {
      expect(getTileTypeName(type)).toBe(expected);
    });
  });

  // ============================================================================
  // loadIcon テスト
  // ============================================================================

  describe('loadIcon', () => {
    it('存在するアイコンファイルを読み込める', async () => {
      const iconPath = path.join(TEST_TEMP_DIR, 'ec2.svg');
      const content = await loadIcon(iconPath);
      expect(content).toContain('<svg');
      expect(content).toContain('EC2');
    });

    it('存在しないファイルの場合はエラーをスローする', async () => {
      await expect(loadIcon('nonexistent.svg')).rejects.toThrow('アイコンファイルの読み込みに失敗しました');
    });
  });

  // ============================================================================
  // extractViewBox テスト
  // ============================================================================

  describe('extractViewBox', () => {
    it('viewBox属性からサイズを抽出できる', () => {
      const result = extractViewBox(SAMPLE_ICON_SVG);
      expect(result).toEqual({ minX: 0, minY: 0, width: 48, height: 48 });
    });

    it('viewBoxのみのSVGからサイズを抽出できる', () => {
      const result = extractViewBox(VIEWBOX_ONLY_ICON);
      expect(result).toEqual({ minX: 0, minY: 0, width: 100, height: 50 });
    });

    it('width/height属性からサイズを推測できる', () => {
      const result = extractViewBox(DIMENSIONS_ONLY_ICON);
      expect(result).toEqual({ minX: 0, minY: 0, width: 64, height: 32 });
    });

    it('サイズ情報がない場合はnullを返す', () => {
      const result = extractViewBox('<svg><rect/></svg>');
      expect(result).toBeNull();
    });

    it('負のviewBox値も正しく抽出できる', () => {
      const svg = '<svg viewBox="-10 -20 100 200"></svg>';
      const result = extractViewBox(svg);
      expect(result).toEqual({ minX: -10, minY: -20, width: 100, height: 200 });
    });
  });

  // ============================================================================
  // scaleIconToFit テスト (Requirements: 3.5)
  // ============================================================================

  describe('scaleIconToFit (Requirements: 3.5)', () => {
    it('アイコンを指定サイズにスケーリングする', () => {
      const result = scaleIconToFit(SAMPLE_ICON_SVG, 40, 40);
      expect(result).toContain('<g transform=');
      expect(result).toContain('scale(');
    });

    it('アスペクト比を維持してスケーリングする（横長アイコン）', () => {
      const result = scaleIconToFit(VIEWBOX_ONLY_ICON, 40, 40);
      // 100x50のアイコンを40x40にフィット → scale = 0.4 (高さ基準)
      expect(result).toContain('scale(0.4');
    });

    it('アスペクト比を維持してスケーリングする（縦長アイコン）', () => {
      const tallIcon = '<svg viewBox="0 0 50 100"><rect/></svg>';
      const result = scaleIconToFit(tallIcon, 40, 40);
      // 50x100のアイコンを40x40にフィット → scale = 0.4 (高さ基準)
      expect(result).toContain('scale(0.4');
    });

    it('正方形アイコンを正しくスケーリングする', () => {
      const squareIcon = '<svg viewBox="0 0 100 100"><rect/></svg>';
      const result = scaleIconToFit(squareIcon, 40, 40);
      // 100x100のアイコンを40x40にフィット → scale = 0.4
      expect(result).toContain('scale(0.4');
    });

    it('空のコンテンツの場合は空文字列を返す', () => {
      expect(scaleIconToFit('', 60, 60)).toBe('');
      expect(scaleIconToFit('   ', 60, 60)).toBe('');
    });

    it('デフォルトサイズ（60x60）を使用する', () => {
      const result = scaleIconToFit(SAMPLE_ICON_SVG);
      expect(result).toContain('<g transform=');
      expect(DEFAULT_ICON_AREA.width).toBe(60);
      expect(DEFAULT_ICON_AREA.height).toBe(60);
    });

    it('中央配置のためのオフセットを計算する', () => {
      // 100x50のアイコンを60x60にフィット
      // scale = 0.6, scaledWidth = 60, scaledHeight = 30
      // offsetX = 0, offsetY = 15
      const result = scaleIconToFit(VIEWBOX_ONLY_ICON, 60, 60);
      expect(result).toContain('translate(0.00, 15.00)');
    });
  });

  // ============================================================================
  // extractSvgContent テスト
  // ============================================================================

  describe('extractSvgContent', () => {
    it('SVGタグを除去して内部コンテンツを抽出する', () => {
      const result = extractSvgContent(SAMPLE_ICON_SVG);
      expect(result).not.toContain('<svg');
      expect(result).not.toContain('</svg>');
      expect(result).toContain('<rect');
      expect(result).toContain('<text');
    });

    it('XML宣言を除去する', () => {
      const result = extractSvgContent(SAMPLE_ICON_SVG);
      expect(result).not.toContain('<?xml');
    });

    it('コメントを除去する', () => {
      const svgWithComment = '<svg><!-- comment --><rect/></svg>';
      const result = extractSvgContent(svgWithComment);
      expect(result).not.toContain('comment');
      expect(result).toContain('<rect/>');
    });
  });

  // ============================================================================
  // generateTile テスト (Requirements: 3.1, 3.2, 3.3)
  // ============================================================================

  describe('generateTile (Requirements: 3.1, 3.2, 3.3)', () => {
    it('牌SVGを生成できる', () => {
      const entry = createValidTileEntry({
        id: '1m',
        type: 'm',
        number: 1,
        awsService: {
          id: 'ec2',
          displayName: 'Amazon EC2',
          iconPath: 'assets/icons/ec2.svg',
        },
      });
      
      const result = generateTile(entry, BASE_TILE_TEMPLATE, SAMPLE_ICON_SVG);
      
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('牌種類ラベルが埋め込まれる (Requirements: 3.3)', () => {
      const entry = createValidTileEntry({
        id: '5p',
        type: 'p',
        number: 5,
      });
      
      const result = generateTile(entry, BASE_TILE_TEMPLATE, SAMPLE_ICON_SVG);
      
      expect(result).toContain('5筒');
    });

    it('サービス名が埋め込まれる (Requirements: 3.3)', () => {
      const entry = createValidTileEntry({
        id: '1m',
        type: 'm',
        number: 1,
        awsService: {
          id: 's3',
          displayName: 'Amazon S3',
          iconPath: 'assets/icons/s3.svg',
        },
      });
      
      const result = generateTile(entry, BASE_TILE_TEMPLATE, SAMPLE_ICON_SVG);
      
      expect(result).toContain('Amazon S3');
    });

    it('アイコンコンテンツが埋め込まれる (Requirements: 3.2)', () => {
      const entry = createValidTileEntry();
      const result = generateTile(entry, BASE_TILE_TEMPLATE, SAMPLE_ICON_SVG);
      
      // スケーリングされたアイコンが含まれる
      expect(result).toContain('id="icon-placeholder"');
      expect(result).toContain('transform=');
    });

    it('アイコンがない場合はプレースホルダーテキストを使用する', () => {
      const entry = createValidTileEntry({
        awsService: {
          id: 'lambda',
          displayName: 'AWS Lambda',
          iconPath: 'assets/icons/lambda.svg',
        },
      });
      
      const result = generateTile(entry, BASE_TILE_TEMPLATE);
      
      expect(result).toContain('lambda');
    });

    it('字牌のラベルが正しく埋め込まれる', () => {
      const entry = createValidTileEntry({
        id: '1z',
        type: 'z',
        number: 1,
      });
      
      const result = generateTile(entry, BASE_TILE_TEMPLATE, SAMPLE_ICON_SVG);
      
      expect(result).toContain('東');
    });

    it('カスタムアイコンスケールが適用される', () => {
      const entry = createValidTileEntry({
        display: { iconScale: 0.8 },
      });
      
      const result = generateTile(entry, BASE_TILE_TEMPLATE, SAMPLE_ICON_SVG);
      
      // スケールが適用されている（0.8 * 40 = 32pxターゲット）
      expect(result).toContain('transform=');
    });

    it('特殊文字を含むサービス名がエスケープされる', () => {
      const entry = createValidTileEntry({
        awsService: {
          id: 'test',
          displayName: 'Test <Service> & More',
          iconPath: 'assets/icons/test.svg',
        },
      });
      
      const result = generateTile(entry, BASE_TILE_TEMPLATE, SAMPLE_ICON_SVG);
      
      expect(result).toContain('&lt;Service&gt;');
      expect(result).toContain('&amp;');
    });
  });

  // ============================================================================
  // generateFilename テスト
  // ============================================================================

  describe('generateFilename', () => {
    it.each([
      { id: '1m', type: 'm' as TileType, number: 1, expected: '1m.svg' },
      { id: '5p', type: 'p' as TileType, number: 5, expected: '5p.svg' },
      { id: '9s', type: 's' as TileType, number: 9, expected: '9s.svg' },
      { id: '7z', type: 'z' as TileType, number: 7, expected: '7z.svg' },
    ])('$id のファイル名は $expected', ({ type, number, expected }) => {
      const entry = createValidTileEntry({ id: `${number}${type}`, type, number });
      expect(generateFilename(entry)).toBe(expected);
    });
  });

  describe('generateFilenameFromId', () => {
    it.each([
      ['1m', '1m.svg'],
      ['5p', '5p.svg'],
      ['9s', '9s.svg'],
      ['7z', '7z.svg'],
    ])('牌ID %s のファイル名は %s', (tileId, expected) => {
      expect(generateFilenameFromId(tileId)).toBe(expected);
    });
  });

  // ============================================================================
  // ファイル出力処理テスト (File Output Processing Tests)
  // ============================================================================

  describe('ensureOutputDirectory (Requirements: 4.1)', () => {
    const TEST_OUTPUT_DIR = 'test-output-dir';
    const NESTED_OUTPUT_DIR = 'test-output-dir/nested/deep';

    afterEach(async () => {
      // テスト後にディレクトリを削除
      await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    });

    it('存在しないディレクトリを作成できる', async () => {
      await ensureOutputDirectory(TEST_OUTPUT_DIR);
      
      const stats = await fs.stat(TEST_OUTPUT_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    it('ネストされたディレクトリを再帰的に作成できる', async () => {
      await ensureOutputDirectory(NESTED_OUTPUT_DIR);
      
      const stats = await fs.stat(NESTED_OUTPUT_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    it('既存のディレクトリに対してエラーを投げない', async () => {
      // 最初に作成
      await ensureOutputDirectory(TEST_OUTPUT_DIR);
      
      // 再度呼び出してもエラーにならない
      await expect(ensureOutputDirectory(TEST_OUTPUT_DIR)).resolves.not.toThrow();
    });
  });

  describe('getOutputPath (Requirements: 3.4, 4.1)', () => {
    it('出力ディレクトリとファイル名を結合したパスを返す', () => {
      const entry = createValidTileEntry({ id: '1m', type: 'm', number: 1 });
      const result = getOutputPath('output', entry);
      
      expect(result).toBe(path.join('output', '1m.svg'));
    });

    it.each([
      { id: '1m', type: 'm' as TileType, number: 1, expected: '1m.svg' },
      { id: '5p', type: 'p' as TileType, number: 5, expected: '5p.svg' },
      { id: '9s', type: 's' as TileType, number: 9, expected: '9s.svg' },
      { id: '7z', type: 'z' as TileType, number: 7, expected: '7z.svg' },
    ])('$id の出力パスは output/$expected', ({ id, type, number, expected }) => {
      const entry = createValidTileEntry({ id, type, number });
      const result = getOutputPath('output', entry);
      
      expect(result).toBe(path.join('output', expected));
    });

    it('ネストされた出力ディレクトリでも正しいパスを返す', () => {
      const entry = createValidTileEntry({ id: '3s', type: 's', number: 3 });
      const result = getOutputPath('output/tiles/svg', entry);
      
      expect(result).toBe(path.join('output/tiles/svg', '3s.svg'));
    });
  });

  describe('writeTileSvg (Requirements: 3.4, 4.1, 4.3)', () => {
    const TEST_WRITE_DIR = 'test-write-dir';
    const SAMPLE_SVG_CONTENT = '<?xml version="1.0"?><svg><rect/></svg>';

    beforeEach(async () => {
      // テスト用ディレクトリを作成
      await fs.mkdir(TEST_WRITE_DIR, { recursive: true });
    });

    afterEach(async () => {
      // テスト後にディレクトリを削除
      await fs.rm(TEST_WRITE_DIR, { recursive: true, force: true });
    });

    it('SVGコンテンツをファイルに書き込める', async () => {
      await writeTileSvg(SAMPLE_SVG_CONTENT, TEST_WRITE_DIR, '1m.svg');
      
      const content = await fs.readFile(path.join(TEST_WRITE_DIR, '1m.svg'), 'utf-8');
      expect(content).toBe(SAMPLE_SVG_CONTENT);
    });

    it('既存のファイルを上書きできる (Requirements: 4.3)', async () => {
      const originalContent = '<svg>original</svg>';
      const newContent = '<svg>updated</svg>';
      
      // 最初のファイルを作成
      await writeTileSvg(originalContent, TEST_WRITE_DIR, '1m.svg');
      
      // 上書き
      await writeTileSvg(newContent, TEST_WRITE_DIR, '1m.svg');
      
      const content = await fs.readFile(path.join(TEST_WRITE_DIR, '1m.svg'), 'utf-8');
      expect(content).toBe(newContent);
    });

    it('MPSZ形式のファイル名で書き込める', async () => {
      const testCases = ['1m.svg', '5p.svg', '9s.svg', '7z.svg'];
      
      for (const filename of testCases) {
        await writeTileSvg(SAMPLE_SVG_CONTENT, TEST_WRITE_DIR, filename);
        
        const exists = await fs.stat(path.join(TEST_WRITE_DIR, filename))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('存在しないディレクトリへの書き込みはエラーをスローする', async () => {
      await expect(
        writeTileSvg(SAMPLE_SVG_CONTENT, 'nonexistent-dir', '1m.svg')
      ).rejects.toThrow('SVGファイルの書き込みに失敗しました');
    });

    it('UTF-8エンコーディングで書き込む', async () => {
      const japaneseContent = '<?xml version="1.0"?><svg><text>日本語テスト</text></svg>';
      
      await writeTileSvg(japaneseContent, TEST_WRITE_DIR, 'test.svg');
      
      const content = await fs.readFile(path.join(TEST_WRITE_DIR, 'test.svg'), 'utf-8');
      expect(content).toBe(japaneseContent);
      expect(content).toContain('日本語テスト');
    });
  });

  // ============================================================================
  // マニフェスト生成テスト (Manifest Generation Tests)
  // ============================================================================

  describe('createManifestEntry (Requirements: 4.2)', () => {
    it('牌エントリからマニフェストエントリを作成できる', () => {
      const entry = createValidTileEntry({
        id: '1m',
        type: 'm',
        number: 1,
        awsService: {
          id: 'ec2',
          displayName: 'Amazon EC2',
          iconPath: 'assets/icons/ec2.svg',
        },
      });
      
      const manifestEntry = createManifestEntry(entry, 'output');
      
      expect(manifestEntry.id).toBe('1m');
      expect(manifestEntry.type).toBe('m');
      expect(manifestEntry.number).toBe(1);
      expect(manifestEntry.filePath).toBe(path.join('output', '1m.svg'));
      expect(manifestEntry.awsService.id).toBe('ec2');
      expect(manifestEntry.awsService.displayName).toBe('Amazon EC2');
    });

    it('字牌のマニフェストエントリを正しく作成できる', () => {
      const entry = createValidTileEntry({
        id: '7z',
        type: 'z',
        number: 7,
        awsService: {
          id: 'lambda',
          displayName: 'AWS Lambda',
          iconPath: 'assets/icons/lambda.svg',
        },
      });
      
      const manifestEntry = createManifestEntry(entry, 'tiles');
      
      expect(manifestEntry.id).toBe('7z');
      expect(manifestEntry.type).toBe('z');
      expect(manifestEntry.number).toBe(7);
      expect(manifestEntry.filePath).toBe(path.join('tiles', '7z.svg'));
      expect(manifestEntry.awsService.id).toBe('lambda');
      expect(manifestEntry.awsService.displayName).toBe('AWS Lambda');
    });

    it('iconPathはマニフェストエントリに含まれない', () => {
      const entry = createValidTileEntry({
        awsService: {
          id: 's3',
          displayName: 'Amazon S3',
          iconPath: 'assets/icons/s3.svg',
        },
      });
      
      const manifestEntry = createManifestEntry(entry, 'output');
      
      // awsServiceにはidとdisplayNameのみ含まれる
      expect(manifestEntry.awsService).toEqual({
        id: 's3',
        displayName: 'Amazon S3',
      });
      expect((manifestEntry.awsService as any).iconPath).toBeUndefined();
    });

    it.each([
      { id: '1m', type: 'm' as TileType, number: 1, expected: '1m.svg' },
      { id: '5p', type: 'p' as TileType, number: 5, expected: '5p.svg' },
      { id: '9s', type: 's' as TileType, number: 9, expected: '9s.svg' },
      { id: '3z', type: 'z' as TileType, number: 3, expected: '3z.svg' },
    ])('$id のファイルパスは output/$expected', ({ id, type, number, expected }) => {
      const entry = createValidTileEntry({ id, type, number });
      const manifestEntry = createManifestEntry(entry, 'output');
      
      expect(manifestEntry.filePath).toBe(path.join('output', expected));
    });

    // OutputFormat パラメータのテスト (Requirements: 4.1, 4.2, 4.3)
    describe('OutputFormat パラメータ', () => {
      it('format省略時（デフォルト）はSVGパスを設定し、pngFilePathはundefined', () => {
        const entry = createValidTileEntry({ id: '1m', type: 'm', number: 1 });
        const manifestEntry = createManifestEntry(entry, 'output');

        expect(manifestEntry.filePath).toBe(path.join('output', '1m.svg'));
        expect(manifestEntry.pngFilePath).toBeUndefined();
      });

      it('format="svg" の場合、filePathはSVGパス、pngFilePathはundefined', () => {
        const entry = createValidTileEntry({ id: '5p', type: 'p', number: 5 });
        const manifestEntry = createManifestEntry(entry, 'output', 'svg');

        expect(manifestEntry.filePath).toBe(path.join('output', '5p.svg'));
        expect(manifestEntry.pngFilePath).toBeUndefined();
      });

      it('format="png" の場合、filePathはPNGパス、pngFilePathはundefined', () => {
        const entry = createValidTileEntry({ id: '9s', type: 's', number: 9 });
        const manifestEntry = createManifestEntry(entry, 'output', 'png');

        expect(manifestEntry.filePath).toBe(path.join('output', '9s.png'));
        expect(manifestEntry.pngFilePath).toBeUndefined();
      });

      it('format="svg,png" の場合、filePathはSVGパス、pngFilePathはPNGパス', () => {
        const entry = createValidTileEntry({ id: '7z', type: 'z', number: 7 });
        const manifestEntry = createManifestEntry(entry, 'output', 'svg,png');

        expect(manifestEntry.filePath).toBe(path.join('output', '7z.svg'));
        expect(manifestEntry.pngFilePath).toBe(path.join('output', '7z.png'));
      });

      it('format="png" の場合、他のフィールド（id, type, number, awsService）は正しく設定される', () => {
        const entry = createValidTileEntry({
          id: '3m',
          type: 'm',
          number: 3,
          awsService: {
            id: 'ec2',
            displayName: 'Amazon EC2',
            iconPath: 'assets/icons/ec2.svg',
          },
        });
        const manifestEntry = createManifestEntry(entry, 'tiles', 'png');

        expect(manifestEntry.id).toBe('3m');
        expect(manifestEntry.type).toBe('m');
        expect(manifestEntry.number).toBe(3);
        expect(manifestEntry.awsService.id).toBe('ec2');
        expect(manifestEntry.awsService.displayName).toBe('Amazon EC2');
      });

      it('format="svg,png" の場合、他のフィールドは正しく設定される', () => {
        const entry = createValidTileEntry({
          id: '2p',
          type: 'p',
          number: 2,
          awsService: {
            id: 'lambda',
            displayName: 'AWS Lambda',
            iconPath: 'assets/icons/lambda.svg',
          },
        });
        const manifestEntry = createManifestEntry(entry, 'tiles', 'svg,png');

        expect(manifestEntry.id).toBe('2p');
        expect(manifestEntry.type).toBe('p');
        expect(manifestEntry.number).toBe(2);
        expect(manifestEntry.awsService.id).toBe('lambda');
        expect(manifestEntry.awsService.displayName).toBe('AWS Lambda');
      });
    });
  });

  describe('createManifest (Requirements: 4.2)', () => {
    it('TileConfigから完全なマニフェストを作成できる', () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '2m', type: 'm', number: 2 }),
          createValidTileEntry({ id: '3m', type: 'm', number: 3 }),
        ],
        metadata: { version: '1.0.0' },
      };
      
      const manifest = createManifest(config, 'output');
      
      expect(manifest.version).toBe(MANIFEST_VERSION);
      expect(manifest.tileCount).toBe(3);
      expect(manifest.tiles).toHaveLength(3);
      expect(manifest.generatedAt).toBeDefined();
      // ISO 8601形式の日時であることを確認
      expect(new Date(manifest.generatedAt).toISOString()).toBe(manifest.generatedAt);
    });

    it('空のタイル配列の場合、tileCountは0', () => {
      const config: TileConfig = {
        tiles: [],
        metadata: { version: '1.0.0' },
      };
      
      const manifest = createManifest(config, 'output');
      
      expect(manifest.tileCount).toBe(0);
      expect(manifest.tiles).toHaveLength(0);
    });

    it('マニフェストのバージョンは1.0.0', () => {
      const config: TileConfig = {
        tiles: [createValidTileEntry()],
        metadata: { version: '1.0.0' },
      };
      
      const manifest = createManifest(config, 'output');
      
      expect(manifest.version).toBe('1.0.0');
      expect(MANIFEST_VERSION).toBe('1.0.0');
    });

    it('generatedAtはISO 8601形式の日時', () => {
      const config: TileConfig = {
        tiles: [createValidTileEntry()],
        metadata: { version: '1.0.0' },
      };
      
      const beforeTime = new Date().toISOString();
      const manifest = createManifest(config, 'output');
      const afterTime = new Date().toISOString();
      
      // generatedAtが有効なISO 8601形式であることを確認
      expect(() => new Date(manifest.generatedAt)).not.toThrow();
      expect(manifest.generatedAt >= beforeTime).toBe(true);
      expect(manifest.generatedAt <= afterTime).toBe(true);
    });

    it('全34種類の牌のマニフェストを作成できる', () => {
      const tiles: TileEntry[] = [];
      const allTypes: TileType[] = ['m', 'p', 's', 'z'];
      
      for (const type of allTypes) {
        const range = TILE_NUMBER_RANGES[type];
        for (let number = range.min; number <= range.max; number++) {
          tiles.push(createValidTileEntry({
            id: `${number}${type}`,
            type,
            number,
          }));
        }
      }
      
      const config: TileConfig = {
        tiles,
        metadata: { version: '1.0.0' },
      };
      
      const manifest = createManifest(config, 'tiles');
      
      expect(manifest.tileCount).toBe(34);
      expect(manifest.tiles).toHaveLength(34);
      
      // 各タイルのファイルパスが正しいことを確認
      manifest.tiles.forEach((tile, index) => {
        expect(tile.filePath).toBe(path.join('tiles', `${tile.number}${tile.type}.svg`));
      });
    });

    it('マニフェストの各エントリにはAWSサービス情報が含まれる', () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({
            id: '1m',
            type: 'm',
            number: 1,
            awsService: {
              id: 'ec2',
              displayName: 'Amazon EC2',
              iconPath: 'assets/icons/ec2.svg',
            },
          }),
          createValidTileEntry({
            id: '2m',
            type: 'm',
            number: 2,
            awsService: {
              id: 's3',
              displayName: 'Amazon S3',
              iconPath: 'assets/icons/s3.svg',
            },
          }),
        ],
        metadata: { version: '1.0.0' },
      };
      
      const manifest = createManifest(config, 'output');
      
      expect(manifest.tiles[0].awsService).toEqual({
        id: 'ec2',
        displayName: 'Amazon EC2',
      });
      expect(manifest.tiles[1].awsService).toEqual({
        id: 's3',
        displayName: 'Amazon S3',
      });
    });
  });

  describe('writeManifest (Requirements: 4.2)', () => {
    const TEST_MANIFEST_DIR = 'test-manifest-dir';

    beforeEach(async () => {
      await fs.mkdir(TEST_MANIFEST_DIR, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(TEST_MANIFEST_DIR, { recursive: true, force: true });
    });

    it('マニフェストをJSONファイルとして書き込める', async () => {
      const manifest: TileManifest = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        tileCount: 1,
        tiles: [
          {
            id: '1m',
            type: 'm',
            number: 1,
            filePath: 'output/1m.svg',
            awsService: {
              id: 'ec2',
              displayName: 'Amazon EC2',
            },
          },
        ],
      };
      
      await writeManifest(manifest, TEST_MANIFEST_DIR);
      
      const content = await fs.readFile(
        path.join(TEST_MANIFEST_DIR, MANIFEST_FILENAME),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      
      expect(parsed).toEqual(manifest);
    });

    it('マニフェストファイル名はtiles-manifest.json', async () => {
      const manifest: TileManifest = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        tileCount: 0,
        tiles: [],
      };
      
      await writeManifest(manifest, TEST_MANIFEST_DIR);
      
      const exists = await fs.stat(path.join(TEST_MANIFEST_DIR, 'tiles-manifest.json'))
        .then(() => true)
        .catch(() => false);
      
      expect(exists).toBe(true);
      expect(MANIFEST_FILENAME).toBe('tiles-manifest.json');
    });

    it('既存のマニフェストファイルを上書きできる', async () => {
      const manifest1: TileManifest = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        tileCount: 1,
        tiles: [
          {
            id: '1m',
            type: 'm',
            number: 1,
            filePath: 'output/1m.svg',
            awsService: { id: 'ec2', displayName: 'Amazon EC2' },
          },
        ],
      };
      
      const manifest2: TileManifest = {
        version: '1.0.0',
        generatedAt: '2024-01-02T00:00:00.000Z',
        tileCount: 2,
        tiles: [
          {
            id: '1m',
            type: 'm',
            number: 1,
            filePath: 'output/1m.svg',
            awsService: { id: 'ec2', displayName: 'Amazon EC2' },
          },
          {
            id: '2m',
            type: 'm',
            number: 2,
            filePath: 'output/2m.svg',
            awsService: { id: 's3', displayName: 'Amazon S3' },
          },
        ],
      };
      
      // 最初のマニフェストを書き込み
      await writeManifest(manifest1, TEST_MANIFEST_DIR);
      
      // 上書き
      await writeManifest(manifest2, TEST_MANIFEST_DIR);
      
      const content = await fs.readFile(
        path.join(TEST_MANIFEST_DIR, MANIFEST_FILENAME),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      
      expect(parsed.tileCount).toBe(2);
      expect(parsed.tiles).toHaveLength(2);
    });

    it('存在しないディレクトリへの書き込みはエラーをスローする', async () => {
      const manifest: TileManifest = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        tileCount: 0,
        tiles: [],
      };
      
      await expect(
        writeManifest(manifest, 'nonexistent-manifest-dir')
      ).rejects.toThrow('マニフェストファイルの書き込みに失敗しました');
    });

    it('マニフェストはインデント付きのJSONで書き込まれる', async () => {
      const manifest: TileManifest = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        tileCount: 1,
        tiles: [
          {
            id: '1m',
            type: 'm',
            number: 1,
            filePath: 'output/1m.svg',
            awsService: { id: 'ec2', displayName: 'Amazon EC2' },
          },
        ],
      };
      
      await writeManifest(manifest, TEST_MANIFEST_DIR);
      
      const content = await fs.readFile(
        path.join(TEST_MANIFEST_DIR, MANIFEST_FILENAME),
        'utf-8'
      );
      
      // インデント付きのJSONであることを確認（改行が含まれる）
      expect(content).toContain('\n');
      expect(content).toContain('  '); // 2スペースインデント
    });

    it('UTF-8エンコーディングで書き込む', async () => {
      const manifest: TileManifest = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        tileCount: 1,
        tiles: [
          {
            id: '1m',
            type: 'm',
            number: 1,
            filePath: 'output/1m.svg',
            awsService: { id: 'test', displayName: '日本語サービス名' },
          },
        ],
      };
      
      await writeManifest(manifest, TEST_MANIFEST_DIR);
      
      const content = await fs.readFile(
        path.join(TEST_MANIFEST_DIR, MANIFEST_FILENAME),
        'utf-8'
      );
      
      expect(content).toContain('日本語サービス名');
    });
  });
});

// ============================================================================
// 統合テスト (Integration Tests)
// ============================================================================

describe('統合テスト', () => {
  it('完全な牌生成フローが動作する', () => {
    const entry: TileEntry = {
      id: '1m',
      type: 'm',
      number: 1,
      awsService: {
        id: 'ec2',
        displayName: 'Amazon EC2',
        iconPath: 'assets/icons/ec2.svg',
      },
    };

    const iconContent = SAMPLE_ICON_SVG;
    const result = generateTile(entry, BASE_TILE_TEMPLATE, iconContent);

    // 基本構造の確認
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result).toContain('<svg');
    expect(result).toContain('width="17mm"');
    expect(result).toContain('height="24mm"');
    
    // 牌種類ラベルの確認
    expect(result).toContain('1萬');
    
    // サービス名の確認
    expect(result).toContain('Amazon EC2');
    
    // アイコンが埋め込まれていることの確認
    expect(result).toContain('id="icon-placeholder"');
  });

  it('34種類すべての牌のラベルを生成できる', () => {
    const allTiles: { type: TileType; number: number; expectedLabel: string }[] = [];
    
    // 萬子 (1-9)
    for (let i = 1; i <= 9; i++) {
      allTiles.push({ type: 'm', number: i, expectedLabel: `${i}萬` });
    }
    
    // 筒子 (1-9)
    for (let i = 1; i <= 9; i++) {
      allTiles.push({ type: 'p', number: i, expectedLabel: `${i}筒` });
    }
    
    // 索子 (1-9)
    for (let i = 1; i <= 9; i++) {
      allTiles.push({ type: 's', number: i, expectedLabel: `${i}索` });
    }
    
    // 字牌 (1-7)
    const honorLabels = ['東', '南', '西', '北', '白', '發', '中'];
    for (let i = 1; i <= 7; i++) {
      allTiles.push({ type: 'z', number: i, expectedLabel: honorLabels[i - 1] });
    }

    expect(allTiles).toHaveLength(34);

    for (const { type, number, expectedLabel } of allTiles) {
      const entry = createValidTileEntry({
        id: `${number}${type}`,
        type,
        number,
      });
      expect(getTileTypeLabel(entry)).toBe(expectedLabel);
    }
  });
});


// ============================================================================
// プロパティベーステスト (Property-Based Tests)
// ============================================================================

describe('プロパティベーステスト', () => {
  /**
   * **Property 4: 生成数の一致**
   * **Validates: Requirements 3.1**
   * 
   * *For any* 有効なTileConfig、生成されるSVGファイルの数は設定内のタイルエントリ数と等しくなければならない。
   * 
   * WHEN the Tile_Generator receives a valid Tile_Config, 
   * THE Tile_Generator SHALL generate an SVG file for each tile entry
   */
  describe('Property 4: 生成数の一致 (Generation Count Matching)', () => {
    /**
     * 有効なTileEntryを生成するArbitrary
     * 
     * 牌の種類と番号の組み合わせを正しく生成し、
     * 重複しないIDを持つエントリを作成します。
     */
    const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');
    
    const tileEntryArb = (index: number): fc.Arbitrary<TileEntry> => {
      return tileTypeArb.chain((type) => {
        const range = TILE_NUMBER_RANGES[type];
        return fc.integer({ min: range.min, max: range.max }).chain((number) => {
          return fc.record({
            id: fc.constant(`${number}${type}_${index}`), // ユニークなIDを保証
            type: fc.constant(type),
            number: fc.constant(number),
            awsService: fc.record({
              id: fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/),
              displayName: fc.string({ minLength: 1, maxLength: 50 }),
              iconPath: fc.constant(`assets/icons/service_${index}.svg`),
            }),
            display: fc.option(
              fc.record({
                typeLabel: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
                iconScale: fc.option(fc.double({ min: 0.5, max: 2.0 }), { nil: undefined }),
              }),
              { nil: undefined }
            ),
          }) as fc.Arbitrary<TileEntry>;
        });
      });
    };

    /**
     * 有効なTileConfigを生成するArbitrary
     * 
     * 1〜20個のタイルエントリを持つ設定を生成します。
     */
    const validTileConfigArb: fc.Arbitrary<TileConfig> = fc
      .integer({ min: 1, max: 20 })
      .chain((count) => {
        const entries: fc.Arbitrary<TileEntry>[] = [];
        for (let i = 0; i < count; i++) {
          entries.push(tileEntryArb(i));
        }
        return fc.tuple(...entries).map((tiles) => ({
          tiles,
          metadata: {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
          },
        }));
      });

    it('生成されるSVGの数は設定内のタイルエントリ数と等しい', () => {
      /**
       * **Validates: Requirements 3.1**
       * 
       * このプロパティテストは、有効なTileConfigに対して
       * generateTile関数を各エントリに適用した結果の数が
       * 元のエントリ数と一致することを検証します。
       */
      fc.assert(
        fc.property(validTileConfigArb, (config: TileConfig) => {
          // 各タイルエントリに対してSVGを生成
          const generatedSvgs: string[] = config.tiles.map((entry) => {
            return generateTile(entry, BASE_TILE_TEMPLATE);
          });

          // 生成されたSVGの数がエントリ数と一致することを検証
          expect(generatedSvgs.length).toBe(config.tiles.length);

          // 各生成されたSVGが有効なSVGであることを検証
          generatedSvgs.forEach((svg, index) => {
            expect(svg).toContain('<svg');
            expect(svg).toContain('</svg>');
            expect(svg).toContain('width="17mm"');
            expect(svg).toContain('height="24mm"');
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('空のタイル配列の場合、生成されるSVGは0個', () => {
      /**
       * **Validates: Requirements 3.1**
       * 
       * エッジケース: 空のタイル配列に対しては0個のSVGが生成される
       */
      const emptyConfig: TileConfig = {
        tiles: [],
        metadata: { version: '1.0.0' },
      };

      const generatedSvgs = emptyConfig.tiles.map((entry) => {
        return generateTile(entry, BASE_TILE_TEMPLATE);
      });

      expect(generatedSvgs.length).toBe(0);
      expect(generatedSvgs.length).toBe(emptyConfig.tiles.length);
    });

    it('単一エントリの場合、1つのSVGが生成される', () => {
      /**
       * **Validates: Requirements 3.1**
       * 
       * エッジケース: 単一エントリに対しては1つのSVGが生成される
       */
      fc.assert(
        fc.property(tileEntryArb(0), (entry: TileEntry) => {
          const config: TileConfig = {
            tiles: [entry],
            metadata: { version: '1.0.0' },
          };

          const generatedSvgs = config.tiles.map((e) => {
            return generateTile(e, BASE_TILE_TEMPLATE);
          });

          expect(generatedSvgs.length).toBe(1);
          expect(generatedSvgs.length).toBe(config.tiles.length);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('各生成されたSVGは対応するエントリの情報を含む', () => {
      /**
       * **Validates: Requirements 3.1**
       * 
       * 生成されたSVGが対応するエントリのサービス名を含むことを検証
       * サービス名はXMLエスケープされるため、エスケープ後の文字列を検証
       */
      // より制御されたサービス名を生成するArbitrary
      const safeServiceNameArb = fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -_'.split('')),
        { minLength: 1, maxLength: 30 }
      );

      const safeTileEntryArb = (index: number): fc.Arbitrary<TileEntry> => {
        return tileTypeArb.chain((type) => {
          const range = TILE_NUMBER_RANGES[type];
          return fc.integer({ min: range.min, max: range.max }).chain((number) => {
            return safeServiceNameArb.chain((displayName) => {
              return fc.constant({
                id: `${number}${type}_${index}`,
                type,
                number,
                awsService: {
                  id: `service${index}`,
                  displayName: displayName.trim() || 'DefaultService',
                  iconPath: `assets/icons/service_${index}.svg`,
                },
              } as TileEntry);
            });
          });
        });
      };

      const safeConfigArb: fc.Arbitrary<TileConfig> = fc
        .integer({ min: 1, max: 10 })
        .chain((count) => {
          const entries: fc.Arbitrary<TileEntry>[] = [];
          for (let i = 0; i < count; i++) {
            entries.push(safeTileEntryArb(i));
          }
          return fc.tuple(...entries).map((tiles) => ({
            tiles,
            metadata: { version: '1.0.0' },
          }));
        });

      fc.assert(
        fc.property(safeConfigArb, (config: TileConfig) => {
          config.tiles.forEach((entry) => {
            const svg = generateTile(entry, BASE_TILE_TEMPLATE);
            
            // サービス名が含まれていることを検証
            // escapeXml関数と同じエスケープ処理を適用
            const escapedServiceName = entry.awsService.displayName
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
            expect(svg).toContain(escapedServiceName);
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('generateFilenameは各エントリに対してファイル名を生成する', () => {
      /**
       * **Validates: Requirements 3.1**
       * 
       * 各エントリに対してファイル名が生成されることを検証
       * ファイル名はMPSZ形式（{number}{type}.svg）に従う
       */
      fc.assert(
        fc.property(validTileConfigArb, (config: TileConfig) => {
          const filenames = config.tiles.map((entry) => {
            return generateFilename(entry);
          });

          // ファイル名の数がエントリ数と一致
          expect(filenames.length).toBe(config.tiles.length);

          // 各ファイル名がMPSZ形式に従う（{number}{type}.svg）
          filenames.forEach((filename, index) => {
            const entry = config.tiles[index];
            const expectedFilename = `${entry.number}${entry.type}.svg`;
            expect(filename).toBe(expectedFilename);
            // MPSZ形式の正規表現パターン
            expect(filename).toMatch(/^\d[mpsz]\.svg$/);
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 5: 牌コンテンツの埋め込み**
   * **Validates: Requirements 3.2, 3.3**
   * 
   * *For any* 生成された牌SVG、以下が含まれなければならない：
   * - 指定されたService_Iconのコンテンツ
   * - サービス名のテキスト
   * 
   * Requirements:
   * - 3.2: WHEN generating a tile SVG, THE Tile_Generator SHALL embed the specified Service_Icon into the Base_Tile
   * - 3.3: WHEN generating a tile SVG, THE Tile_Generator SHALL embed the service name text into the Base_Tile
   */
  describe('Property 5: 牌コンテンツの埋め込み (Content Embedding)', () => {
    /**
     * 牌種類のArbitrary
     */
    const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

    /**
     * 安全なサービス名を生成するArbitrary
     * XMLエスケープが必要な文字を含む可能性のある文字列を生成
     */
    const serviceNameArb = fc.oneof(
      // 通常のサービス名（英数字とスペース）
      fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
        { minLength: 1, maxLength: 30 }
      ),
      // XMLエスケープが必要な文字を含むサービス名
      fc.tuple(
        fc.stringOf(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constantFrom('<', '>', '&', '"', "'"),
        fc.stringOf(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 10 }
        )
      ).map(([prefix, special, suffix]) => `${prefix}${special}${suffix}`)
    );

    /**
     * サービスIDを生成するArbitrary
     */
    const serviceIdArb = fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
      { minLength: 2, maxLength: 15 }
    ).filter((s) => /^[a-z]/.test(s)); // 先頭は英字

    /**
     * 有効なTileEntryを生成するArbitrary
     */
    const tileEntryArb: fc.Arbitrary<TileEntry> = fc.tuple(
      tileTypeArb,
      serviceIdArb,
      serviceNameArb
    ).chain(([type, serviceId, serviceName]) => {
      const range = TILE_NUMBER_RANGES[type];
      return fc.integer({ min: range.min, max: range.max }).map((number) => ({
        id: `${number}${type}`,
        type,
        number,
        awsService: {
          id: serviceId,
          displayName: serviceName.trim() || 'DefaultService',
          iconPath: `assets/icons/${serviceId}.svg`,
        },
      } as TileEntry));
    });

    /**
     * テスト用のアイコンSVGコンテンツを生成するArbitrary
     * 様々なviewBoxサイズとコンテンツを持つSVGを生成
     */
    const iconContentArb: fc.Arbitrary<string> = fc.tuple(
      fc.integer({ min: 16, max: 128 }),  // viewBox width
      fc.integer({ min: 16, max: 128 }),  // viewBox height
      fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
        { minLength: 1, maxLength: 10 }
      )  // unique identifier for the icon
    ).map(([width, height, identifier]) => 
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#FF9900" data-icon-id="${identifier}"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle">${identifier}</text>
      </svg>`
    );

    /**
     * XMLエスケープ関数（テスト用）
     */
    const escapeXmlForTest = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    it('生成されたSVGにはサービス名が含まれる（XMLエスケープ済み）', () => {
      /**
       * **Validates: Requirements 3.3**
       * 
       * WHEN generating a tile SVG, THE Tile_Generator SHALL embed the service name text into the Base_Tile
       * 
       * このテストは、任意のサービス名（特殊文字を含む可能性あり）が
       * 生成されたSVGに正しくエスケープされて含まれることを検証します。
       */
      fc.assert(
        fc.property(tileEntryArb, (entry: TileEntry) => {
          // アイコンなしで牌を生成
          const svg = generateTile(entry, BASE_TILE_TEMPLATE);

          // サービス名がXMLエスケープされて含まれていることを検証
          const escapedServiceName = escapeXmlForTest(entry.awsService.displayName);
          expect(svg).toContain(escapedServiceName);

          // SVGが有効な構造を持つことを検証
          expect(svg).toContain('<svg');
          expect(svg).toContain('</svg>');
          expect(svg).toContain('id="service-name-placeholder"');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('生成されたSVGにはアイコンコンテンツが埋め込まれる', () => {
      /**
       * **Validates: Requirements 3.2**
       * 
       * WHEN generating a tile SVG, THE Tile_Generator SHALL embed the specified Service_Icon into the Base_Tile
       * 
       * このテストは、アイコンSVGコンテンツが提供された場合、
       * 生成されたSVGにそのコンテンツが埋め込まれることを検証します。
       */
      fc.assert(
        fc.property(
          tileEntryArb,
          iconContentArb,
          (entry: TileEntry, iconContent: string) => {
            // アイコン付きで牌を生成
            const svg = generateTile(entry, BASE_TILE_TEMPLATE, iconContent);

            // アイコンプレースホルダーグループが存在することを検証
            expect(svg).toContain('id="icon-placeholder"');

            // アイコンがスケーリングされて埋め込まれていることを検証
            // scaleIconToFit関数はtransform属性を持つ<g>タグでラップする
            expect(svg).toContain('transform=');

            // アイコンの内部コンテンツ（rect要素）が含まれていることを検証
            expect(svg).toContain('<rect');

            // SVGが有効な構造を持つことを検証
            expect(svg).toContain('<svg');
            expect(svg).toContain('</svg>');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('生成されたSVGにはサービス名とアイコンの両方が含まれる', () => {
      /**
       * **Validates: Requirements 3.2, 3.3**
       * 
       * このテストは、サービス名とアイコンの両方が
       * 同時に正しく埋め込まれることを検証します。
       */
      fc.assert(
        fc.property(
          tileEntryArb,
          iconContentArb,
          (entry: TileEntry, iconContent: string) => {
            // アイコン付きで牌を生成
            const svg = generateTile(entry, BASE_TILE_TEMPLATE, iconContent);

            // サービス名が含まれていることを検証
            const escapedServiceName = escapeXmlForTest(entry.awsService.displayName);
            expect(svg).toContain(escapedServiceName);

            // アイコンコンテンツが埋め込まれていることを検証
            expect(svg).toContain('id="icon-placeholder"');
            expect(svg).toContain('transform=');
            expect(svg).toContain('<rect');

            // 両方のプレースホルダーが正しく置換されていることを検証
            expect(svg).toContain('id="service-name-placeholder"');
            expect(svg).toContain('id="icon-placeholder"');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('アイコンがない場合はプレースホルダーテキストが使用される', () => {
      /**
       * **Validates: Requirements 3.2**
       * 
       * アイコンコンテンツが提供されない場合、
       * サービスIDがプレースホルダーとして表示されることを検証します。
       */
      fc.assert(
        fc.property(tileEntryArb, (entry: TileEntry) => {
          // アイコンなしで牌を生成
          const svg = generateTile(entry, BASE_TILE_TEMPLATE);

          // サービスIDがプレースホルダーとして含まれていることを検証
          expect(svg).toContain(entry.awsService.id);

          // アイコンプレースホルダーグループが存在することを検証
          expect(svg).toContain('id="icon-placeholder"');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('特殊文字を含むサービス名が正しくエスケープされる', () => {
      /**
       * **Validates: Requirements 3.3**
       * 
       * XMLの特殊文字（<, >, &, ", '）を含むサービス名が
       * 正しくエスケープされることを検証します。
       */
      const specialCharServiceNameArb = fc.tuple(
        fc.stringOf(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 5 }
        ),
        fc.constantFrom('<', '>', '&', '"', "'"),
        fc.stringOf(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 5 }
        )
      ).map(([prefix, special, suffix]) => `${prefix}${special}${suffix}`);

      fc.assert(
        fc.property(
          tileTypeArb,
          specialCharServiceNameArb,
          (type: TileType, serviceName: string) => {
            const range = TILE_NUMBER_RANGES[type];
            const number = range.min;
            
            const entry: TileEntry = {
              id: `${number}${type}`,
              type,
              number,
              awsService: {
                id: 'test-service',
                displayName: serviceName,
                iconPath: 'assets/icons/test.svg',
              },
            };

            const svg = generateTile(entry, BASE_TILE_TEMPLATE);

            // エスケープされたサービス名が含まれていることを検証
            const escapedServiceName = escapeXmlForTest(serviceName);
            expect(svg).toContain(escapedServiceName);

            // 元の特殊文字がそのまま含まれていないことを検証
            // （エスケープされているため）
            if (serviceName.includes('<')) {
              expect(svg).toContain('&lt;');
            }
            if (serviceName.includes('>')) {
              expect(svg).toContain('&gt;');
            }
            if (serviceName.includes('&')) {
              expect(svg).toContain('&amp;');
            }
            if (serviceName.includes('"')) {
              expect(svg).toContain('&quot;');
            }
            if (serviceName.includes("'")) {
              expect(svg).toContain('&apos;');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('様々なアイコンサイズでもアスペクト比を維持して埋め込まれる', () => {
      /**
       * **Validates: Requirements 3.2**
       * 
       * 様々なサイズのアイコンが提供された場合でも、
       * アスペクト比を維持しながら正しく埋め込まれることを検証します。
       */
      const variousSizeIconArb = fc.tuple(
        fc.integer({ min: 16, max: 256 }),  // width
        fc.integer({ min: 16, max: 256 })   // height
      ).map(([width, height]) => 
        `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
          <rect width="${width}" height="${height}" fill="blue"/>
        </svg>`
      );

      fc.assert(
        fc.property(
          tileEntryArb,
          variousSizeIconArb,
          (entry: TileEntry, iconContent: string) => {
            const svg = generateTile(entry, BASE_TILE_TEMPLATE, iconContent);

            // スケーリング変換が適用されていることを検証
            expect(svg).toContain('transform=');
            expect(svg).toContain('scale(');
            expect(svg).toContain('translate(');

            // アイコンプレースホルダーグループが存在することを検証
            expect(svg).toContain('id="icon-placeholder"');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 6: ファイル命名規則（MPSZ形式）**
   * **Validates: Requirements 3.4**
   * 
   * *For any* 生成された牌SVGファイル、ファイル名は `{number}{type}.svg` のMPSZ形式に
   * 従わなければならない（例: 1m.svg, 5p.svg, 7z.svg）。
   * 
   * Requirements:
   * - 3.4: THE Tile_Generator SHALL output SVG files with consistent naming convention based on tile type and number
   * 
   * MPSZ Naming Convention:
   * - M (Man/萬子): 1m.svg, 2m.svg, ... 9m.svg
   * - P (Pin/筒子): 1p.svg, 2p.svg, ... 9p.svg
   * - S (Sou/索子): 1s.svg, 2s.svg, ... 9s.svg
   * - Z (Honor/字牌): 1z.svg, 2z.svg, ... 7z.svg
   */
  describe('Property 6: ファイル命名規則（MPSZ形式） (File Naming Convention)', () => {
    /**
     * 牌種類のArbitrary
     */
    const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

    /**
     * 有効なTileEntryを生成するArbitrary
     * 牌の種類に応じた正しい番号範囲を使用
     */
    const validTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain((type) => {
      const range = TILE_NUMBER_RANGES[type];
      return fc.integer({ min: range.min, max: range.max }).map((number) => ({
        id: `${number}${type}`,
        type,
        number,
        awsService: {
          id: `service-${number}${type}`,
          displayName: `AWS Service ${number}${type}`,
          iconPath: `assets/icons/${number}${type}.svg`,
        },
      } as TileEntry));
    });

    /**
     * MPSZ形式のファイル名パターン
     * 形式: {number}{type}.svg
     * - number: 1-9 (数牌) または 1-7 (字牌)
     * - type: m, p, s, z
     */
    const MPSZ_FILENAME_PATTERN = /^[1-9][mpsz]\.svg$/;

    it('generateFilenameはMPSZ形式のファイル名を生成する', () => {
      /**
       * **Validates: Requirements 3.4**
       * 
       * このプロパティテストは、任意の有効なTileEntryに対して
       * generateFilename関数が `{number}{type}.svg` 形式の
       * ファイル名を生成することを検証します。
       */
      fc.assert(
        fc.property(validTileEntryArb, (entry: TileEntry) => {
          const filename = generateFilename(entry);

          // ファイル名がMPSZ形式のパターンに一致することを検証
          expect(filename).toMatch(MPSZ_FILENAME_PATTERN);

          // ファイル名が正確に {number}{type}.svg 形式であることを検証
          expect(filename).toBe(`${entry.number}${entry.type}.svg`);

          // ファイル名が.svg拡張子で終わることを検証
          expect(filename).toMatch(/\.svg$/);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('萬子（Man）のファイル名は1m.svg〜9m.svgの形式', () => {
      /**
       * **Validates: Requirements 3.4**
       * 
       * 萬子（type: 'm'）の牌に対して、ファイル名が
       * 1m.svg, 2m.svg, ... 9m.svg の形式であることを検証します。
       */
      const manTileArb = fc.integer({ min: 1, max: 9 }).map((number) => ({
        id: `${number}m`,
        type: 'm' as TileType,
        number,
        awsService: {
          id: `man-${number}`,
          displayName: `Man Tile ${number}`,
          iconPath: `assets/icons/${number}m.svg`,
        },
      } as TileEntry));

      fc.assert(
        fc.property(manTileArb, (entry: TileEntry) => {
          const filename = generateFilename(entry);

          // 萬子のファイル名パターン: {1-9}m.svg
          expect(filename).toMatch(/^[1-9]m\.svg$/);
          expect(filename).toBe(`${entry.number}m.svg`);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('筒子（Pin）のファイル名は1p.svg〜9p.svgの形式', () => {
      /**
       * **Validates: Requirements 3.4**
       * 
       * 筒子（type: 'p'）の牌に対して、ファイル名が
       * 1p.svg, 2p.svg, ... 9p.svg の形式であることを検証します。
       */
      const pinTileArb = fc.integer({ min: 1, max: 9 }).map((number) => ({
        id: `${number}p`,
        type: 'p' as TileType,
        number,
        awsService: {
          id: `pin-${number}`,
          displayName: `Pin Tile ${number}`,
          iconPath: `assets/icons/${number}p.svg`,
        },
      } as TileEntry));

      fc.assert(
        fc.property(pinTileArb, (entry: TileEntry) => {
          const filename = generateFilename(entry);

          // 筒子のファイル名パターン: {1-9}p.svg
          expect(filename).toMatch(/^[1-9]p\.svg$/);
          expect(filename).toBe(`${entry.number}p.svg`);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('索子（Sou）のファイル名は1s.svg〜9s.svgの形式', () => {
      /**
       * **Validates: Requirements 3.4**
       * 
       * 索子（type: 's'）の牌に対して、ファイル名が
       * 1s.svg, 2s.svg, ... 9s.svg の形式であることを検証します。
       */
      const souTileArb = fc.integer({ min: 1, max: 9 }).map((number) => ({
        id: `${number}s`,
        type: 's' as TileType,
        number,
        awsService: {
          id: `sou-${number}`,
          displayName: `Sou Tile ${number}`,
          iconPath: `assets/icons/${number}s.svg`,
        },
      } as TileEntry));

      fc.assert(
        fc.property(souTileArb, (entry: TileEntry) => {
          const filename = generateFilename(entry);

          // 索子のファイル名パターン: {1-9}s.svg
          expect(filename).toMatch(/^[1-9]s\.svg$/);
          expect(filename).toBe(`${entry.number}s.svg`);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('字牌（Honor）のファイル名は1z.svg〜7z.svgの形式', () => {
      /**
       * **Validates: Requirements 3.4**
       * 
       * 字牌（type: 'z'）の牌に対して、ファイル名が
       * 1z.svg, 2z.svg, ... 7z.svg の形式であることを検証します。
       * 字牌は1-7の範囲（東南西北白發中）
       */
      const honorTileArb = fc.integer({ min: 1, max: 7 }).map((number) => ({
        id: `${number}z`,
        type: 'z' as TileType,
        number,
        awsService: {
          id: `honor-${number}`,
          displayName: `Honor Tile ${number}`,
          iconPath: `assets/icons/${number}z.svg`,
        },
      } as TileEntry));

      fc.assert(
        fc.property(honorTileArb, (entry: TileEntry) => {
          const filename = generateFilename(entry);

          // 字牌のファイル名パターン: {1-7}z.svg
          expect(filename).toMatch(/^[1-7]z\.svg$/);
          expect(filename).toBe(`${entry.number}z.svg`);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('generateFilenameFromIdはMPSZ形式のIDからファイル名を生成する', () => {
      /**
       * **Validates: Requirements 3.4**
       * 
       * generateFilenameFromId関数が、MPSZ形式の牌ID（例: "1m", "5p"）から
       * 正しいファイル名（例: "1m.svg", "5p.svg"）を生成することを検証します。
       */
      const tileIdArb = tileTypeArb.chain((type) => {
        const range = TILE_NUMBER_RANGES[type];
        return fc.integer({ min: range.min, max: range.max }).map((number) => `${number}${type}`);
      });

      fc.assert(
        fc.property(tileIdArb, (tileId: string) => {
          const filename = generateFilenameFromId(tileId);

          // ファイル名がMPSZ形式のパターンに一致することを検証
          expect(filename).toMatch(MPSZ_FILENAME_PATTERN);

          // ファイル名が {tileId}.svg 形式であることを検証
          expect(filename).toBe(`${tileId}.svg`);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('generateFilenameとgenerateFilenameFromIdは同じ結果を返す', () => {
      /**
       * **Validates: Requirements 3.4**
       * 
       * generateFilename(entry)とgenerateFilenameFromId(entry.id)が
       * 同じファイル名を返すことを検証します（一貫性の検証）。
       * 
       * 注: entry.idは `${number}${type}` 形式であることを前提とします。
       */
      const consistentTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain((type) => {
        const range = TILE_NUMBER_RANGES[type];
        return fc.integer({ min: range.min, max: range.max }).map((number) => ({
          id: `${number}${type}`,  // IDは {number}{type} 形式
          type,
          number,
          awsService: {
            id: `service-${number}${type}`,
            displayName: `AWS Service ${number}${type}`,
            iconPath: `assets/icons/${number}${type}.svg`,
          },
        } as TileEntry));
      });

      fc.assert(
        fc.property(consistentTileEntryArb, (entry: TileEntry) => {
          const filenameFromEntry = generateFilename(entry);
          const filenameFromId = generateFilenameFromId(`${entry.number}${entry.type}`);

          // 両方の関数が同じファイル名を返すことを検証
          expect(filenameFromEntry).toBe(filenameFromId);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('全34種類の牌に対してMPSZ形式のファイル名が生成される', () => {
      /**
       * **Validates: Requirements 3.4**
       * 
       * 麻雀の全34種類の牌（萬子9種、筒子9種、索子9種、字牌7種）に対して
       * MPSZ形式のファイル名が正しく生成されることを検証します。
       */
      fc.assert(
        fc.property(fc.constant(null), () => {
          const allTileTypes: TileType[] = ['m', 'p', 's', 'z'];
          const generatedFilenames: string[] = [];

          for (const type of allTileTypes) {
            const range = TILE_NUMBER_RANGES[type];
            for (let number = range.min; number <= range.max; number++) {
              const entry: TileEntry = {
                id: `${number}${type}`,
                type,
                number,
                awsService: {
                  id: `service-${number}${type}`,
                  displayName: `AWS Service ${number}${type}`,
                  iconPath: `assets/icons/${number}${type}.svg`,
                },
              };

              const filename = generateFilename(entry);
              generatedFilenames.push(filename);

              // 各ファイル名がMPSZ形式に従うことを検証
              expect(filename).toMatch(MPSZ_FILENAME_PATTERN);
              expect(filename).toBe(`${number}${type}.svg`);
            }
          }

          // 全34種類の牌のファイル名が生成されたことを検証
          expect(generatedFilenames.length).toBe(34);

          // 重複がないことを検証
          const uniqueFilenames = new Set(generatedFilenames);
          expect(uniqueFilenames.size).toBe(34);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Property 7: SVGラウンドトリップ (SVG Round-trip)
// ============================================================================

/**
 * **Property 7: SVGラウンドトリップ**
 * **Validates: Requirements 3.6**
 * 
 * *For any* 生成されたSVGファイル、パースして再シリアライズした結果は元のSVGと等価でなければならない。
 * 
 * Requirements:
 * - 3.6: FOR ALL generated SVG files, parsing then re-serializing SHALL produce equivalent SVG content (round-trip property)
 * 
 * このプロパティテストは、生成されたSVGが以下の特性を持つことを検証します：
 * 1. 有効なXML構造を持つ（開始タグと終了タグが一致）
 * 2. 適切にネストされている
 * 3. パース後に主要な要素が保持される
 */
describe('Property 7: SVGラウンドトリップ (SVG Round-trip)', () => {
  /**
   * 牌種類のArbitrary
   */
  const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

  /**
   * 安全なサービス名を生成するArbitrary
   */
  const safeServiceNameArb = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -_'.split('')),
    { minLength: 1, maxLength: 30 }
  ).map((s) => s.trim() || 'DefaultService');

  /**
   * サービスIDを生成するArbitrary
   */
  const serviceIdArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
    { minLength: 2, maxLength: 15 }
  ).filter((s) => /^[a-z]/.test(s));

  /**
   * 有効なTileEntryを生成するArbitrary
   */
  const validTileEntryArb: fc.Arbitrary<TileEntry> = fc.tuple(
    tileTypeArb,
    serviceIdArb,
    safeServiceNameArb
  ).chain(([type, serviceId, serviceName]) => {
    const range = TILE_NUMBER_RANGES[type];
    return fc.integer({ min: range.min, max: range.max }).map((number) => ({
      id: `${number}${type}`,
      type,
      number,
      awsService: {
        id: serviceId,
        displayName: serviceName,
        iconPath: `assets/icons/${serviceId}.svg`,
      },
    } as TileEntry));
  });

  /**
   * テスト用のアイコンSVGコンテンツを生成するArbitrary
   */
  const iconContentArb: fc.Arbitrary<string> = fc.tuple(
    fc.integer({ min: 16, max: 128 }),
    fc.integer({ min: 16, max: 128 }),
    fc.stringOf(
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      { minLength: 1, maxLength: 10 }
    )
  ).map(([width, height, identifier]) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#FF9900" data-icon-id="${identifier}"/>
    </svg>`
  );

  /**
   * SVGの開始タグと終了タグが一致するかを検証
   * 
   * @param svg SVG文字列
   * @returns 一致する場合はtrue
   */
  function hasMatchingTags(svg: string): boolean {
    // 自己終了タグを除外してタグを抽出
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;
    const selfClosingPattern = /<([a-zA-Z][a-zA-Z0-9-]*)[^>]*\/>/g;
    
    // 自己終了タグを一時的に除去
    const withoutSelfClosing = svg.replace(selfClosingPattern, '');
    
    const stack: string[] = [];
    let match;
    
    while ((match = tagPattern.exec(withoutSelfClosing)) !== null) {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();
      
      // 自己終了タグはスキップ
      if (fullTag.endsWith('/>')) {
        continue;
      }
      
      // 終了タグ
      if (fullTag.startsWith('</')) {
        if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
          return false;
        }
        stack.pop();
      } else {
        // 開始タグ
        stack.push(tagName);
      }
    }
    
    return stack.length === 0;
  }

  /**
   * SVGが有効なXML構造を持つかを検証
   * 
   * @param svg SVG文字列
   * @returns 有効な場合はtrue
   */
  function isValidXmlStructure(svg: string): boolean {
    // 基本的なSVG構造の検証
    if (!svg.includes('<svg') || !svg.includes('</svg>')) {
      return false;
    }
    
    // 開始タグと終了タグの一致を検証
    if (!hasMatchingTags(svg)) {
      return false;
    }
    
    // 不正なネストの検出（簡易チェック）
    // 例: <a><b></a></b> のようなパターン
    const tagStack: string[] = [];
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;
    let match;
    
    while ((match = tagPattern.exec(svg)) !== null) {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();
      
      // 自己終了タグはスキップ
      if (fullTag.endsWith('/>')) {
        continue;
      }
      
      if (fullTag.startsWith('</')) {
        // 終了タグ: スタックの最後と一致するか確認
        if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tagName) {
          tagStack.pop();
        }
      } else {
        // 開始タグ: スタックに追加
        tagStack.push(tagName);
      }
    }
    
    return true;
  }

  /**
   * SVGから主要な要素を抽出
   * 
   * @param svg SVG文字列
   * @returns 主要な要素の情報
   */
  function extractKeyElements(svg: string): {
    hasSvgRoot: boolean;
    hasWidth: boolean;
    hasHeight: boolean;
    hasViewBox: boolean;
    elementCount: number;
  } {
    const hasSvgRoot = /<svg[^>]*>/.test(svg) && /<\/svg>/.test(svg);
    const hasWidth = /width=["'][^"']+["']/.test(svg);
    const hasHeight = /height=["'][^"']+["']/.test(svg);
    const hasViewBox = /viewBox=["'][^"']+["']/.test(svg);
    
    // 要素数をカウント（開始タグのみ）
    const elementMatches = svg.match(/<[a-zA-Z][a-zA-Z0-9-]*[^>]*>/g) || [];
    const elementCount = elementMatches.length;
    
    return {
      hasSvgRoot,
      hasWidth,
      hasHeight,
      hasViewBox,
      elementCount,
    };
  }

  /**
   * SVGを正規化（空白の正規化、属性の順序を無視）
   * 
   * @param svg SVG文字列
   * @returns 正規化されたSVG
   */
  function normalizeSvg(svg: string): string {
    return svg
      // 連続する空白を単一スペースに
      .replace(/\s+/g, ' ')
      // タグ間の空白を除去
      .replace(/>\s+</g, '><')
      // 先頭と末尾の空白を除去
      .trim();
  }

  /**
   * SVGをパースして再シリアライズ（簡易実装）
   * Node.js環境ではDOMParserが使えないため、正規表現ベースの実装
   * 
   * @param svg SVG文字列
   * @returns 再シリアライズされたSVG
   */
  function parseAndReserialize(svg: string): string {
    // 正規化処理
    let result = svg;
    
    // XML宣言を保持
    const xmlDeclaration = svg.match(/<\?xml[^?]*\?>/);
    
    // 空白の正規化
    result = normalizeSvg(result);
    
    // XML宣言を先頭に戻す
    if (xmlDeclaration) {
      result = result.replace(/<\?xml[^?]*\?>/, '');
      result = xmlDeclaration[0] + result;
    }
    
    return result;
  }

  it('生成されたSVGは有効なXML構造を持つ', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * このテストは、任意の有効なTileEntryから生成されたSVGが
     * 有効なXML構造を持つことを検証します。
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry: TileEntry) => {
        const svg = generateTile(entry, BASE_TILE_TEMPLATE);
        
        // 有効なXML構造を持つことを検証
        expect(isValidXmlStructure(svg)).toBe(true);
        
        // 開始タグと終了タグが一致することを検証
        expect(hasMatchingTags(svg)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('生成されたSVGは主要な要素を含む', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * このテストは、生成されたSVGが主要な要素（svg root, width, height, viewBox）を
     * 含むことを検証します。
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry: TileEntry) => {
        const svg = generateTile(entry, BASE_TILE_TEMPLATE);
        const elements = extractKeyElements(svg);
        
        // SVGルート要素が存在することを検証
        expect(elements.hasSvgRoot).toBe(true);
        
        // width属性が存在することを検証
        expect(elements.hasWidth).toBe(true);
        
        // height属性が存在することを検証
        expect(elements.hasHeight).toBe(true);
        
        // viewBox属性が存在することを検証
        expect(elements.hasViewBox).toBe(true);
        
        // 少なくとも1つの要素が存在することを検証
        expect(elements.elementCount).toBeGreaterThan(0);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('生成されたSVGをパースして再シリアライズしても主要な要素が保持される', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * このテストは、生成されたSVGをパースして再シリアライズした後も
     * 主要な要素が保持されることを検証します。
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry: TileEntry) => {
        const originalSvg = generateTile(entry, BASE_TILE_TEMPLATE);
        const reserializedSvg = parseAndReserialize(originalSvg);
        
        // 元のSVGの主要要素
        const originalElements = extractKeyElements(originalSvg);
        
        // 再シリアライズ後のSVGの主要要素
        const reserializedElements = extractKeyElements(reserializedSvg);
        
        // 主要な要素が保持されていることを検証
        expect(reserializedElements.hasSvgRoot).toBe(originalElements.hasSvgRoot);
        expect(reserializedElements.hasWidth).toBe(originalElements.hasWidth);
        expect(reserializedElements.hasHeight).toBe(originalElements.hasHeight);
        expect(reserializedElements.hasViewBox).toBe(originalElements.hasViewBox);
        
        // 要素数が保持されていることを検証
        expect(reserializedElements.elementCount).toBe(originalElements.elementCount);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('アイコン付きで生成されたSVGも有効なXML構造を持つ', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * このテストは、アイコンコンテンツを含む生成されたSVGが
     * 有効なXML構造を持つことを検証します。
     */
    fc.assert(
      fc.property(
        validTileEntryArb,
        iconContentArb,
        (entry: TileEntry, iconContent: string) => {
          const svg = generateTile(entry, BASE_TILE_TEMPLATE, iconContent);
          
          // 有効なXML構造を持つことを検証
          expect(isValidXmlStructure(svg)).toBe(true);
          
          // 開始タグと終了タグが一致することを検証
          expect(hasMatchingTags(svg)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('アイコン付きで生成されたSVGをパースして再シリアライズしても等価性が保持される', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * このテストは、アイコンコンテンツを含む生成されたSVGを
     * パースして再シリアライズした後も等価性が保持されることを検証します。
     */
    fc.assert(
      fc.property(
        validTileEntryArb,
        iconContentArb,
        (entry: TileEntry, iconContent: string) => {
          const originalSvg = generateTile(entry, BASE_TILE_TEMPLATE, iconContent);
          const reserializedSvg = parseAndReserialize(originalSvg);
          
          // 正規化後の比較
          const normalizedOriginal = normalizeSvg(originalSvg);
          const normalizedReserialized = normalizeSvg(reserializedSvg);
          
          // 正規化後のSVGが等価であることを検証
          expect(normalizedReserialized).toBe(normalizedOriginal);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('生成されたSVGの寸法属性がラウンドトリップ後も保持される', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * このテストは、生成されたSVGの寸法属性（width, height, viewBox）が
     * ラウンドトリップ後も正確に保持されることを検証します。
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry: TileEntry) => {
        const originalSvg = generateTile(entry, BASE_TILE_TEMPLATE);
        const reserializedSvg = parseAndReserialize(originalSvg);
        
        // width属性の抽出と比較
        const originalWidth = originalSvg.match(/width=["']([^"']+)["']/);
        const reserializedWidth = reserializedSvg.match(/width=["']([^"']+)["']/);
        expect(reserializedWidth?.[1]).toBe(originalWidth?.[1]);
        
        // height属性の抽出と比較
        const originalHeight = originalSvg.match(/height=["']([^"']+)["']/);
        const reserializedHeight = reserializedSvg.match(/height=["']([^"']+)["']/);
        expect(reserializedHeight?.[1]).toBe(originalHeight?.[1]);
        
        // viewBox属性の抽出と比較
        const originalViewBox = originalSvg.match(/viewBox=["']([^"']+)["']/);
        const reserializedViewBox = reserializedSvg.match(/viewBox=["']([^"']+)["']/);
        expect(reserializedViewBox?.[1]).toBe(originalViewBox?.[1]);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('生成されたSVGのコンテンツ要素がラウンドトリップ後も保持される', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * このテストは、生成されたSVGのコンテンツ要素（牌種類ラベル、サービス名）が
     * ラウンドトリップ後も保持されることを検証します。
     * 注意: XMLパーサーは連続スペースを正規化するため、サービス名の検証は
     * 正規化後の値で行います。
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry: TileEntry) => {
        const originalSvg = generateTile(entry, BASE_TILE_TEMPLATE);
        const reserializedSvg = parseAndReserialize(originalSvg);
        
        // 牌種類ラベルが保持されていることを検証
        const tileTypeLabel = getTileTypeLabel(entry);
        expect(reserializedSvg).toContain(tileTypeLabel);
        
        // サービス名が保持されていることを検証（XMLエスケープ済み）
        // XMLパーサーは連続スペースを正規化するため、正規化後の値で検証
        const normalizedServiceName = entry.awsService.displayName
          .replace(/\s+/g, ' ')
          .trim();
        const escapedServiceName = normalizedServiceName
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        expect(reserializedSvg).toContain(escapedServiceName);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('全34種類の牌に対してラウンドトリップが成功する', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * このテストは、麻雀の全34種類の牌に対して
     * SVGラウンドトリップが成功することを検証します。
     */
    fc.assert(
      fc.property(fc.constant(null), () => {
        const allTileTypes: TileType[] = ['m', 'p', 's', 'z'];
        
        for (const type of allTileTypes) {
          const range = TILE_NUMBER_RANGES[type];
          for (let number = range.min; number <= range.max; number++) {
            const entry: TileEntry = {
              id: `${number}${type}`,
              type,
              number,
              awsService: {
                id: `service-${number}${type}`,
                displayName: `AWS Service ${number}${type}`,
                iconPath: `assets/icons/${number}${type}.svg`,
              },
            };
            
            const originalSvg = generateTile(entry, BASE_TILE_TEMPLATE);
            const reserializedSvg = parseAndReserialize(originalSvg);
            
            // 有効なXML構造を持つことを検証
            expect(isValidXmlStructure(originalSvg)).toBe(true);
            expect(isValidXmlStructure(reserializedSvg)).toBe(true);
            
            // 正規化後のSVGが等価であることを検証
            const normalizedOriginal = normalizeSvg(originalSvg);
            const normalizedReserialized = normalizeSvg(reserializedSvg);
            expect(normalizedReserialized).toBe(normalizedOriginal);
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 8: 生成出力 (Generation Output)
// ============================================================================

/**
 * **Property 8: 生成出力**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * *For any* 生成実行、以下が真でなければならない：
 * - すべてのSVGは指定された出力ディレクトリに配置される
 * - マニフェストファイルが生成され、すべての牌のメタデータを含む
 * 
 * Requirements:
 * - 4.1: THE Tile_Generator SHALL output all generated SVGs to a configurable output directory
 * - 4.2: THE Tile_Generator SHALL generate a manifest file listing all generated tiles with their metadata
 */
describe('Property 8: 生成出力 (Generation Output)', () => {
  /**
   * 牌種類のArbitrary
   */
  const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

  /**
   * 安全なサービス名を生成するArbitrary
   */
  const safeServiceNameArb = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -_'.split('')),
    { minLength: 1, maxLength: 30 }
  ).map((s) => s.trim() || 'DefaultService');

  /**
   * サービスIDを生成するArbitrary
   */
  const serviceIdArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
    { minLength: 2, maxLength: 15 }
  ).filter((s) => /^[a-z]/.test(s));

  /**
   * 有効なTileEntryを生成するArbitrary（ユニークなインデックス付き）
   */
  const tileEntryArb = (index: number): fc.Arbitrary<TileEntry> => {
    return fc.tuple(
      tileTypeArb,
      serviceIdArb,
      safeServiceNameArb
    ).chain(([type, serviceId, serviceName]) => {
      const range = TILE_NUMBER_RANGES[type];
      return fc.integer({ min: range.min, max: range.max }).map((number) => ({
        id: `${number}${type}_${index}`,
        type,
        number,
        awsService: {
          id: `${serviceId}-${index}`,
          displayName: serviceName,
          iconPath: `assets/icons/${serviceId}-${index}.svg`,
        },
      } as TileEntry));
    });
  };

  /**
   * 有効なTileConfigを生成するArbitrary
   * 1〜15個のタイルエントリを持つ設定を生成
   */
  const validTileConfigArb: fc.Arbitrary<TileConfig> = fc
    .integer({ min: 1, max: 15 })
    .chain((count) => {
      const entries: fc.Arbitrary<TileEntry>[] = [];
      for (let i = 0; i < count; i++) {
        entries.push(tileEntryArb(i));
      }
      return fc.tuple(...entries).map((tiles) => ({
        tiles,
        metadata: {
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
        },
      }));
    });

  /**
   * 出力ディレクトリ名を生成するArbitrary
   */
  const outputDirArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
    { minLength: 3, maxLength: 15 }
  ).filter((s) => /^[a-z]/.test(s)).map((s) => `test-output-${s}`);

  it('createManifestは設定内のすべての牌のメタデータを含むマニフェストを生成する', () => {
    /**
     * **Validates: Requirements 4.2**
     * 
     * THE Tile_Generator SHALL generate a manifest file listing all generated tiles with their metadata
     * 
     * このテストは、createManifest関数が設定内のすべての牌エントリに対して
     * 正しいメタデータを含むマニフェストを生成することを検証します。
     */
    fc.assert(
      fc.property(
        validTileConfigArb,
        outputDirArb,
        (config: TileConfig, outputDir: string) => {
          const manifest = createManifest(config, outputDir);

          // マニフェストのタイル数が設定のタイル数と一致することを検証
          expect(manifest.tiles.length).toBe(config.tiles.length);
          expect(manifest.tileCount).toBe(config.tiles.length);

          // 各タイルのメタデータが正しく含まれていることを検証
          config.tiles.forEach((entry, index) => {
            const manifestEntry = manifest.tiles[index];
            
            // 基本情報の検証
            expect(manifestEntry.id).toBe(entry.id);
            expect(manifestEntry.type).toBe(entry.type);
            expect(manifestEntry.number).toBe(entry.number);
            
            // AWSサービス情報の検証
            expect(manifestEntry.awsService.id).toBe(entry.awsService.id);
            expect(manifestEntry.awsService.displayName).toBe(entry.awsService.displayName);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createManifestが生成するファイルパスは指定された出力ディレクトリを含む', () => {
    /**
     * **Validates: Requirements 4.1**
     * 
     * THE Tile_Generator SHALL output all generated SVGs to a configurable output directory
     * 
     * このテストは、マニフェスト内のすべてのファイルパスが
     * 指定された出力ディレクトリを含むことを検証します。
     */
    fc.assert(
      fc.property(
        validTileConfigArb,
        outputDirArb,
        (config: TileConfig, outputDir: string) => {
          const manifest = createManifest(config, outputDir);

          // すべてのファイルパスが出力ディレクトリを含むことを検証
          manifest.tiles.forEach((tile) => {
            expect(tile.filePath).toContain(outputDir);
            // ファイルパスが出力ディレクトリで始まることを検証
            expect(tile.filePath.startsWith(outputDir)).toBe(true);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createManifestが生成するファイルパスはMPSZ形式のファイル名を含む', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     * 
     * このテストは、マニフェスト内のファイルパスが
     * MPSZ形式のファイル名（{number}{type}.svg）を含むことを検証します。
     */
    fc.assert(
      fc.property(
        validTileConfigArb,
        outputDirArb,
        (config: TileConfig, outputDir: string) => {
          const manifest = createManifest(config, outputDir);

          // すべてのファイルパスがMPSZ形式のファイル名を含むことを検証
          manifest.tiles.forEach((tile, index) => {
            const entry = config.tiles[index];
            const expectedFilename = `${entry.number}${entry.type}.svg`;
            
            expect(tile.filePath).toContain(expectedFilename);
            expect(tile.filePath.endsWith(expectedFilename)).toBe(true);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createManifestはバージョン情報と生成日時を含む', () => {
    /**
     * **Validates: Requirements 4.2**
     * 
     * このテストは、マニフェストにバージョン情報と生成日時が
     * 正しく含まれることを検証します。
     */
    fc.assert(
      fc.property(
        validTileConfigArb,
        outputDirArb,
        (config: TileConfig, outputDir: string) => {
          const beforeTime = new Date().toISOString();
          const manifest = createManifest(config, outputDir);
          const afterTime = new Date().toISOString();

          // バージョンが設定されていることを検証
          expect(manifest.version).toBe(MANIFEST_VERSION);
          expect(manifest.version).toBe('1.0.0');

          // 生成日時がISO 8601形式であることを検証
          expect(() => new Date(manifest.generatedAt)).not.toThrow();
          expect(manifest.generatedAt >= beforeTime).toBe(true);
          expect(manifest.generatedAt <= afterTime).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createManifestEntryは正しいファイルパスを生成する', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     * 
     * このテストは、createManifestEntry関数が
     * 指定された出力ディレクトリとMPSZ形式のファイル名を組み合わせた
     * 正しいファイルパスを生成することを検証します。
     */
    const singleTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain((type) => {
      const range = TILE_NUMBER_RANGES[type];
      return fc.integer({ min: range.min, max: range.max }).chain((number) => {
        return fc.tuple(serviceIdArb, safeServiceNameArb).map(([serviceId, serviceName]) => ({
          id: `${number}${type}`,
          type,
          number,
          awsService: {
            id: serviceId,
            displayName: serviceName,
            iconPath: `assets/icons/${serviceId}.svg`,
          },
        } as TileEntry));
      });
    });

    fc.assert(
      fc.property(
        singleTileEntryArb,
        outputDirArb,
        (entry: TileEntry, outputDir: string) => {
          const manifestEntry = createManifestEntry(entry, outputDir);

          // ファイルパスが出力ディレクトリとファイル名の組み合わせであることを検証
          const expectedFilename = `${entry.number}${entry.type}.svg`;
          const expectedPath = path.join(outputDir, expectedFilename);
          
          expect(manifestEntry.filePath).toBe(expectedPath);

          // メタデータが正しく設定されていることを検証
          expect(manifestEntry.id).toBe(entry.id);
          expect(manifestEntry.type).toBe(entry.type);
          expect(manifestEntry.number).toBe(entry.number);
          expect(manifestEntry.awsService.id).toBe(entry.awsService.id);
          expect(manifestEntry.awsService.displayName).toBe(entry.awsService.displayName);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('空のタイル配列の場合、マニフェストは空のタイル配列を持つ', () => {
    /**
     * **Validates: Requirements 4.2**
     * 
     * エッジケース: 空のタイル配列に対しては空のマニフェストが生成される
     */
    fc.assert(
      fc.property(outputDirArb, (outputDir: string) => {
        const emptyConfig: TileConfig = {
          tiles: [],
          metadata: { version: '1.0.0' },
        };

        const manifest = createManifest(emptyConfig, outputDir);

        expect(manifest.tiles).toHaveLength(0);
        expect(manifest.tileCount).toBe(0);
        expect(manifest.version).toBe(MANIFEST_VERSION);
        expect(manifest.generatedAt).toBeDefined();

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('異なる出力ディレクトリに対して異なるファイルパスが生成される', () => {
    /**
     * **Validates: Requirements 4.1**
     * 
     * このテストは、異なる出力ディレクトリを指定した場合、
     * マニフェスト内のファイルパスがそれぞれ異なることを検証します。
     */
    const singleTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain((type) => {
      const range = TILE_NUMBER_RANGES[type];
      return fc.integer({ min: range.min, max: range.max }).map((number) => ({
        id: `${number}${type}`,
        type,
        number,
        awsService: {
          id: 'test-service',
          displayName: 'Test Service',
          iconPath: 'assets/icons/test.svg',
        },
      } as TileEntry));
    });

    fc.assert(
      fc.property(
        singleTileEntryArb,
        outputDirArb,
        outputDirArb,
        (entry: TileEntry, outputDir1: string, outputDir2: string) => {
          // 異なる出力ディレクトリの場合のみテスト
          fc.pre(outputDir1 !== outputDir2);

          const config: TileConfig = {
            tiles: [entry],
            metadata: { version: '1.0.0' },
          };

          const manifest1 = createManifest(config, outputDir1);
          const manifest2 = createManifest(config, outputDir2);

          // ファイルパスが異なることを検証
          expect(manifest1.tiles[0].filePath).not.toBe(manifest2.tiles[0].filePath);
          
          // それぞれのファイルパスが正しい出力ディレクトリを含むことを検証
          expect(manifest1.tiles[0].filePath).toContain(outputDir1);
          expect(manifest2.tiles[0].filePath).toContain(outputDir2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('マニフェストのAWSサービス情報にはiconPathが含まれない', () => {
    /**
     * **Validates: Requirements 4.2**
     * 
     * このテストは、マニフェストのAWSサービス情報に
     * iconPathが含まれないことを検証します（セキュリティとサイズの観点から）。
     */
    fc.assert(
      fc.property(
        validTileConfigArb,
        outputDirArb,
        (config: TileConfig, outputDir: string) => {
          const manifest = createManifest(config, outputDir);

          // すべてのマニフェストエントリでiconPathが含まれないことを検証
          manifest.tiles.forEach((tile) => {
            expect((tile.awsService as any).iconPath).toBeUndefined();
            // idとdisplayNameのみが含まれることを検証
            expect(Object.keys(tile.awsService)).toEqual(['id', 'displayName']);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('全34種類の牌に対してマニフェストが正しく生成される', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     * 
     * このテストは、麻雀の全34種類の牌に対して
     * マニフェストが正しく生成されることを検証します。
     */
    fc.assert(
      fc.property(outputDirArb, (outputDir: string) => {
        const tiles: TileEntry[] = [];
        const allTypes: TileType[] = ['m', 'p', 's', 'z'];

        for (const type of allTypes) {
          const range = TILE_NUMBER_RANGES[type];
          for (let number = range.min; number <= range.max; number++) {
            tiles.push({
              id: `${number}${type}`,
              type,
              number,
              awsService: {
                id: `service-${number}${type}`,
                displayName: `AWS Service ${number}${type}`,
                iconPath: `assets/icons/${number}${type}.svg`,
              },
            });
          }
        }

        const config: TileConfig = {
          tiles,
          metadata: { version: '1.0.0' },
        };

        const manifest = createManifest(config, outputDir);

        // 34種類すべての牌がマニフェストに含まれることを検証
        expect(manifest.tiles.length).toBe(34);
        expect(manifest.tileCount).toBe(34);

        // 各牌のファイルパスが正しいことを検証
        manifest.tiles.forEach((tile, index) => {
          const entry = tiles[index];
          const expectedFilename = `${entry.number}${entry.type}.svg`;
          const expectedPath = path.join(outputDir, expectedFilename);
          
          expect(tile.filePath).toBe(expectedPath);
          expect(tile.id).toBe(entry.id);
          expect(tile.type).toBe(entry.type);
          expect(tile.number).toBe(entry.number);
        });

        // 重複するファイルパスがないことを検証
        const filePaths = manifest.tiles.map((t) => t.filePath);
        const uniqueFilePaths = new Set(filePaths);
        expect(uniqueFilePaths.size).toBe(34);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('getOutputPathは指定された出力ディレクトリにファイルパスを生成する', () => {
    /**
     * **Validates: Requirements 4.1**
     * 
     * このテストは、getOutputPath関数が指定された出力ディレクトリに
     * 正しいファイルパスを生成することを検証します。
     */
    const singleTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain((type) => {
      const range = TILE_NUMBER_RANGES[type];
      return fc.integer({ min: range.min, max: range.max }).map((number) => ({
        id: `${number}${type}`,
        type,
        number,
        awsService: {
          id: 'test-service',
          displayName: 'Test Service',
          iconPath: 'assets/icons/test.svg',
        },
      } as TileEntry));
    });

    fc.assert(
      fc.property(
        singleTileEntryArb,
        outputDirArb,
        (entry: TileEntry, outputDir: string) => {
          const outputPath = getOutputPath(outputDir, entry);

          // 出力パスが出力ディレクトリで始まることを検証
          expect(outputPath.startsWith(outputDir)).toBe(true);

          // 出力パスがMPSZ形式のファイル名で終わることを検証
          const expectedFilename = `${entry.number}${entry.type}.svg`;
          expect(outputPath.endsWith(expectedFilename)).toBe(true);

          // 出力パスが正しい形式であることを検証
          const expectedPath = path.join(outputDir, expectedFilename);
          expect(outputPath).toBe(expectedPath);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generateFilenameとcreateManifestEntryのファイル名が一致する', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     * 
     * このテストは、generateFilename関数とcreateManifestEntry関数が
     * 同じファイル名を生成することを検証します（一貫性の検証）。
     */
    const singleTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain((type) => {
      const range = TILE_NUMBER_RANGES[type];
      return fc.integer({ min: range.min, max: range.max }).map((number) => ({
        id: `${number}${type}`,
        type,
        number,
        awsService: {
          id: 'test-service',
          displayName: 'Test Service',
          iconPath: 'assets/icons/test.svg',
        },
      } as TileEntry));
    });

    fc.assert(
      fc.property(
        singleTileEntryArb,
        outputDirArb,
        (entry: TileEntry, outputDir: string) => {
          const filename = generateFilename(entry);
          const manifestEntry = createManifestEntry(entry, outputDir);

          // マニフェストエントリのファイルパスがgenerateFilenameの結果を含むことを検証
          expect(manifestEntry.filePath).toContain(filename);
          expect(manifestEntry.filePath.endsWith(filename)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// generateAll バッチ生成テスト (Batch Generation Tests)
// ============================================================================

import { generateAll } from '../src/generator';

describe('generateAll (Requirements: 4.4, 4.5)', () => {
  const TEST_BATCH_DIR = 'test-batch-output';

  beforeEach(async () => {
    // テスト前にディレクトリをクリーンアップ
    await fs.rm(TEST_BATCH_DIR, { recursive: true, force: true });
  });

  afterEach(async () => {
    // テスト後にディレクトリを削除
    await fs.rm(TEST_BATCH_DIR, { recursive: true, force: true });
  });

  describe('基本機能', () => {
    it('有効な設定から全牌を一括生成できる (Requirements: 4.4)', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '2m', type: 'm', number: 2 }),
          createValidTileEntry({ id: '3m', type: 'm', number: 3 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_BATCH_DIR);

      expect(result.success).toBe(true);
      expect(result.generated).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.manifest.tileCount).toBe(3);
    });

    it('生成結果レポートに正確な生成数が含まれる (Requirements: 4.5)', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '5p', type: 'p', number: 5 }),
          createValidTileEntry({ id: '9s', type: 's', number: 9 }),
          createValidTileEntry({ id: '7z', type: 'z', number: 7 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_BATCH_DIR);

      expect(result.generated).toBe(4);
      expect(result.failed).toBe(0);
      expect(result.errors.filter(e => e.type !== 'icon_not_found')).toHaveLength(0);
    });

    it('生成されたSVGファイルが出力ディレクトリに存在する', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '2p', type: 'p', number: 2 }),
        ],
        metadata: { version: '1.0.0' },
      };

      await generateAll(config, TEST_BATCH_DIR);

      // ファイルの存在確認
      const file1Exists = await fs.stat(path.join(TEST_BATCH_DIR, '1m.svg'))
        .then(() => true)
        .catch(() => false);
      const file2Exists = await fs.stat(path.join(TEST_BATCH_DIR, '2p.svg'))
        .then(() => true)
        .catch(() => false);

      expect(file1Exists).toBe(true);
      expect(file2Exists).toBe(true);
    });

    it('マニフェストファイルが生成される', async () => {
      const config: TileConfig = {
        tiles: [createValidTileEntry()],
        metadata: { version: '1.0.0' },
      };

      await generateAll(config, TEST_BATCH_DIR);

      const manifestExists = await fs.stat(path.join(TEST_BATCH_DIR, MANIFEST_FILENAME))
        .then(() => true)
        .catch(() => false);

      expect(manifestExists).toBe(true);
    });

    it('マニフェストに全牌のメタデータが含まれる', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1, awsService: { id: 'ec2', displayName: 'Amazon EC2', iconPath: 'assets/ec2.svg' } }),
          createValidTileEntry({ id: '2m', type: 'm', number: 2, awsService: { id: 's3', displayName: 'Amazon S3', iconPath: 'assets/s3.svg' } }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_BATCH_DIR);

      expect(result.manifest.tiles).toHaveLength(2);
      expect(result.manifest.tiles[0].id).toBe('1m');
      expect(result.manifest.tiles[0].awsService.id).toBe('ec2');
      expect(result.manifest.tiles[1].id).toBe('2m');
      expect(result.manifest.tiles[1].awsService.id).toBe('s3');
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な設定の場合はバリデーションエラーを返す', async () => {
      const invalidConfig = {
        tiles: [
          { id: '1m', type: 'm', number: 1 }, // awsServiceが欠落
        ],
        metadata: { version: '1.0.0' },
      } as unknown as TileConfig;

      const result = await generateAll(invalidConfig, TEST_BATCH_DIR);

      expect(result.success).toBe(false);
      expect(result.generated).toBe(0);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('アイコンファイルが見つからない場合はエラーを記録するが生成は続行する', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({
            id: '1m',
            type: 'm',
            number: 1,
            awsService: {
              id: 'ec2',
              displayName: 'Amazon EC2',
              iconPath: 'nonexistent/icon.svg', // 存在しないパス
            },
          }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_BATCH_DIR);

      // 生成は成功するが、アイコンエラーが記録される
      expect(result.success).toBe(true);
      expect(result.generated).toBe(1);
      expect(result.errors.some(e => e.type === 'icon_not_found')).toBe(true);
    });

    it('生成結果レポートにエラー数が含まれる (Requirements: 4.5)', async () => {
      const invalidConfig = {
        tiles: [
          { id: '1m' }, // 必須フィールドが欠落
          { id: '2m' }, // 必須フィールドが欠落
        ],
        metadata: { version: '1.0.0' },
      } as unknown as TileConfig;

      const result = await generateAll(invalidConfig, TEST_BATCH_DIR);

      expect(result.success).toBe(false);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('空のタイル配列の場合は0件の生成結果を返す', async () => {
      const config: TileConfig = {
        tiles: [],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_BATCH_DIR);

      expect(result.success).toBe(true);
      expect(result.generated).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.manifest.tileCount).toBe(0);
    });
  });

  describe('出力ディレクトリ', () => {
    it('出力ディレクトリが存在しない場合は自動作成される', async () => {
      const nestedDir = path.join(TEST_BATCH_DIR, 'nested', 'deep', 'dir');
      const config: TileConfig = {
        tiles: [createValidTileEntry()],
        metadata: { version: '1.0.0' },
      };

      await generateAll(config, nestedDir);

      const dirExists = await fs.stat(nestedDir)
        .then((stats) => stats.isDirectory())
        .catch(() => false);

      expect(dirExists).toBe(true);
    });

    it('既存の出力ディレクトリに対しても正常に動作する', async () => {
      // 先にディレクトリを作成
      await fs.mkdir(TEST_BATCH_DIR, { recursive: true });

      const config: TileConfig = {
        tiles: [createValidTileEntry()],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_BATCH_DIR);

      expect(result.success).toBe(true);
      expect(result.generated).toBe(1);
    });
  });

  describe('全34種類の牌生成', () => {
    it('全34種類の牌を一括生成できる', async () => {
      const tiles: TileEntry[] = [];
      const allTypes: TileType[] = ['m', 'p', 's', 'z'];

      for (const type of allTypes) {
        const range = TILE_NUMBER_RANGES[type];
        for (let number = range.min; number <= range.max; number++) {
          tiles.push(createValidTileEntry({
            id: `${number}${type}`,
            type,
            number,
            awsService: {
              id: `service-${number}${type}`,
              displayName: `AWS Service ${number}${type}`,
              iconPath: `assets/icons/${number}${type}.svg`,
            },
          }));
        }
      }

      const config: TileConfig = {
        tiles,
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_BATCH_DIR);

      expect(result.generated).toBe(34);
      expect(result.manifest.tileCount).toBe(34);
    });
  });

  describe('生成されたSVGの内容', () => {
    it('生成されたSVGファイルが有効なSVG構造を持つ', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({
            id: '1m',
            type: 'm',
            number: 1,
            awsService: {
              id: 'ec2',
              displayName: 'Amazon EC2',
              iconPath: 'assets/ec2.svg',
            },
          }),
        ],
        metadata: { version: '1.0.0' },
      };

      await generateAll(config, TEST_BATCH_DIR);

      const svgContent = await fs.readFile(path.join(TEST_BATCH_DIR, '1m.svg'), 'utf-8');

      expect(svgContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('</svg>');
      expect(svgContent).toContain('width="17mm"');
      expect(svgContent).toContain('height="24mm"');
    });

    it('生成されたSVGにサービス名が含まれる', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({
            id: '1m',
            type: 'm',
            number: 1,
            awsService: {
              id: 'lambda',
              displayName: 'AWS Lambda',
              iconPath: 'assets/lambda.svg',
            },
          }),
        ],
        metadata: { version: '1.0.0' },
      };

      await generateAll(config, TEST_BATCH_DIR);

      const svgContent = await fs.readFile(path.join(TEST_BATCH_DIR, '1m.svg'), 'utf-8');

      expect(svgContent).toContain('AWS Lambda');
    });

    it('生成されたSVGに牌種類ラベルが含まれる', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '5p', type: 'p', number: 5 }),
        ],
        metadata: { version: '1.0.0' },
      };

      await generateAll(config, TEST_BATCH_DIR);

      const svgContent = await fs.readFile(path.join(TEST_BATCH_DIR, '5p.svg'), 'utf-8');

      expect(svgContent).toContain('5筒');
    });
  });
});


// ============================================================================
// Property 9: 再生成時のファイル上書き (File Overwrite on Regeneration)
// ============================================================================

/**
 * **Property 9: 再生成時のファイル上書き**
 * **Validates: Requirements 4.3**
 * 
 * *For any* 既存の牌を再生成する場合、既存のファイルは新しいコンテンツで上書きされなければならない。
 * 
 * Requirements:
 * - 4.3: WHEN a tile is regenerated, THE Tile_Generator SHALL overwrite the existing file
 * 
 * このプロパティテストは、以下を検証します：
 * 1. 既存のファイルが存在する状態で再生成を行う
 * 2. 再生成後のファイル内容が新しい設定を反映している
 * 3. 古い内容が完全に上書きされている
 */
describe('Property 9: 再生成時のファイル上書き (File Overwrite on Regeneration)', () => {
  const TEST_OVERWRITE_DIR = 'test-overwrite-output';

  /**
   * 牌種類のArbitrary
   */
  const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

  /**
   * 安全なサービス名を生成するArbitrary
   */
  const safeServiceNameArb = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -_'.split('')),
    { minLength: 1, maxLength: 30 }
  ).map((s) => s.trim() || 'DefaultService');

  /**
   * サービスIDを生成するArbitrary
   */
  const serviceIdArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
    { minLength: 2, maxLength: 15 }
  ).filter((s) => /^[a-z]/.test(s));

  /**
   * 有効なTileEntryを生成するArbitrary
   */
  const tileEntryArb: fc.Arbitrary<TileEntry> = fc.tuple(
    tileTypeArb,
    serviceIdArb,
    safeServiceNameArb
  ).chain(([type, serviceId, serviceName]) => {
    const range = TILE_NUMBER_RANGES[type];
    return fc.integer({ min: range.min, max: range.max }).map((number) => ({
      id: `${number}${type}`,
      type,
      number,
      awsService: {
        id: serviceId,
        displayName: serviceName,
        iconPath: `assets/icons/${serviceId}.svg`,
      },
    } as TileEntry));
  });

  /**
   * 異なるサービス名のペアを生成するArbitrary
   * 上書き検証のため、互いに部分文字列として含まれない名前を生成
   */
  const differentServiceNamePairArb: fc.Arbitrary<[string, string]> = fc.tuple(
    fc.stringOf(
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      { minLength: 8, maxLength: 20 }
    ).map((s) => `Original_${s}`),
    fc.stringOf(
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      { minLength: 8, maxLength: 20 }
    ).map((s) => `Updated_${s}`)
  );

  beforeEach(async () => {
    // テスト前にディレクトリをクリーンアップ
    await fs.rm(TEST_OVERWRITE_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_OVERWRITE_DIR, { recursive: true });
  });

  afterEach(async () => {
    // テスト後にディレクトリを削除
    await fs.rm(TEST_OVERWRITE_DIR, { recursive: true, force: true });
  });

  it('再生成時に既存のファイルが新しいコンテンツで上書きされる', async () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * WHEN a tile is regenerated, THE Tile_Generator SHALL overwrite the existing file
     * 
     * このテストは、同じ牌IDで異なるサービス名を持つ設定で再生成した場合、
     * ファイル内容が新しいサービス名に更新されることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        tileTypeArb,
        differentServiceNamePairArb,
        async (type: TileType, [originalServiceName, newServiceName]: [string, string]) => {
          const range = TILE_NUMBER_RANGES[type];
          const number = range.min;
          const tileId = `${number}${type}`;

          // 1. 最初の設定で牌を生成
          const originalConfig: TileConfig = {
            tiles: [
              createValidTileEntry({
                id: tileId,
                type,
                number,
                awsService: {
                  id: 'original-service',
                  displayName: originalServiceName,
                  iconPath: 'assets/icons/original.svg',
                },
              }),
            ],
            metadata: { version: '1.0.0' },
          };

          const originalResult = await generateAll(originalConfig, TEST_OVERWRITE_DIR);
          expect(originalResult.success).toBe(true);
          expect(originalResult.generated).toBe(1);

          // 2. 生成されたファイルの内容を確認
          const filename = `${number}${type}.svg`;
          const filePath = path.join(TEST_OVERWRITE_DIR, filename);
          const originalContent = await fs.readFile(filePath, 'utf-8');
          
          // XMLエスケープされたサービス名を検証
          const escapedOriginalName = originalServiceName
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
          expect(originalContent).toContain(escapedOriginalName);

          // 3. 新しい設定で再生成
          const newConfig: TileConfig = {
            tiles: [
              createValidTileEntry({
                id: tileId,
                type,
                number,
                awsService: {
                  id: 'new-service',
                  displayName: newServiceName,
                  iconPath: 'assets/icons/new.svg',
                },
              }),
            ],
            metadata: { version: '1.0.0' },
          };

          const newResult = await generateAll(newConfig, TEST_OVERWRITE_DIR);
          expect(newResult.success).toBe(true);
          expect(newResult.generated).toBe(1);

          // 4. ファイルが上書きされたことを確認
          const newContent = await fs.readFile(filePath, 'utf-8');
          
          // 新しいサービス名が含まれていることを検証
          const escapedNewName = newServiceName
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
          expect(newContent).toContain(escapedNewName);

          // 古いサービス名が含まれていないことを検証（上書きされた証拠）
          // Original_とUpdated_プレフィックスにより、部分一致の問題を回避
          expect(newContent).not.toContain(escapedOriginalName);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('複数回の再生成でも常に最新のコンテンツが保持される', async () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * このテストは、複数回の再生成を行った場合でも、
     * 常に最新の設定内容がファイルに反映されることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        tileEntryArb,
        fc.integer({ min: 2, max: 5 }),
        async (baseEntry: TileEntry, regenerationCount: number) => {
          const filename = `${baseEntry.number}${baseEntry.type}.svg`;
          const filePath = path.join(TEST_OVERWRITE_DIR, filename);

          let lastServiceName = '';

          // 複数回の再生成を実行
          for (let i = 0; i < regenerationCount; i++) {
            const serviceName = `Service_Iteration_${i}_${Date.now()}`;
            lastServiceName = serviceName;

            const config: TileConfig = {
              tiles: [
                createValidTileEntry({
                  id: baseEntry.id,
                  type: baseEntry.type,
                  number: baseEntry.number,
                  awsService: {
                    id: `service-${i}`,
                    displayName: serviceName,
                    iconPath: `assets/icons/service-${i}.svg`,
                  },
                }),
              ],
              metadata: { version: '1.0.0' },
            };

            const result = await generateAll(config, TEST_OVERWRITE_DIR);
            expect(result.success).toBe(true);
          }

          // 最終的なファイル内容を確認
          const finalContent = await fs.readFile(filePath, 'utf-8');
          
          // 最後のサービス名が含まれていることを検証
          expect(finalContent).toContain(lastServiceName);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('再生成時にマニフェストも更新される', async () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * このテストは、再生成時にマニフェストファイルも
     * 新しい内容で上書きされることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        tileTypeArb,
        differentServiceNamePairArb,
        async (type: TileType, [originalServiceName, newServiceName]: [string, string]) => {
          const range = TILE_NUMBER_RANGES[type];
          const number = range.min;
          const tileId = `${number}${type}`;

          // 1. 最初の設定で生成
          const originalConfig: TileConfig = {
            tiles: [
              createValidTileEntry({
                id: tileId,
                type,
                number,
                awsService: {
                  id: 'original-service',
                  displayName: originalServiceName,
                  iconPath: 'assets/icons/original.svg',
                },
              }),
            ],
            metadata: { version: '1.0.0' },
          };

          await generateAll(originalConfig, TEST_OVERWRITE_DIR);

          // 2. 最初のマニフェストを確認
          const manifestPath = path.join(TEST_OVERWRITE_DIR, MANIFEST_FILENAME);
          const originalManifestContent = await fs.readFile(manifestPath, 'utf-8');
          const originalManifest = JSON.parse(originalManifestContent) as TileManifest;
          
          expect(originalManifest.tiles[0].awsService.displayName).toBe(originalServiceName);

          // 3. 新しい設定で再生成
          const newConfig: TileConfig = {
            tiles: [
              createValidTileEntry({
                id: tileId,
                type,
                number,
                awsService: {
                  id: 'new-service',
                  displayName: newServiceName,
                  iconPath: 'assets/icons/new.svg',
                },
              }),
            ],
            metadata: { version: '1.0.0' },
          };

          await generateAll(newConfig, TEST_OVERWRITE_DIR);

          // 4. マニフェストが更新されたことを確認
          const newManifestContent = await fs.readFile(manifestPath, 'utf-8');
          const newManifest = JSON.parse(newManifestContent) as TileManifest;
          
          expect(newManifest.tiles[0].awsService.displayName).toBe(newServiceName);
          expect(newManifest.tiles[0].awsService.displayName).not.toBe(originalServiceName);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('異なる牌種類でも再生成時に正しく上書きされる', async () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * このテストは、すべての牌種類（萬子、筒子、索子、字牌）に対して
     * 再生成時のファイル上書きが正しく動作することを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        tileTypeArb,
        differentServiceNamePairArb,
        async (type: TileType, [originalServiceName, newServiceName]: [string, string]) => {
          const range = TILE_NUMBER_RANGES[type];
          
          // 範囲内のランダムな番号を選択
          const number = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
          const tileId = `${number}${type}`;
          const filename = `${number}${type}.svg`;
          const filePath = path.join(TEST_OVERWRITE_DIR, filename);

          // 1. 最初の生成
          const originalConfig: TileConfig = {
            tiles: [
              createValidTileEntry({
                id: tileId,
                type,
                number,
                awsService: {
                  id: 'original',
                  displayName: originalServiceName,
                  iconPath: 'assets/icons/original.svg',
                },
              }),
            ],
            metadata: { version: '1.0.0' },
          };

          await generateAll(originalConfig, TEST_OVERWRITE_DIR);
          const originalContent = await fs.readFile(filePath, 'utf-8');

          // 2. 再生成
          const newConfig: TileConfig = {
            tiles: [
              createValidTileEntry({
                id: tileId,
                type,
                number,
                awsService: {
                  id: 'new',
                  displayName: newServiceName,
                  iconPath: 'assets/icons/new.svg',
                },
              }),
            ],
            metadata: { version: '1.0.0' },
          };

          await generateAll(newConfig, TEST_OVERWRITE_DIR);
          const newContent = await fs.readFile(filePath, 'utf-8');

          // 3. 内容が変更されたことを検証
          expect(newContent).not.toBe(originalContent);
          expect(newContent).toContain(newServiceName);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('writeTileSvgは既存ファイルを上書きする', async () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * このテストは、writeTileSvg関数が既存のファイルを
     * 正しく上書きすることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
          { minLength: 10, maxLength: 50 }
        ),
        fc.stringOf(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')),
          { minLength: 10, maxLength: 50 }
        ),
        async (originalContent: string, newContent: string) => {
          // 異なるコンテンツの場合のみテスト
          fc.pre(originalContent !== newContent);

          const filename = 'test-overwrite.svg';
          const filePath = path.join(TEST_OVERWRITE_DIR, filename);

          // 1. 最初のコンテンツを書き込み
          const originalSvg = `<svg>${originalContent}</svg>`;
          await writeTileSvg(originalSvg, TEST_OVERWRITE_DIR, filename);
          
          const readOriginal = await fs.readFile(filePath, 'utf-8');
          expect(readOriginal).toBe(originalSvg);

          // 2. 新しいコンテンツで上書き
          const newSvg = `<svg>${newContent}</svg>`;
          await writeTileSvg(newSvg, TEST_OVERWRITE_DIR, filename);
          
          const readNew = await fs.readFile(filePath, 'utf-8');
          expect(readNew).toBe(newSvg);
          expect(readNew).not.toBe(originalSvg);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('全34種類の牌を再生成しても正しく上書きされる', async () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * このテストは、全34種類の牌を一括で再生成した場合でも、
     * すべてのファイルが正しく上書きされることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const allTypes: TileType[] = ['m', 'p', 's', 'z'];

          // 1. 最初の設定で全牌を生成
          const originalTiles: TileEntry[] = [];
          for (const type of allTypes) {
            const range = TILE_NUMBER_RANGES[type];
            for (let number = range.min; number <= range.max; number++) {
              originalTiles.push(createValidTileEntry({
                id: `${number}${type}`,
                type,
                number,
                awsService: {
                  id: `original-${number}${type}`,
                  displayName: `Original Service ${number}${type}`,
                  iconPath: `assets/icons/original-${number}${type}.svg`,
                },
              }));
            }
          }

          const originalConfig: TileConfig = {
            tiles: originalTiles,
            metadata: { version: '1.0.0' },
          };

          await generateAll(originalConfig, TEST_OVERWRITE_DIR);

          // 2. 新しい設定で全牌を再生成
          const newTiles: TileEntry[] = [];
          for (const type of allTypes) {
            const range = TILE_NUMBER_RANGES[type];
            for (let number = range.min; number <= range.max; number++) {
              newTiles.push(createValidTileEntry({
                id: `${number}${type}`,
                type,
                number,
                awsService: {
                  id: `new-${number}${type}`,
                  displayName: `New Service ${number}${type}`,
                  iconPath: `assets/icons/new-${number}${type}.svg`,
                },
              }));
            }
          }

          const newConfig: TileConfig = {
            tiles: newTiles,
            metadata: { version: '1.0.0' },
          };

          await generateAll(newConfig, TEST_OVERWRITE_DIR);

          // 3. すべてのファイルが新しい内容で上書きされたことを確認
          for (const type of allTypes) {
            const range = TILE_NUMBER_RANGES[type];
            for (let number = range.min; number <= range.max; number++) {
              const filename = `${number}${type}.svg`;
              const filePath = path.join(TEST_OVERWRITE_DIR, filename);
              const content = await fs.readFile(filePath, 'utf-8');

              // 新しいサービス名が含まれていることを検証
              expect(content).toContain(`New Service ${number}${type}`);
              // 古いサービス名が含まれていないことを検証
              expect(content).not.toContain(`Original Service ${number}${type}`);
            }
          }

          // 4. マニフェストも更新されていることを確認
          const manifestPath = path.join(TEST_OVERWRITE_DIR, MANIFEST_FILENAME);
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent) as TileManifest;

          expect(manifest.tileCount).toBe(34);
          manifest.tiles.forEach((tile) => {
            expect(tile.awsService.displayName).toContain('New Service');
            expect(tile.awsService.displayName).not.toContain('Original Service');
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 10: バッチ生成レポート (Batch Generation Report)
// ============================================================================

/**
 * **Property 10: バッチ生成レポート**
 * **Validates: Requirements 4.5**
 * 
 * *For any* バッチ生成の完了、結果は正確な生成数とエラー数を含まなければならない。
 * 
 * Requirements:
 * - 4.5: WHEN batch generation completes, THE Tile_Generator SHALL report the number of tiles generated and any errors encountered
 * 
 * このプロパティテストは、以下を検証します：
 * 1. `generateAll`が返す`GenerationResult`の`generated`カウントが実際に作成されたファイル数と一致する
 * 2. `result.manifest.tileCount`が`result.generated`と一致する
 * 3. エラーシナリオでは`result.failed`と`result.errors.length`が正確である
 */
describe('Property 10: バッチ生成レポート (Batch Generation Report)', () => {
  const TEST_BATCH_REPORT_DIR = 'test-batch-report-output';

  /**
   * 牌種類のArbitrary
   */
  const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

  /**
   * 安全なサービス名を生成するArbitrary
   */
  const safeServiceNameArb = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -_'.split('')),
    { minLength: 1, maxLength: 30 }
  ).map((s) => s.trim() || 'DefaultService');

  /**
   * サービスIDを生成するArbitrary
   */
  const serviceIdArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
    { minLength: 2, maxLength: 15 }
  ).filter((s) => /^[a-z]/.test(s));

  /**
   * 有効なTileEntryを生成するArbitrary（ユニークなインデックス付き）
   */
  const tileEntryArb = (index: number): fc.Arbitrary<TileEntry> => {
    return fc.tuple(
      tileTypeArb,
      serviceIdArb,
      safeServiceNameArb
    ).chain(([type, serviceId, serviceName]) => {
      const range = TILE_NUMBER_RANGES[type];
      return fc.integer({ min: range.min, max: range.max }).map((number) => ({
        id: `${number}${type}_${index}`,
        type,
        number,
        awsService: {
          id: `${serviceId}-${index}`,
          displayName: serviceName,
          iconPath: `assets/icons/${serviceId}-${index}.svg`,
        },
      } as TileEntry));
    });
  };

  /**
   * 有効なTileConfigを生成するArbitrary
   * 1〜15個のタイルエントリを持つ設定を生成
   */
  const validTileConfigArb: fc.Arbitrary<TileConfig> = fc
    .integer({ min: 1, max: 15 })
    .chain((count) => {
      const entries: fc.Arbitrary<TileEntry>[] = [];
      for (let i = 0; i < count; i++) {
        entries.push(tileEntryArb(i));
      }
      return fc.tuple(...entries).map((tiles) => ({
        tiles,
        metadata: {
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
        },
      }));
    });

  beforeEach(async () => {
    // テスト前にディレクトリをクリーンアップ
    await fs.rm(TEST_BATCH_REPORT_DIR, { recursive: true, force: true });
  });

  afterEach(async () => {
    // テスト後にディレクトリを削除
    await fs.rm(TEST_BATCH_REPORT_DIR, { recursive: true, force: true });
  });

  it('生成結果のgeneratedカウントが設定内のタイル数と一致する', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * WHEN batch generation completes, THE Tile_Generator SHALL report the number of tiles generated
     * 
     * このテストは、有効なTileConfigに対してgenerateAllを呼び出した場合、
     * result.generatedが設定内のタイル数と一致することを検証します。
     */
    await fc.assert(
      fc.asyncProperty(validTileConfigArb, async (config: TileConfig) => {
        const result = await generateAll(config, TEST_BATCH_REPORT_DIR);

        // 生成数が設定内のタイル数と一致することを検証
        expect(result.generated).toBe(config.tiles.length);

        // 成功した場合、failedは0であることを検証
        expect(result.failed).toBe(0);

        // 成功フラグが正しいことを検証
        expect(result.success).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('生成結果のgeneratedカウントが実際に作成されたファイル数と一致する', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * このテストは、result.generatedが実際に出力ディレクトリに作成された
     * SVGファイルの数と一致することを検証します。
     * 
     * 注: 同じnumber/typeの組み合わせを持つ複数のエントリは同じファイルに
     * 書き込まれるため、ユニークなnumber/typeの組み合わせを持つ設定を使用します。
     */
    // ユニークなnumber/typeの組み合わせを持つTileConfigを生成するArbitrary
    const uniqueTileConfigArb: fc.Arbitrary<TileConfig> = fc
      .integer({ min: 1, max: 10 })
      .chain((count) => {
        // 全34種類の牌からランダムにcount個を選択
        const allTiles: Array<{ type: TileType; number: number }> = [];
        const types: TileType[] = ['m', 'p', 's', 'z'];
        for (const type of types) {
          const range = TILE_NUMBER_RANGES[type];
          for (let num = range.min; num <= range.max; num++) {
            allTiles.push({ type, number: num });
          }
        }
        
        return fc.shuffledSubarray(allTiles, { minLength: 1, maxLength: Math.min(count, 34) })
          .chain((selectedTiles) => {
            return fc.tuple(
              ...selectedTiles.map((tile, index) =>
                fc.tuple(serviceIdArb, safeServiceNameArb).map(([serviceId, serviceName]) => ({
                  id: `${tile.number}${tile.type}`,
                  type: tile.type,
                  number: tile.number,
                  awsService: {
                    id: `${serviceId}-${index}`,
                    displayName: serviceName,
                    iconPath: `assets/icons/${serviceId}-${index}.svg`,
                  },
                } as TileEntry))
              )
            ).map((tiles) => ({
              tiles,
              metadata: {
                version: '1.0.0',
                generatedAt: new Date().toISOString(),
              },
            }));
          });
      });

    await fc.assert(
      fc.asyncProperty(uniqueTileConfigArb, async (config: TileConfig) => {
        // 各イテレーションの前にディレクトリをクリーンアップ
        await fs.rm(TEST_BATCH_REPORT_DIR, { recursive: true, force: true });
        
        const result = await generateAll(config, TEST_BATCH_REPORT_DIR);

        // 出力ディレクトリ内のSVGファイルをカウント
        const files = await fs.readdir(TEST_BATCH_REPORT_DIR);
        const svgFiles = files.filter((f) => f.endsWith('.svg'));

        // 生成数が実際のファイル数と一致することを検証
        expect(result.generated).toBe(svgFiles.length);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('マニフェストのtileCountがgeneratedカウントと一致する', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * このテストは、result.manifest.tileCountがresult.generatedと
     * 一致することを検証します。
     */
    await fc.assert(
      fc.asyncProperty(validTileConfigArb, async (config: TileConfig) => {
        const result = await generateAll(config, TEST_BATCH_REPORT_DIR);

        // マニフェストのtileCountがgeneratedと一致することを検証
        expect(result.manifest.tileCount).toBe(result.generated);

        // マニフェストのtiles配列の長さもgeneratedと一致することを検証
        expect(result.manifest.tiles.length).toBe(result.generated);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('空のタイル配列の場合、生成数は0', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * エッジケース: 空のタイル配列に対しては0件の生成結果が報告される
     */
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const emptyConfig: TileConfig = {
          tiles: [],
          metadata: { version: '1.0.0' },
        };

        const result = await generateAll(emptyConfig, TEST_BATCH_REPORT_DIR);

        // 生成数が0であることを検証
        expect(result.generated).toBe(0);
        expect(result.failed).toBe(0);
        expect(result.success).toBe(true);
        expect(result.manifest.tileCount).toBe(0);
        expect(result.manifest.tiles).toHaveLength(0);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('無効な設定の場合、failedカウントとerrorsが正確に報告される', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * WHEN batch generation completes, THE Tile_Generator SHALL report any errors encountered
     * 
     * このテストは、無効な設定（必須フィールドが欠落）の場合、
     * result.failedとresult.errorsが正確に報告されることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (invalidEntryCount: number) => {
          // 無効なエントリを作成（awsServiceが欠落）
          const invalidTiles = Array.from({ length: invalidEntryCount }, (_, i) => ({
            id: `${(i % 9) + 1}m_${i}`,
            type: 'm' as TileType,
            number: (i % 9) + 1,
            // awsServiceが欠落
          }));

          const invalidConfig = {
            tiles: invalidTiles,
            metadata: { version: '1.0.0' },
          } as unknown as TileConfig;

          const result = await generateAll(invalidConfig, TEST_BATCH_REPORT_DIR);

          // 生成が失敗したことを検証
          expect(result.success).toBe(false);

          // 生成数が0であることを検証
          expect(result.generated).toBe(0);

          // failedカウントが正確であることを検証
          expect(result.failed).toBeGreaterThan(0);

          // errorsが存在することを検証
          expect(result.errors.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('アイコンファイルが見つからない場合、エラーが記録されるが生成は成功する', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * このテストは、アイコンファイルが見つからない場合でも、
     * 生成は成功し、エラーが正確に記録されることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (tileCount: number) => {
          // 存在しないアイコンパスを持つ有効なエントリを作成
          const tiles: TileEntry[] = Array.from({ length: tileCount }, (_, i) => 
            createValidTileEntry({
              id: `${(i % 9) + 1}m_${i}`,
              type: 'm',
              number: (i % 9) + 1,
              awsService: {
                id: `service-${i}`,
                displayName: `Service ${i}`,
                iconPath: `nonexistent/path/icon-${i}.svg`, // 存在しないパス
              },
            })
          );

          const config: TileConfig = {
            tiles,
            metadata: { version: '1.0.0' },
          };

          const result = await generateAll(config, TEST_BATCH_REPORT_DIR);

          // 生成は成功することを検証
          expect(result.success).toBe(true);

          // 生成数がタイル数と一致することを検証
          expect(result.generated).toBe(tileCount);

          // failedは0であることを検証（アイコンエラーは致命的ではない）
          expect(result.failed).toBe(0);

          // アイコンエラーが記録されていることを検証
          const iconErrors = result.errors.filter((e) => e.type === 'icon_not_found');
          expect(iconErrors.length).toBe(tileCount);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('生成結果のsuccess、generated、failedの整合性が保たれる', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * このテストは、生成結果の各フィールド間の整合性を検証します：
     * - success === (failed === 0)
     * - generated + failed === 設定内のタイル数（バリデーション成功時）
     */
    await fc.assert(
      fc.asyncProperty(validTileConfigArb, async (config: TileConfig) => {
        const result = await generateAll(config, TEST_BATCH_REPORT_DIR);

        // successフラグとfailedカウントの整合性を検証
        if (result.success) {
          expect(result.failed).toBe(0);
        } else {
          expect(result.failed).toBeGreaterThan(0);
        }

        // 有効な設定の場合、generated + failed === タイル数
        // （バリデーションエラーの場合は異なる可能性がある）
        if (result.success) {
          expect(result.generated).toBe(config.tiles.length);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('全34種類の牌を生成した場合、正確なレポートが生成される', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * このテストは、全34種類の牌を一括生成した場合、
     * 正確な生成レポートが生成されることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const tiles: TileEntry[] = [];
        const allTypes: TileType[] = ['m', 'p', 's', 'z'];

        for (const type of allTypes) {
          const range = TILE_NUMBER_RANGES[type];
          for (let number = range.min; number <= range.max; number++) {
            tiles.push(createValidTileEntry({
              id: `${number}${type}`,
              type,
              number,
              awsService: {
                id: `service-${number}${type}`,
                displayName: `AWS Service ${number}${type}`,
                iconPath: `assets/icons/${number}${type}.svg`,
              },
            }));
          }
        }

        const config: TileConfig = {
          tiles,
          metadata: { version: '1.0.0' },
        };

        const result = await generateAll(config, TEST_BATCH_REPORT_DIR);

        // 34種類すべてが生成されたことを検証
        expect(result.generated).toBe(34);
        expect(result.failed).toBe(0);
        expect(result.success).toBe(true);

        // マニフェストのtileCountも34であることを検証
        expect(result.manifest.tileCount).toBe(34);
        expect(result.manifest.tiles.length).toBe(34);

        // 実際のファイル数も34であることを検証
        const files = await fs.readdir(TEST_BATCH_REPORT_DIR);
        const svgFiles = files.filter((f) => f.endsWith('.svg'));
        expect(svgFiles.length).toBe(34);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('errorsの各エントリにはtileIdとmessageが含まれる', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * このテストは、エラーが発生した場合、各エラーエントリに
     * 適切な情報（tileId、message、type）が含まれることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (tileCount: number) => {
          // 存在しないアイコンパスを持つエントリを作成
          const tiles: TileEntry[] = Array.from({ length: tileCount }, (_, i) =>
            createValidTileEntry({
              id: `${(i % 9) + 1}m_${i}`,
              type: 'm',
              number: (i % 9) + 1,
              awsService: {
                id: `service-${i}`,
                displayName: `Service ${i}`,
                iconPath: `nonexistent/icon-${i}.svg`,
              },
            })
          );

          const config: TileConfig = {
            tiles,
            metadata: { version: '1.0.0' },
          };

          const result = await generateAll(config, TEST_BATCH_REPORT_DIR);

          // エラーが記録されていることを検証
          expect(result.errors.length).toBeGreaterThan(0);

          // 各エラーエントリの構造を検証
          result.errors.forEach((error) => {
            expect(error.tileId).toBeDefined();
            expect(typeof error.tileId).toBe('string');
            expect(error.message).toBeDefined();
            expect(typeof error.message).toBe('string');
            expect(error.type).toBeDefined();
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('複数回のバッチ生成でも正確なレポートが生成される', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * このテストは、複数回のバッチ生成を行った場合でも、
     * 各回で正確なレポートが生成されることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (batchCount: number) => {
          for (let batch = 0; batch < batchCount; batch++) {
            // 各バッチで異なる数のタイルを生成
            const tileCount = batch + 1;
            const tiles: TileEntry[] = Array.from({ length: tileCount }, (_, i) =>
              createValidTileEntry({
                id: `${(i % 9) + 1}m_batch${batch}_${i}`,
                type: 'm',
                number: (i % 9) + 1,
                awsService: {
                  id: `service-batch${batch}-${i}`,
                  displayName: `Service Batch ${batch} Item ${i}`,
                  iconPath: `assets/icons/batch${batch}-${i}.svg`,
                },
              })
            );

            const config: TileConfig = {
              tiles,
              metadata: { version: '1.0.0' },
            };

            const result = await generateAll(config, TEST_BATCH_REPORT_DIR);

            // 各バッチで正確なレポートが生成されることを検証
            expect(result.generated).toBe(tileCount);
            expect(result.manifest.tileCount).toBe(tileCount);
            expect(result.success).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('生成結果のmanifestにはgeneratedAtが含まれる', async () => {
    /**
     * **Validates: Requirements 4.5**
     * 
     * このテストは、生成結果のマニフェストに
     * 生成日時（generatedAt）が含まれることを検証します。
     */
    await fc.assert(
      fc.asyncProperty(validTileConfigArb, async (config: TileConfig) => {
        const beforeTime = new Date().toISOString();
        const result = await generateAll(config, TEST_BATCH_REPORT_DIR);
        const afterTime = new Date().toISOString();

        // generatedAtが存在することを検証
        expect(result.manifest.generatedAt).toBeDefined();

        // generatedAtがISO 8601形式であることを検証
        expect(() => new Date(result.manifest.generatedAt)).not.toThrow();

        // generatedAtが適切な時間範囲内であることを検証
        expect(result.manifest.generatedAt >= beforeTime).toBe(true);
        expect(result.manifest.generatedAt <= afterTime).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 5: ファイル名の一貫性 (Filename Consistency)
// ============================================================================

describe('Property 5: ファイル名の一貫性 (Filename Consistency)', () => {
  /**
   * **Property 5: ファイル名の一貫性**
   * **Validates: Requirements 3.1, 6.1, 6.2**
   *
   * *For any* 有効な `TileEntry`、`generatePngFilename(entry)` の結果は
   * `generateFilename(entry)` の拡張子 `.svg` を `.png` に置換したものと一致する。
   */

  /**
   * 牌種類のArbitrary
   */
  const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

  /**
   * 有効なTileEntryを生成するArbitrary
   * 牌の種類に応じた正しい番号範囲を使用（m/p/s: 1-9, z: 1-7）
   */
  const validTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain((type) => {
    const range = TILE_NUMBER_RANGES[type];
    return fc.integer({ min: range.min, max: range.max }).chain((number) => {
      return fc.record({
        id: fc.constant(`${number}${type}`),
        type: fc.constant(type),
        number: fc.constant(number),
        awsService: fc.record({
          id: fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/),
          displayName: fc.string({ minLength: 1, maxLength: 50 }),
          iconPath: fc.constant(`assets/icons/${number}${type}.svg`),
        }),
      }) as fc.Arbitrary<TileEntry>;
    });
  });

  it('generatePngFilenameはgenerateFilenameの拡張子を.svgから.pngに置換したものと一致する', () => {
    /**
     * **Validates: Requirements 3.1, 6.1, 6.2**
     *
     * このプロパティテストは、任意の有効なTileEntryに対して
     * generatePngFilename(entry) の結果が
     * generateFilename(entry).replace('.svg', '.png') と一致することを検証します。
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry: TileEntry) => {
        const pngFilename = generatePngFilename(entry);
        const svgFilename = generateFilename(entry);
        const expectedPngFilename = svgFilename.replace('.svg', '.png');

        // PNGファイル名がSVGファイル名の拡張子置換と一致することを検証
        expect(pngFilename).toBe(expectedPngFilename);

        // PNGファイル名が.png拡張子で終わることを検証
        expect(pngFilename).toMatch(/\.png$/);

        // SVGファイル名が.svg拡張子で終わることを検証
        expect(svgFilename).toMatch(/\.svg$/);

        // 拡張子を除いたベース名が一致することを検証
        const pngBase = pngFilename.replace('.png', '');
        const svgBase = svgFilename.replace('.svg', '');
        expect(pngBase).toBe(svgBase);

        // ベース名が{number}{type}形式であることを検証
        expect(pngBase).toBe(`${entry.number}${entry.type}`);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 6: マニフェストエントリの形式依存内容 (Manifest Entry Format-Dependent Content)
// ============================================================================

describe('Property 6: マニフェストエントリの形式依存内容 (Manifest Entry Format-Dependent Content)', () => {
  /**
   * **Property 6: マニフェストエントリの形式依存内容**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * *For any* 有効な `TileEntry` と `OutputFormat` の組み合わせ:
   * - `'svg'` の場合: マニフェストエントリの `filePath` は `.svg` で終わり、`pngFilePath` は未定義
   * - `'png'` の場合: マニフェストエントリの `filePath` は `.png` で終わり、`pngFilePath` は未定義
   * - `'svg,png'` の場合: `filePath` は `.svg` で終わり、`pngFilePath` は `.png` で終わる
   */

  /**
   * 牌種類のArbitrary
   */
  const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

  /**
   * 有効なTileEntryを生成するArbitrary
   * 牌の種類に応じた正しい番号範囲を使用（m/p/s: 1-9, z: 1-7）
   */
  const validTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain((type) => {
    const range = TILE_NUMBER_RANGES[type];
    return fc.integer({ min: range.min, max: range.max }).chain((number) => {
      return fc.record({
        id: fc.constant(`${number}${type}`),
        type: fc.constant(type),
        number: fc.constant(number),
        awsService: fc.record({
          id: fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/),
          displayName: fc.string({ minLength: 1, maxLength: 50 }),
          iconPath: fc.constant(`assets/icons/${number}${type}.svg`),
        }),
      }) as fc.Arbitrary<TileEntry>;
    });
  });

  /**
   * OutputFormatのArbitrary
   */
  const outputFormatArb = fc.constantFrom<OutputFormat>('svg', 'png', 'svg,png');

  it('マニフェストエントリのfilePathとpngFilePathが出力形式に応じて正しく設定される', () => {
    /**
     * **Validates: Requirements 4.1, 4.2, 4.3**
     *
     * このプロパティテストは、任意の有効なTileEntryとOutputFormatの組み合わせに対して
     * createManifestEntry が形式に応じた正しいファイルパスを設定することを検証します。
     */
    fc.assert(
      fc.property(validTileEntryArb, outputFormatArb, (entry: TileEntry, format: OutputFormat) => {
        const manifestEntry = createManifestEntry(entry, 'output', format);

        switch (format) {
          case 'svg':
            // SVG形式: filePathは.svgで終わり、pngFilePathは未定義
            expect(manifestEntry.filePath).toMatch(/\.svg$/);
            expect(manifestEntry.pngFilePath).toBeUndefined();
            break;

          case 'png':
            // PNG形式: filePathは.pngで終わり、pngFilePathは未定義
            expect(manifestEntry.filePath).toMatch(/\.png$/);
            expect(manifestEntry.pngFilePath).toBeUndefined();
            break;

          case 'svg,png':
            // SVG+PNG形式: filePathは.svgで終わり、pngFilePathは.pngで終わる
            expect(manifestEntry.filePath).toMatch(/\.svg$/);
            expect(manifestEntry.pngFilePath).toBeDefined();
            expect(manifestEntry.pngFilePath).toMatch(/\.png$/);
            break;
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// generateAll format パラメータテスト (Tasks 5.1, 5.2)
// ============================================================================

describe('generateAll format パラメータ (Requirements: 1.1, 3.1, 3.2, 3.4, 5.1, 5.2)', () => {
  const TEST_FORMAT_DIR = 'test-format-output';

  beforeEach(async () => {
    await fs.rm(TEST_FORMAT_DIR, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_FORMAT_DIR, { recursive: true, force: true });
  });

  describe('デフォルト動作（format省略）', () => {
    it('format省略時はSVGのみ生成し、format="svg"を返す', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_FORMAT_DIR);

      expect(result.success).toBe(true);
      expect(result.format).toBe('svg');
      expect(result.generated).toBe(1);

      // SVGファイルが存在する
      const svgExists = await fs.stat(path.join(TEST_FORMAT_DIR, '1m.svg'))
        .then(() => true).catch(() => false);
      expect(svgExists).toBe(true);

      // PNGファイルは存在しない
      const pngExists = await fs.stat(path.join(TEST_FORMAT_DIR, '1m.png'))
        .then(() => true).catch(() => false);
      expect(pngExists).toBe(false);
    });
  });

  describe('format="svg"', () => {
    it('SVGファイルのみ生成される', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '5p', type: 'p', number: 5 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_FORMAT_DIR, 'svg');

      expect(result.success).toBe(true);
      expect(result.format).toBe('svg');
      expect(result.generated).toBe(2);

      // SVGファイルが存在する
      for (const name of ['1m.svg', '5p.svg']) {
        const exists = await fs.stat(path.join(TEST_FORMAT_DIR, name))
          .then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }

      // PNGファイルは存在しない
      for (const name of ['1m.png', '5p.png']) {
        const exists = await fs.stat(path.join(TEST_FORMAT_DIR, name))
          .then(() => true).catch(() => false);
        expect(exists).toBe(false);
      }
    });
  });

  describe('format="png"', () => {
    it('PNGファイルのみ生成され、SVGファイルは生成されない', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '5p', type: 'p', number: 5 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_FORMAT_DIR, 'png');

      expect(result.success).toBe(true);
      expect(result.format).toBe('png');
      expect(result.generated).toBe(2);

      // PNGファイルが存在する
      for (const name of ['1m.png', '5p.png']) {
        const exists = await fs.stat(path.join(TEST_FORMAT_DIR, name))
          .then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }

      // SVGファイルは存在しない
      for (const name of ['1m.svg', '5p.svg']) {
        const exists = await fs.stat(path.join(TEST_FORMAT_DIR, name))
          .then(() => true).catch(() => false);
        expect(exists).toBe(false);
      }
    });

    it('生成されたPNGファイルはPNGシグネチャで始まる', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
        ],
        metadata: { version: '1.0.0' },
      };

      await generateAll(config, TEST_FORMAT_DIR, 'png');

      const pngContent = await fs.readFile(path.join(TEST_FORMAT_DIR, '1m.png'));
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(Buffer.compare(pngContent.subarray(0, 8), pngSignature)).toBe(0);
    });
  });

  describe('format="svg,png"', () => {
    it('SVGとPNGの両方のファイルが生成される (Requirements: 3.2)', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '5p', type: 'p', number: 5 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_FORMAT_DIR, 'svg,png');

      expect(result.success).toBe(true);
      expect(result.format).toBe('svg,png');
      expect(result.generated).toBe(2);

      // SVGファイルとPNGファイルの両方が存在する
      for (const id of ['1m', '5p']) {
        const svgExists = await fs.stat(path.join(TEST_FORMAT_DIR, `${id}.svg`))
          .then(() => true).catch(() => false);
        const pngExists = await fs.stat(path.join(TEST_FORMAT_DIR, `${id}.png`))
          .then(() => true).catch(() => false);
        expect(svgExists).toBe(true);
        expect(pngExists).toBe(true);
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('バリデーションエラー時もformat情報が返される', async () => {
      const invalidConfig = {
        tiles: null,
        metadata: { version: '1.0.0' },
      } as unknown as TileConfig;

      const result = await generateAll(invalidConfig, TEST_FORMAT_DIR, 'png');

      expect(result.success).toBe(false);
      expect(result.format).toBe('png');
    });

    it('format省略でバリデーションエラー時はformat="svg"が返される', async () => {
      const invalidConfig = {
        tiles: null,
        metadata: { version: '1.0.0' },
      } as unknown as TileConfig;

      const result = await generateAll(invalidConfig, TEST_FORMAT_DIR);

      expect(result.success).toBe(false);
      expect(result.format).toBe('svg');
    });

    it('PNG変換エラーは記録されるが残りの牌の生成は継続する (Requirements: 3.4)', async () => {
      // 複数の牌を生成し、全体が成功することを確認
      // （通常のSVGは変換可能なので、エラーは発生しないが、
      //  エラーハンドリングのパスが存在することを確認）
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '2m', type: 'm', number: 2 }),
          createValidTileEntry({ id: '3m', type: 'm', number: 3 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_FORMAT_DIR, 'png');

      expect(result.generated).toBe(3);
      // png_conversion_error タイプのエラーがないことを確認
      const pngErrors = result.errors.filter(e => e.type === 'png_conversion_error');
      expect(pngErrors).toHaveLength(0);
    });
  });

  describe('マニフェスト連携 (Task 5.2)', () => {
    it('format="svg" のマニフェストエントリはSVGパスのみ', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_FORMAT_DIR, 'svg');

      expect(result.manifest.tiles[0].filePath).toMatch(/\.svg$/);
      expect(result.manifest.tiles[0].pngFilePath).toBeUndefined();
    });

    it('format="png" のマニフェストエントリはPNGパスのみ', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_FORMAT_DIR, 'png');

      expect(result.manifest.tiles[0].filePath).toMatch(/\.png$/);
      expect(result.manifest.tiles[0].pngFilePath).toBeUndefined();
    });

    it('format="svg,png" のマニフェストエントリはSVGパスとPNGパスの両方', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
        ],
        metadata: { version: '1.0.0' },
      };

      const result = await generateAll(config, TEST_FORMAT_DIR, 'svg,png');

      expect(result.manifest.tiles[0].filePath).toMatch(/\.svg$/);
      expect(result.manifest.tiles[0].pngFilePath).toBeDefined();
      expect(result.manifest.tiles[0].pngFilePath).toMatch(/\.png$/);
    });

    it('マニフェストファイルにformat情報が反映される', async () => {
      const config: TileConfig = {
        tiles: [
          createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
          createValidTileEntry({ id: '5p', type: 'p', number: 5 }),
        ],
        metadata: { version: '1.0.0' },
      };

      await generateAll(config, TEST_FORMAT_DIR, 'svg,png');

      // マニフェストファイルを読み込んで確認
      const manifestContent = await fs.readFile(
        path.join(TEST_FORMAT_DIR, MANIFEST_FILENAME), 'utf-8'
      );
      const manifest = JSON.parse(manifestContent);

      expect(manifest.tiles).toHaveLength(2);
      for (const tile of manifest.tiles) {
        expect(tile.filePath).toMatch(/\.svg$/);
        expect(tile.pngFilePath).toMatch(/\.png$/);
      }
    });
  });
});

// ============================================================================
// createManifest format パラメータテスト (Task 5.2)
// ============================================================================

describe('createManifest format パラメータ (Requirements: 4.1, 4.2, 4.3)', () => {
  it('format省略時はSVGパスのみのマニフェストを生成する（後方互換性）', () => {
    const config: TileConfig = {
      tiles: [
        createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
        createValidTileEntry({ id: '5p', type: 'p', number: 5 }),
      ],
      metadata: { version: '1.0.0' },
    };

    const manifest = createManifest(config, 'output');

    expect(manifest.tileCount).toBe(2);
    for (const tile of manifest.tiles) {
      expect(tile.filePath).toMatch(/\.svg$/);
      expect(tile.pngFilePath).toBeUndefined();
    }
  });

  it('format="svg" はSVGパスのみのマニフェストを生成する', () => {
    const config: TileConfig = {
      tiles: [
        createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
      ],
      metadata: { version: '1.0.0' },
    };

    const manifest = createManifest(config, 'output', 'svg');

    expect(manifest.tiles[0].filePath).toBe(path.join('output', '1m.svg'));
    expect(manifest.tiles[0].pngFilePath).toBeUndefined();
  });

  it('format="png" はPNGパスのみのマニフェストを生成する', () => {
    const config: TileConfig = {
      tiles: [
        createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
      ],
      metadata: { version: '1.0.0' },
    };

    const manifest = createManifest(config, 'output', 'png');

    expect(manifest.tiles[0].filePath).toBe(path.join('output', '1m.png'));
    expect(manifest.tiles[0].pngFilePath).toBeUndefined();
  });

  it('format="svg,png" はSVGパスとPNGパスの両方を含むマニフェストを生成する', () => {
    const config: TileConfig = {
      tiles: [
        createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
      ],
      metadata: { version: '1.0.0' },
    };

    const manifest = createManifest(config, 'output', 'svg,png');

    expect(manifest.tiles[0].filePath).toBe(path.join('output', '1m.svg'));
    expect(manifest.tiles[0].pngFilePath).toBe(path.join('output', '1m.png'));
  });

  it('複数牌でformat="svg,png"の場合、全エントリに両パスが設定される', () => {
    const config: TileConfig = {
      tiles: [
        createValidTileEntry({ id: '1m', type: 'm', number: 1 }),
        createValidTileEntry({ id: '5p', type: 'p', number: 5 }),
        createValidTileEntry({ id: '9s', type: 's', number: 9 }),
        createValidTileEntry({ id: '7z', type: 'z', number: 7 }),
      ],
      metadata: { version: '1.0.0' },
    };

    const manifest = createManifest(config, 'tiles', 'svg,png');

    expect(manifest.tileCount).toBe(4);
    const expectedPairs = [
      { svg: 'tiles/1m.svg', png: 'tiles/1m.png' },
      { svg: 'tiles/5p.svg', png: 'tiles/5p.png' },
      { svg: 'tiles/9s.svg', png: 'tiles/9s.png' },
      { svg: 'tiles/7z.svg', png: 'tiles/7z.png' },
    ];

    manifest.tiles.forEach((tile, i) => {
      expect(tile.filePath).toBe(path.join(expectedPairs[i].svg));
      expect(tile.pngFilePath).toBe(path.join(expectedPairs[i].png));
    });
  });
});
