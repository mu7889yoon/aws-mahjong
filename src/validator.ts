/**
 * AWS麻雀牌 - TileConfig バリデーター
 * 
 * 牌設定の検証を行うモジュール
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import {
  TileConfig,
  TileEntry,
  TileType,
  ValidationResult,
  ValidationError,
  VALID_TILE_TYPES,
  TILE_NUMBER_RANGES,
} from './types';

// ============================================================================
// エラー種別定数 (Error Type Constants)
// ============================================================================

/**
 * バリデーションエラーの種別
 */
export const ValidationErrorTypes = {
  MISSING_FIELD: 'MissingFieldError',
  INVALID_TYPE: 'InvalidTypeError',
  INVALID_NUMBER: 'InvalidNumberError',
  DUPLICATE_ID: 'DuplicateIdError',
} as const;

// ============================================================================
// バリデーション関数 (Validation Functions)
// ============================================================================

/**
 * 必須フィールドの検証
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6
 * 
 * @param entry 検証する牌エントリ
 * @param index エントリのインデックス
 * @returns バリデーションエラーの配列
 */
export function validateRequiredFields(entry: Partial<TileEntry>, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const tileId = entry.id || `tiles[${index}]`;

  // id フィールドの検証
  if (entry.id === undefined || entry.id === null || entry.id === '') {
    errors.push({
      field: 'id',
      message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'id' が欠落しています`,
      tileId,
    });
  }

  // type フィールドの検証 (Requirements: 2.2)
  if (entry.type === undefined || entry.type === null) {
    errors.push({
      field: 'type',
      message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'type' (牌種類) が欠落しています`,
      tileId,
    });
  }

  // number フィールドの検証 (Requirements: 2.3)
  if (entry.number === undefined || entry.number === null) {
    errors.push({
      field: 'number',
      message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'number' (牌番号) が欠落しています`,
      tileId,
    });
  }

  // awsService フィールドの検証 (Requirements: 2.4, 2.5)
  if (!entry.awsService) {
    errors.push({
      field: 'awsService',
      message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'awsService' が欠落しています`,
      tileId,
    });
  } else {
    // awsService.id の検証 (Requirements: 2.4)
    if (!entry.awsService.id) {
      errors.push({
        field: 'awsService.id',
        message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'awsService.id' (AWSサービス識別子) が欠落しています`,
        tileId,
      });
    }

    // awsService.displayName の検証
    if (!entry.awsService.displayName) {
      errors.push({
        field: 'awsService.displayName',
        message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'awsService.displayName' が欠落しています`,
        tileId,
      });
    }

    // awsService.iconPath の検証 (Requirements: 2.5)
    if (!entry.awsService.iconPath) {
      errors.push({
        field: 'awsService.iconPath',
        message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'awsService.iconPath' (アイコンパス) が欠落しています`,
        tileId,
      });
    }
  }

  return errors;
}

/**
 * 牌種類の検証
 * Requirements: 2.2
 * 
 * @param type 検証する牌種類
 * @param tileId 牌ID
 * @returns バリデーションエラー（無効な場合）またはnull
 */
export function validateTileType(type: unknown, tileId: string): ValidationError | null {
  if (type === undefined || type === null) {
    return null; // 必須フィールド検証で処理済み
  }

  if (!VALID_TILE_TYPES.includes(type as TileType)) {
    return {
      field: 'type',
      message: `${ValidationErrorTypes.INVALID_TYPE}: 不正な牌種類 '${type}' です。有効な種類: ${VALID_TILE_TYPES.join(', ')}`,
      tileId,
    };
  }

  return null;
}

/**
 * 牌番号の検証
 * Requirements: 2.3
 * 
 * @param number 検証する番号
 * @param type 牌種類
 * @param tileId 牌ID
 * @returns バリデーションエラー（無効な場合）またはnull
 */
export function validateTileNumber(number: unknown, type: TileType | undefined, tileId: string): ValidationError | null {
  if (number === undefined || number === null) {
    return null; // 必須フィールド検証で処理済み
  }

  if (typeof number !== 'number' || !Number.isInteger(number)) {
    return {
      field: 'number',
      message: `${ValidationErrorTypes.INVALID_NUMBER}: 牌番号は整数である必要があります。値: ${number}`,
      tileId,
    };
  }

  // 牌種類が有効な場合のみ範囲検証
  if (type && VALID_TILE_TYPES.includes(type)) {
    const range = TILE_NUMBER_RANGES[type];
    if (number < range.min || number > range.max) {
      return {
        field: 'number',
        message: `${ValidationErrorTypes.INVALID_NUMBER}: 牌種類 '${type}' の番号は ${range.min}-${range.max} の範囲である必要があります。値: ${number}`,
        tileId,
      };
    }
  }

  return null;
}

/**
 * 重複IDの検出
 * 
 * @param entries 牌エントリの配列
 * @returns バリデーションエラーの配列
 */
export function validateDuplicateIds(entries: Partial<TileEntry>[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Map<string, number>();

  entries.forEach((entry, index) => {
    if (entry.id) {
      const previousIndex = seenIds.get(entry.id);
      if (previousIndex !== undefined) {
        errors.push({
          field: 'id',
          message: `${ValidationErrorTypes.DUPLICATE_ID}: 牌ID '${entry.id}' が重複しています（インデックス ${previousIndex} と ${index}）`,
          tileId: entry.id,
        });
      } else {
        seenIds.set(entry.id, index);
      }
    }
  });

  return errors;
}

/**
 * TileConfigの検証
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * 
 * @param config 検証する設定
 * @returns バリデーション結果
 */
export function validateTileConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // configがオブジェクトかどうかの検証
  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: [{
        field: 'config',
        message: `${ValidationErrorTypes.MISSING_FIELD}: 設定オブジェクトが無効です`,
      }],
    };
  }

  const typedConfig = config as Partial<TileConfig>;

  // tiles配列の存在検証
  if (!typedConfig.tiles) {
    errors.push({
      field: 'tiles',
      message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'tiles' が欠落しています`,
    });
    return { valid: false, errors };
  }

  if (!Array.isArray(typedConfig.tiles)) {
    errors.push({
      field: 'tiles',
      message: `${ValidationErrorTypes.INVALID_TYPE}: 'tiles' は配列である必要があります`,
    });
    return { valid: false, errors };
  }

  // metadata の検証
  if (!typedConfig.metadata) {
    errors.push({
      field: 'metadata',
      message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'metadata' が欠落しています`,
    });
  } else if (!typedConfig.metadata.version) {
    errors.push({
      field: 'metadata.version',
      message: `${ValidationErrorTypes.MISSING_FIELD}: 必須フィールド 'metadata.version' が欠落しています`,
    });
  }

  // 各エントリの検証
  typedConfig.tiles.forEach((entry, index) => {
    // 必須フィールドの検証
    const requiredFieldErrors = validateRequiredFields(entry as Partial<TileEntry>, index);
    errors.push(...requiredFieldErrors);

    // 牌種類の検証
    const typeError = validateTileType((entry as Partial<TileEntry>).type, (entry as Partial<TileEntry>).id || `tiles[${index}]`);
    if (typeError) {
      errors.push(typeError);
    }

    // 牌番号の検証
    const numberError = validateTileNumber(
      (entry as Partial<TileEntry>).number,
      (entry as Partial<TileEntry>).type as TileType | undefined,
      (entry as Partial<TileEntry>).id || `tiles[${index}]`
    );
    if (numberError) {
      errors.push(numberError);
    }
  });

  // 重複IDの検出
  const duplicateErrors = validateDuplicateIds(typedConfig.tiles as Partial<TileEntry>[]);
  errors.push(...duplicateErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// ヘルパー関数 (Helper Functions)
// ============================================================================

/**
 * 有効なTileEntryを作成するためのヘルパー
 * テスト用
 * 
 * @param overrides 上書きするプロパティ
 * @returns 有効なTileEntry
 */
export function createValidTileEntry(overrides: Partial<TileEntry> = {}): TileEntry {
  return {
    id: '1m',
    type: 'm',
    number: 1,
    awsService: {
      id: 'ec2',
      displayName: 'Amazon EC2',
      iconPath: 'assets/icons/ec2.svg',
    },
    ...overrides,
  };
}

/**
 * 有効なTileConfigを作成するためのヘルパー
 * テスト用
 * 
 * @param tiles 牌エントリの配列
 * @param metadata メタデータ
 * @returns 有効なTileConfig
 */
export function createValidTileConfig(
  tiles: TileEntry[] = [createValidTileEntry()],
  metadata: { version: string; generatedAt?: string } = { version: '1.0.0' }
): TileConfig {
  return {
    tiles,
    metadata,
  };
}
