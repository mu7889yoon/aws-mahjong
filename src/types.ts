/**
 * AWS麻雀牌 - コア型定義
 * 
 * MPSZ形式に対応した麻雀牌の型定義
 * - M (Man/萬子): 1m-9m
 * - P (Pin/筒子): 1p-9p
 * - S (Sou/索子): 1s-9s
 * - Z (Honor/字牌): 1z-7z (東南西北白發中)
 */

// ============================================================================
// 牌の種類 (Tile Types)
// ============================================================================

/**
 * 牌の種類を表すMPSZ形式の型
 * - m: 萬子 (Man) - 数牌
 * - p: 筒子 (Pin) - 数牌
 * - s: 索子 (Sou) - 数牌
 * - z: 字牌 (Honor) - 字牌
 */
export type TileType = 'm' | 'p' | 's' | 'z';

// ============================================================================
// AWSサービス情報 (AWS Service Information)
// ============================================================================

/**
 * AWSサービスの情報
 * Requirements: 2.4, 2.5
 */
export interface AwsServiceInfo {
  /** AWSサービス識別子 (例: "ec2", "s3", "lambda") */
  id: string;
  /** 表示名 (例: "Amazon EC2", "Amazon S3") */
  displayName: string;
  /** アイコンファイルパス */
  iconPath: string;
}

// ============================================================================
// 表示設定 (Display Settings)
// ============================================================================

/**
 * 牌の表示設定（オプション）
 */
export interface TileDisplaySettings {
  /** カスタム牌種類ラベル */
  typeLabel?: string;
  /** アイコンスケール（デフォルト: 1.0） */
  iconScale?: number;
}

// ============================================================================
// 牌エントリ (Tile Entry)
// ============================================================================

/**
 * 牌設定エントリ
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */
export interface TileEntry {
  /**
   * 牌の識別子（MPSZ形式）
   * 例: "1m", "5p", "9s", "1z"
   */
  id: string;

  /**
   * 牌の種類
   * Requirements: 2.2
   */
  type: TileType;

  /**
   * 牌の番号
   * - 数牌 (m, p, s): 1-9
   * - 字牌 (z): 1-7 (1:東, 2:南, 3:西, 4:北, 5:白, 6:發, 7:中)
   * Requirements: 2.3
   */
  number: number;

  /**
   * AWSサービス情報
   * Requirements: 2.4, 2.5
   */
  awsService: AwsServiceInfo;

  /**
   * 表示設定（オプション）
   */
  display?: TileDisplaySettings;
}

// ============================================================================
// 牌設定 (Tile Configuration)
// ============================================================================

/**
 * 設定メタデータ
 */
export interface TileConfigMetadata {
  /** 設定バージョン */
  version: string;
  /** 生成日時（ISO 8601形式） */
  generatedAt?: string;
}

/**
 * 牌設定ファイルの構造
 * Requirements: 2.1
 */
export interface TileConfig {
  /** 牌エントリの配列 */
  tiles: TileEntry[];
  /** メタデータ */
  metadata: TileConfigMetadata;
}

// ============================================================================
// バリデーション結果 (Validation Results)
// ============================================================================

/**
 * バリデーションエラー
 * Requirements: 2.6
 */
export interface ValidationError {
  /** エラーが発生したフィールド名 */
  field: string;
  /** エラーメッセージ */
  message: string;
  /** 関連する牌ID（該当する場合） */
  tileId?: string;
}

/**
 * バリデーション結果
 * Requirements: 2.6
 */
export interface ValidationResult {
  /** バリデーションが成功したかどうか */
  valid: boolean;
  /** エラーの配列 */
  errors: ValidationError[];
}

// ============================================================================
// 生成結果 (Generation Results)
// ============================================================================

/**
 * 生成エラー
 */
export interface GenerationError {
  /** エラーが発生した牌ID */
  tileId: string;
  /** エラーメッセージ */
  message: string;
  /** エラーの種類 */
  type: 'icon_not_found' | 'output_error' | 'template_error' | 'png_conversion_error' | 'unknown';
}

/**
 * マニフェスト内の牌情報
 */
export interface TileManifestEntry {
  /** 牌ID（MPSZ形式） */
  id: string;
  /** 牌の種類 */
  type: TileType;
  /** 牌の番号 */
  number: number;
  /** 生成されたSVGファイルのパス */
  filePath: string;
  /** 生成されたPNGファイルのパス（PNG形式時） */
  pngFilePath?: string;
  /** AWSサービス情報（簡略版） */
  awsService: {
    id: string;
    displayName: string;
  };
}

