/**
 * AWS麻雀牌 - TileConfig バリデーター テスト
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { describe, it, expect } from "vitest";
import * as fc from 'fast-check';
import {
  validateTileConfig,
  validateRequiredFields,
  validateTileType,
  validateTileNumber,
  validateDuplicateIds,
  ValidationErrorTypes,
  createValidTileEntry,
  createValidTileConfig,
} from "../src/validator";
import { TileEntry, TileType, VALID_TILE_TYPES, TILE_NUMBER_RANGES } from "../src/types";

describe("validateTileConfig", () => {
  describe("有効な設定の検証", () => {
    it("有効な設定を受け入れる", () => {
      const config = createValidTileConfig();
      const result = validateTileConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("複数の有効なエントリを持つ設定を受け入れる", () => {
      const tiles: TileEntry[] = [
        createValidTileEntry({ id: "1m", type: "m", number: 1 }),
        createValidTileEntry({ id: "2p", type: "p", number: 2 }),
        createValidTileEntry({ id: "3s", type: "s", number: 3 }),
        createValidTileEntry({ id: "1z", type: "z", number: 1 }),
      ];
      const config = createValidTileConfig(tiles);
      const result = validateTileConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("無効な設定の検証 (Requirements: 2.6)", () => {
    it("nullの設定を拒否する", () => {
      const result = validateTileConfig(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("undefinedの設定を拒否する", () => {
      const result = validateTileConfig(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("tiles配列が欠落している設定を拒否する", () => {
      const config = { metadata: { version: "1.0.0" } };
      const result = validateTileConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "tiles")).toBe(true);
    });

    it("metadataが欠落している設定を拒否する", () => {
      const config = { tiles: [createValidTileEntry()] };
      const result = validateTileConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "metadata")).toBe(true);
    });
  });
});

describe("validateRequiredFields", () => {
  it("すべての必須フィールドが存在する場合、エラーなし", () => {
    const entry = createValidTileEntry();
    const errors = validateRequiredFields(entry, 0);
    expect(errors).toHaveLength(0);
  });

  it("idが欠落している場合、エラーを返す", () => {
    const entry = { ...createValidTileEntry(), id: undefined } as Partial<TileEntry>;
    const errors = validateRequiredFields(entry, 0);
    expect(errors.some(e => e.field === "id")).toBe(true);
  });

  it("typeが欠落している場合、エラーを返す", () => {
    const entry = { ...createValidTileEntry(), type: undefined } as Partial<TileEntry>;
    const errors = validateRequiredFields(entry, 0);
    expect(errors.some(e => e.field === "type")).toBe(true);
  });

  it("numberが欠落している場合、エラーを返す", () => {
    const entry = { ...createValidTileEntry(), number: undefined } as Partial<TileEntry>;
    const errors = validateRequiredFields(entry, 0);
    expect(errors.some(e => e.field === "number")).toBe(true);
  });

  it("awsServiceが欠落している場合、エラーを返す", () => {
    const entry = { ...createValidTileEntry(), awsService: undefined } as Partial<TileEntry>;
    const errors = validateRequiredFields(entry, 0);
    expect(errors.some(e => e.field === "awsService")).toBe(true);
  });

  it("awsService.idが欠落している場合、エラーを返す", () => {
    const entry = createValidTileEntry();
    entry.awsService = { ...entry.awsService, id: "" };
    const errors = validateRequiredFields(entry, 0);
    expect(errors.some(e => e.field === "awsService.id")).toBe(true);
  });

  it("awsService.iconPathが欠落している場合、エラーを返す", () => {
    const entry = createValidTileEntry();
    entry.awsService = { ...entry.awsService, iconPath: "" };
    const errors = validateRequiredFields(entry, 0);
    expect(errors.some(e => e.field === "awsService.iconPath")).toBe(true);
  });
});

describe("validateTileType", () => {
  it.each(VALID_TILE_TYPES)("有効な牌種類 %s を受け入れる", (type) => {
    const error = validateTileType(type, "1m");
    expect(error).toBeNull();
  });

  it("無効な牌種類を拒否する", () => {
    const error = validateTileType("x", "1x");
    expect(error).not.toBeNull();
    expect(error!.message).toContain(ValidationErrorTypes.INVALID_TYPE);
  });

  it("undefined/nullの場合はnullを返す", () => {
    expect(validateTileType(undefined, "1m")).toBeNull();
    expect(validateTileType(null, "1m")).toBeNull();
  });
});

describe("validateTileNumber", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])("数牌の有効な番号 %d を受け入れる", (num) => {
    expect(validateTileNumber(num, "m", "1m")).toBeNull();
  });

  it.each([1, 2, 3, 4, 5, 6, 7])("字牌の有効な番号 %d を受け入れる", (num) => {
    expect(validateTileNumber(num, "z", num + "z")).toBeNull();
  });

  it("数牌の範囲外の番号（0）を拒否する", () => {
    const error = validateTileNumber(0, "m", "0m");
    expect(error).not.toBeNull();
    expect(error!.message).toContain(ValidationErrorTypes.INVALID_NUMBER);
  });

  it("数牌の範囲外の番号（10）を拒否する", () => {
    const error = validateTileNumber(10, "m", "10m");
    expect(error).not.toBeNull();
  });

  it("字牌の範囲外の番号（8）を拒否する", () => {
    const error = validateTileNumber(8, "z", "8z");
    expect(error).not.toBeNull();
  });

  it("小数を拒否する", () => {
    const error = validateTileNumber(1.5, "m", "1.5m");
    expect(error).not.toBeNull();
  });

  it("undefined/nullの場合はnullを返す", () => {
    expect(validateTileNumber(undefined, "m", "1m")).toBeNull();
    expect(validateTileNumber(null, "m", "1m")).toBeNull();
  });
});

describe("validateDuplicateIds", () => {
  it("重複がない場合、エラーなし", () => {
    const entries = [
      createValidTileEntry({ id: "1m" }),
      createValidTileEntry({ id: "2m" }),
    ];
    const errors = validateDuplicateIds(entries);
    expect(errors).toHaveLength(0);
  });

  it("重複IDがある場合、エラーを返す", () => {
    const entries = [
      createValidTileEntry({ id: "1m" }),
      createValidTileEntry({ id: "1m" }),
    ];
    const errors = validateDuplicateIds(entries);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain(ValidationErrorTypes.DUPLICATE_ID);
  });
});

describe("統合テスト", () => {
  it("完全な34種類の牌設定を検証できる", () => {
    const tiles: TileEntry[] = [];
    for (let i = 1; i <= 9; i++) {
      tiles.push(createValidTileEntry({ id: i + "m", type: "m", number: i }));
    }
    for (let i = 1; i <= 9; i++) {
      tiles.push(createValidTileEntry({ id: i + "p", type: "p", number: i }));
    }
    for (let i = 1; i <= 9; i++) {
      tiles.push(createValidTileEntry({ id: i + "s", type: "s", number: i }));
    }
    for (let i = 1; i <= 7; i++) {
      tiles.push(createValidTileEntry({ id: i + "z", type: "z", number: i }));
    }
    const config = createValidTileConfig(tiles);
    const result = validateTileConfig(config);
    expect(result.valid).toBe(true);
    expect(tiles).toHaveLength(34);
  });
});

// ============================================================================
// プロパティベーステスト (Property-Based Tests)
// ============================================================================

/**
 * Property 3: 無効な設定の検証エラー
 * **Validates: Requirements 2.6**
 * 
 * *For any* 必須フィールドが欠けているTileConfigエントリ、バリデーターは欠けているフィールドを特定するエラーを返さなければならない。
 * 
 * IF a Tile_Config entry is missing required fields, THEN THE Tile_Generator SHALL return a validation error with specific field information
 */
describe('Property 3: 無効な設定の検証エラー (Invalid Configuration Validation Errors)', () => {
  // ============================================================================
  // ジェネレーター (Generators)
  // ============================================================================

  /**
   * 有効な牌種類を生成するジェネレーター
   */
  const tileTypeArb: fc.Arbitrary<TileType> = fc.constantFrom(...VALID_TILE_TYPES);

  /**
   * 牌種類に応じた有効な番号を生成するジェネレーター
   */
  const tileNumberArb = (type: TileType): fc.Arbitrary<number> => {
    const range = TILE_NUMBER_RANGES[type];
    return fc.integer({ min: range.min, max: range.max });
  };

  /**
   * 有効なAWSサービスIDを生成するジェネレーター
   */
  const awsServiceIdArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-z][a-z0-9-]{0,18}[a-z0-9]$/)
    .filter(s => s.length >= 2 && s.length <= 20);

  /**
   * 有効なAWSサービス表示名を生成するジェネレーター
   */
  const awsDisplayNameArb: fc.Arbitrary<string> = fc.tuple(
    fc.constantFrom('Amazon', 'AWS'),
    fc.stringMatching(/^[A-Za-z0-9 ]{2,30}$/)
  ).map(([prefix, name]) => `${prefix} ${name.trim()}`).filter(s => s.length >= 5);

  /**
   * 有効なアイコンパスを生成するジェネレーター
   */
  const iconPathArb: fc.Arbitrary<string> = fc.tuple(
    fc.constantFrom('assets/icons/', 'icons/', 'images/aws/'),
    fc.stringMatching(/^[a-z0-9_-]{2,20}$/),
    fc.constantFrom('.svg', '.png')
  ).map(([dir, name, ext]) => `${dir}${name}${ext}`);

  /**
   * 有効なTileEntryを生成するジェネレーター（ベース）
   */
  const validTileEntryArb: fc.Arbitrary<TileEntry> = tileTypeArb.chain(type => 
    fc.tuple(
      tileNumberArb(type),
      awsServiceIdArb,
      awsDisplayNameArb,
      iconPathArb
    ).map(([number, serviceId, displayName, iconPath]) => ({
      id: `${number}${type}`,
      type,
      number,
      awsService: {
        id: serviceId,
        displayName,
        iconPath,
      },
    }))
  );

  /**
   * 欠落させるフィールドの種類
   */
  type MissingFieldType = 'type' | 'number' | 'awsService.id' | 'awsService.iconPath';

  /**
   * 欠落させるフィールドを選択するジェネレーター
   */
  const missingFieldArb: fc.Arbitrary<MissingFieldType> = fc.constantFrom(
    'type',
    'number',
    'awsService.id',
    'awsService.iconPath'
  );

  /**
   * 複数の欠落フィールドを選択するジェネレーター（1〜4個）
   */
  const multipleMissingFieldsArb: fc.Arbitrary<MissingFieldType[]> = fc.uniqueArray(
    missingFieldArb,
    { minLength: 1, maxLength: 4 }
  );

  /**
   * 指定されたフィールドを欠落させたエントリを生成する関数
   */
  function createEntryWithMissingField(
    baseEntry: TileEntry,
    missingField: MissingFieldType
  ): Partial<TileEntry> {
    const entry: Partial<TileEntry> = { ...baseEntry };
    
    switch (missingField) {
      case 'type':
        delete entry.type;
        break;
      case 'number':
        delete entry.number;
        break;
      case 'awsService.id':
        entry.awsService = { ...baseEntry.awsService, id: '' };
        break;
      case 'awsService.iconPath':
        entry.awsService = { ...baseEntry.awsService, iconPath: '' };
        break;
    }
    
    return entry;
  }

  /**
   * 複数のフィールドを欠落させたエントリを生成する関数
   */
  function createEntryWithMissingFields(
    baseEntry: TileEntry,
    missingFields: MissingFieldType[]
  ): Partial<TileEntry> {
    let entry: Partial<TileEntry> = { ...baseEntry };
    
    for (const field of missingFields) {
      entry = createEntryWithMissingField(entry as TileEntry, field);
    }
    
    return entry;
  }

  /**
   * 単一フィールドが欠落したTileConfigを生成するジェネレーター
   */
  const configWithMissingFieldArb: fc.Arbitrary<{
    config: { tiles: Partial<TileEntry>[]; metadata: { version: string } };
    missingField: MissingFieldType;
  }> = fc.tuple(validTileEntryArb, missingFieldArb).map(([entry, missingField]) => ({
    config: {
      tiles: [createEntryWithMissingField(entry, missingField)],
      metadata: { version: '1.0.0' },
    },
    missingField,
  }));

  /**
   * 複数フィールドが欠落したTileConfigを生成するジェネレーター
   */
  const configWithMultipleMissingFieldsArb: fc.Arbitrary<{
    config: { tiles: Partial<TileEntry>[]; metadata: { version: string } };
    missingFields: MissingFieldType[];
  }> = fc.tuple(validTileEntryArb, multipleMissingFieldsArb).map(([entry, missingFields]) => ({
    config: {
      tiles: [createEntryWithMissingFields(entry, missingFields)],
      metadata: { version: '1.0.0' },
    },
    missingFields,
  }));

  // ============================================================================
  // プロパティテスト (Property Tests)
  // ============================================================================

  it('typeフィールドが欠落している場合、バリデーションエラーを返す', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: For any TileConfig entry missing the 'type' field,
     * the validator must return an error identifying the missing field.
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry) => {
        const invalidEntry = createEntryWithMissingField(entry, 'type');
        const config = {
          tiles: [invalidEntry],
          metadata: { version: '1.0.0' },
        };
        
        const result = validateTileConfig(config);
        
        // バリデーションは失敗しなければならない
        if (result.valid) return false;
        
        // 'type'フィールドに関するエラーが含まれなければならない
        const hasTypeError = result.errors.some(e => e.field === 'type');
        return hasTypeError;
      }),
      { numRuns: 100 }
    );
  });

  it('numberフィールドが欠落している場合、バリデーションエラーを返す', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: For any TileConfig entry missing the 'number' field,
     * the validator must return an error identifying the missing field.
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry) => {
        const invalidEntry = createEntryWithMissingField(entry, 'number');
        const config = {
          tiles: [invalidEntry],
          metadata: { version: '1.0.0' },
        };
        
        const result = validateTileConfig(config);
        
        // バリデーションは失敗しなければならない
        if (result.valid) return false;
        
        // 'number'フィールドに関するエラーが含まれなければならない
        const hasNumberError = result.errors.some(e => e.field === 'number');
        return hasNumberError;
      }),
      { numRuns: 100 }
    );
  });

  it('awsService.idフィールドが欠落している場合、バリデーションエラーを返す', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: For any TileConfig entry missing the 'awsService.id' field,
     * the validator must return an error identifying the missing field.
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry) => {
        const invalidEntry = createEntryWithMissingField(entry, 'awsService.id');
        const config = {
          tiles: [invalidEntry],
          metadata: { version: '1.0.0' },
        };
        
        const result = validateTileConfig(config);
        
        // バリデーションは失敗しなければならない
        if (result.valid) return false;
        
        // 'awsService.id'フィールドに関するエラーが含まれなければならない
        const hasServiceIdError = result.errors.some(e => e.field === 'awsService.id');
        return hasServiceIdError;
      }),
      { numRuns: 100 }
    );
  });

  it('awsService.iconPathフィールドが欠落している場合、バリデーションエラーを返す', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: For any TileConfig entry missing the 'awsService.iconPath' field,
     * the validator must return an error identifying the missing field.
     */
    fc.assert(
      fc.property(validTileEntryArb, (entry) => {
        const invalidEntry = createEntryWithMissingField(entry, 'awsService.iconPath');
        const config = {
          tiles: [invalidEntry],
          metadata: { version: '1.0.0' },
        };
        
        const result = validateTileConfig(config);
        
        // バリデーションは失敗しなければならない
        if (result.valid) return false;
        
        // 'awsService.iconPath'フィールドに関するエラーが含まれなければならない
        const hasIconPathError = result.errors.some(e => e.field === 'awsService.iconPath');
        return hasIconPathError;
      }),
      { numRuns: 100 }
    );
  });

  it('任意の必須フィールドが欠落している場合、そのフィールドを特定するエラーを返す', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: For any TileConfig entry missing any required field,
     * the validator must return an error that identifies the specific missing field.
     */
    fc.assert(
      fc.property(configWithMissingFieldArb, ({ config, missingField }) => {
        const result = validateTileConfig(config);
        
        // バリデーションは失敗しなければならない
        if (result.valid) return false;
        
        // 欠落したフィールドに関するエラーが含まれなければならない
        const hasExpectedError = result.errors.some(e => e.field === missingField);
        
        // エラーメッセージにMissingFieldErrorが含まれなければならない
        const hasMissingFieldErrorType = result.errors.some(e => 
          e.message.includes(ValidationErrorTypes.MISSING_FIELD)
        );
        
        return hasExpectedError && hasMissingFieldErrorType;
      }),
      { numRuns: 100 }
    );
  });

  it('複数の必須フィールドが欠落している場合、すべての欠落フィールドを特定するエラーを返す', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: For any TileConfig entry missing multiple required fields,
     * the validator must return errors identifying all missing fields.
     */
    fc.assert(
      fc.property(configWithMultipleMissingFieldsArb, ({ config, missingFields }) => {
        const result = validateTileConfig(config);
        
        // バリデーションは失敗しなければならない
        if (result.valid) return false;
        
        // すべての欠落フィールドに対してエラーが存在しなければならない
        const allFieldsHaveErrors = missingFields.every(field => 
          result.errors.some(e => e.field === field)
        );
        
        return allFieldsHaveErrors;
      }),
      { numRuns: 100 }
    );
  });

  it('エラーメッセージには欠落フィールドの情報が含まれる', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: For any validation error due to missing fields,
     * the error message must contain specific field information.
     */
    fc.assert(
      fc.property(configWithMissingFieldArb, ({ config, missingField }) => {
        const result = validateTileConfig(config);
        
        // バリデーションは失敗しなければならない
        if (result.valid) return false;
        
        // 該当フィールドのエラーを取得
        const fieldError = result.errors.find(e => e.field === missingField);
        if (!fieldError) return false;
        
        // エラーメッセージにフィールド名が含まれなければならない
        const messageContainsFieldInfo = fieldError.message.includes(missingField) ||
          fieldError.message.includes('必須フィールド');
        
        return messageContainsFieldInfo;
      }),
      { numRuns: 100 }
    );
  });

  it('有効なエントリと無効なエントリが混在する場合、無効なエントリのみエラーを返す', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: When a config contains both valid and invalid entries,
     * only the invalid entries should produce validation errors.
     */
    fc.assert(
      fc.property(
        fc.tuple(validTileEntryArb, validTileEntryArb, missingFieldArb),
        ([validEntry1, validEntry2, missingField]) => {
          // 2つ目のエントリのIDを変更して重複を避ける
          const modifiedValidEntry2 = {
            ...validEntry2,
            id: `${validEntry2.number + 1}${validEntry2.type}`,
            number: validEntry2.number === 9 ? 1 : validEntry2.number + 1,
          };
          
          // 3つ目のエントリを無効にする
          const invalidEntry = createEntryWithMissingField(
            { ...validEntry1, id: '9z', type: 'z', number: 7 },
            missingField
          );
          
          const config = {
            tiles: [validEntry1, modifiedValidEntry2, invalidEntry],
            metadata: { version: '1.0.0' },
          };
          
          const result = validateTileConfig(config);
          
          // バリデーションは失敗しなければならない
          if (result.valid) return false;
          
          // 欠落フィールドに関するエラーが存在しなければならない
          const hasExpectedError = result.errors.some(e => e.field === missingField);
          
          return hasExpectedError;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('バリデーションエラーにはtileIdが含まれる（該当する場合）', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * Property: Validation errors for tile entries should include the tileId
     * to help identify which entry has the problem.
     */
    fc.assert(
      fc.property(configWithMissingFieldArb, ({ config, missingField }) => {
        const result = validateTileConfig(config);
        
        // バリデーションは失敗しなければならない
        if (result.valid) return false;
        
        // 該当フィールドのエラーを取得
        const fieldError = result.errors.find(e => e.field === missingField);
        if (!fieldError) return false;
        
        // tileIdが存在しなければならない
        return fieldError.tileId !== undefined && fieldError.tileId !== null;
      }),
      { numRuns: 100 }
    );
  });
});