/**
 * 牌マニフェスト
 * Requirements: 4.2
 */
export interface TileManifest {
  /** マニフェストバージョン */
  version: string;
  /** 生成日時（ISO 8601形式） */
  generatedAt: string;
  /** 生成された牌の総数 */
  tileCount: number;
  /** 牌エントリの配列 */
  tiles: TileManifestEntry[];
}

/**
 * 生成結果
 * Requirements: 4.5
 */
export interface GenerationResult {
  /** 生成が成功したかどうか */
  success: boolean;
  /** 生成された牌の数 */
  generated: number;
  /** 失敗した牌の数 */
  failed: number;
  /** エラーの配列 */
  errors: GenerationError[];
  /** 生成されたマニフェスト */
  manifest: TileManifest;
  /** 出力形式（PNG機能追加後に設定される） */
  format?: OutputFormat;
}

// ============================================================================
// ジェネレーターインターフェース (Generator Interface)
// ============================================================================

/**
 * 牌ジェネレーターのインターフェース
 */
export interface TileGenerator {
  /**
   * 設定の検証
   * @param config 検証する設定
   * @returns バリデーション結果
   */
  validateConfig(config: TileConfig): ValidationResult;

  /**
   * 単一牌の生成
   * @param entry 牌エントリ
   * @param template SVGテンプレート文字列
   * @returns 生成されたSVG文字列
   */
  generateTile(entry: TileEntry, template: string): string;

  /**
   * バッチ生成
   * @param config 牌設定
   * @param outputDir 出力ディレクトリ
   * @returns 生成結果
   */
  generateAll(config: TileConfig, outputDir: string): Promise<GenerationResult>;
}

// ============================================================================
// 出力形式 (Output Format)
// ============================================================================

/**
 * 出力形式
 * - svg: SVGのみ出力
 * - png: PNGのみ出力
 * - svg,png: SVGとPNGの両方を出力
 */
export type OutputFormat = 'svg' | 'png' | 'svg,png';

/**
 * PNG変換オプション
 */
export interface PngConvertOptions {
  /** スケールファクター（デフォルト: 2） */
  scale?: number;
}

/**
 * PNG変換結果
 */
export interface PngConvertResult {
  /** 成功したかどうか */
  success: boolean;
  /** PNGバイナリデータ（成功時） */
  buffer?: Buffer;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** 出力画像の幅（px） */
  width?: number;
  /** 出力画像の高さ（px） */
  height?: number;
}

// ============================================================================
// 定数 (Constants)
// ============================================================================

/**
 * 有効な出力形式の配列
 */
export const VALID_OUTPUT_FORMATS: readonly string[] = ['svg', 'png', 'svg,png'] as const;

/**
 * 文字列をOutputFormatにパース
 * 有効な値: 'svg', 'png', 'svg,png'
 * @param value パースする文字列
 * @returns 有効な場合はOutputFormat、無効な場合はnull
 */
export function parseOutputFormat(value: string): OutputFormat | null {
  if (VALID_OUTPUT_FORMATS.includes(value)) {
    return value as OutputFormat;
  }
  return null;
}

/**
 * 有効な牌種類の配列
 */
export const VALID_TILE_TYPES: readonly TileType[] = ['m', 'p', 's', 'z'] as const;

/**
 * 牌種類ごとの有効な番号範囲
 */
export const TILE_NUMBER_RANGES: Record<TileType, { min: number; max: number }> = {
  m: { min: 1, max: 9 },  // 萬子: 1-9
  p: { min: 1, max: 9 },  // 筒子: 1-9
  s: { min: 1, max: 9 },  // 索子: 1-9
  z: { min: 1, max: 7 },  // 字牌: 1-7
} as const;

/**
 * 字牌の名前マッピング
 */
export const HONOR_TILE_NAMES: Record<number, string> = {
  1: '東',  // East
  2: '南',  // South
  3: '西',  // West
  4: '北',  // North
  5: '白',  // White Dragon
  6: '發',  // Green Dragon
  7: '中',  // Red Dragon
} as const;

/**
 * 牌種類の日本語名
 */
export const TILE_TYPE_NAMES: Record<TileType, string> = {
  m: '萬子',  // Man
  p: '筒子',  // Pin
  s: '索子',  // Sou
  z: '字牌',  // Honor
} as const;
