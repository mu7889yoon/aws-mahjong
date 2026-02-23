/**
 * AWS麻雀牌 - ベース牌テンプレートのテスト
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  BASE_TILE_TEMPLATE,
  TILE_DIMENSIONS,
  VIEWBOX_DIMENSIONS,
  LAYOUT_SPECS,
  PLACEHOLDERS,
  replaceTileType,
  replaceServiceName,
  replaceIcon,
  replaceAllPlaceholders,
  escapeXml,
  validateTemplate,
  extractDimensions,
  hasPlaceholders,
} from '../src/template';

describe('ベース牌テンプレート', () => {
  describe('寸法の検証 (Requirements 1.1)', () => {
    it('テンプレートの幅は17mmであること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('width="17mm"');
      expect(TILE_DIMENSIONS.width).toBe(17);
    });

    it('テンプレートの高さは24mmであること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('height="24mm"');
      expect(TILE_DIMENSIONS.height).toBe(24);
    });

    it('viewBoxが正しく設定されていること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('viewBox="0 0 68 96"');
      expect(VIEWBOX_DIMENSIONS.width).toBe(68);
      expect(VIEWBOX_DIMENSIONS.height).toBe(96);
    });

    it('extractDimensionsが正しい寸法を返すこと', () => {
      const dimensions = extractDimensions(BASE_TILE_TEMPLATE);
      expect(dimensions.width).toBe(17);
      expect(dimensions.height).toBe(24);
      expect(dimensions.unit).toBe('mm');
    });
  });

  describe('牌種類表示エリア (Requirements 1.2)', () => {
    it('牌種類プレースホルダーが存在すること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('id="tile-type-placeholder"');
      expect(BASE_TILE_TEMPLATE).toContain(PLACEHOLDERS.tileType);
    });

    it('牌種類エリアのレイアウトが正しいこと', () => {
      // Y座標が12px（右上配置）
      expect(BASE_TILE_TEMPLATE).toContain('y="12"');
      // X座標が64px（右端）
      expect(BASE_TILE_TEMPLATE).toContain('x="64"');
      // フォントサイズが8px
      expect(BASE_TILE_TEMPLATE).toContain('font-size="8"');
      expect(LAYOUT_SPECS.tileType.x).toBe(64);
      expect(LAYOUT_SPECS.tileType.y).toBe(12);
      expect(LAYOUT_SPECS.tileType.fontSize).toBe(8);
    });
  });

  describe('AWSアイコン表示エリア (Requirements 1.3)', () => {
    it('アイコンプレースホルダーが存在すること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('id="icon-placeholder"');
    });

    it('アイコンエリアが60x60pxであること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('width="60"');
      expect(BASE_TILE_TEMPLATE).toContain('height="60"');
      expect(LAYOUT_SPECS.icon.width).toBe(60);
      expect(LAYOUT_SPECS.icon.height).toBe(60);
    });

    it('アイコンエリアが中央に配置されていること', () => {
      // transform="translate(4, 18)" で中央配置
      expect(BASE_TILE_TEMPLATE).toContain('transform="translate(4, 18)"');
      expect(LAYOUT_SPECS.icon.x).toBe(4);
      expect(LAYOUT_SPECS.icon.y).toBe(18);
    });
  });

  describe('サービス名表示エリア (Requirements 1.4)', () => {
    it('サービス名プレースホルダーが存在すること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('id="service-name-placeholder"');
      expect(BASE_TILE_TEMPLATE).toContain(PLACEHOLDERS.serviceName);
    });

    it('サービス名エリアのレイアウトが正しいこと', () => {
      // Y座標が88px（下部領域）
      expect(BASE_TILE_TEMPLATE).toContain('y="88"');
      // フォントサイズが6px
      expect(LAYOUT_SPECS.serviceName.y).toBe(88);
      expect(LAYOUT_SPECS.serviceName.fontSize).toBe(6);
    });
  });

  describe('有効なSVGテンプレート (Requirements 1.5)', () => {
    it('SVGルート要素が存在すること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('<svg');
      expect(BASE_TILE_TEMPLATE).toContain('</svg>');
    });

    it('XML宣言が含まれていること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('SVG名前空間が正しく設定されていること', () => {
      expect(BASE_TILE_TEMPLATE).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('validateTemplateが有効と判定すること', () => {
      const result = validateTemplate(BASE_TILE_TEMPLATE);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('hasPlaceholdersがすべてのプレースホルダーを検出すること', () => {
      const placeholders = hasPlaceholders(BASE_TILE_TEMPLATE);
      expect(placeholders.tileType).toBe(true);
      expect(placeholders.icon).toBe(true);
      expect(placeholders.serviceName).toBe(true);
    });
  });

  describe('透明背景 (Requirements 1.6)', () => {
    it('背景要素が存在しないこと（透明背景）', () => {
      expect(BASE_TILE_TEMPLATE).not.toContain('id="tile-background"');
    });

    it('影効果フィルターが存在しないこと', () => {
      expect(BASE_TILE_TEMPLATE).not.toContain('id="tile-shadow"');
      expect(BASE_TILE_TEMPLATE).not.toContain('feDropShadow');
    });
  });
});

describe('ヘルパー関数', () => {
  describe('replaceTileType', () => {
    it('牌種類プレースホルダーを置換できること', () => {
      const result = replaceTileType(BASE_TILE_TEMPLATE, '萬子');
      expect(result).toContain('萬子');
      expect(result).not.toContain(PLACEHOLDERS.tileType);
    });

    it('特殊文字がエスケープされること', () => {
      const result = replaceTileType(BASE_TILE_TEMPLATE, '<test>');
      expect(result).toContain('&lt;test&gt;');
    });
  });

  describe('replaceServiceName', () => {
    it('サービス名プレースホルダーを置換できること', () => {
      const result = replaceServiceName(BASE_TILE_TEMPLATE, 'Amazon EC2');
      expect(result).toContain('Amazon EC2');
      expect(result).not.toContain(PLACEHOLDERS.serviceName);
    });
  });

  describe('replaceIcon', () => {
    it('アイコンプレースホルダーを置換できること', () => {
      const iconContent = '<rect width="60" height="60" fill="orange"/>';
      const result = replaceIcon(BASE_TILE_TEMPLATE, iconContent);
      expect(result).toContain(iconContent);
      expect(result).toContain('id="icon-placeholder"');
    });
  });

  describe('replaceAllPlaceholders', () => {
    it('すべてのプレースホルダーを一度に置換できること', () => {
      const result = replaceAllPlaceholders(BASE_TILE_TEMPLATE, {
        tileType: '萬子',
        serviceName: 'Amazon S3',
        iconContent: '<circle cx="20" cy="20" r="15" fill="green"/>',
      });
      expect(result).toContain('萬子');
      expect(result).toContain('Amazon S3');
      expect(result).toContain('<circle cx="20" cy="20" r="15" fill="green"/>');
    });
  });

  describe('escapeXml', () => {
    it('アンパサンドをエスケープすること', () => {
      expect(escapeXml('A & B')).toBe('A &amp; B');
    });

    it('小なり記号をエスケープすること', () => {
      expect(escapeXml('A < B')).toBe('A &lt; B');
    });

    it('大なり記号をエスケープすること', () => {
      expect(escapeXml('A > B')).toBe('A &gt; B');
    });

    it('ダブルクォートをエスケープすること', () => {
      expect(escapeXml('A "B" C')).toBe('A &quot;B&quot; C');
    });

    it('シングルクォートをエスケープすること', () => {
      expect(escapeXml("A 'B' C")).toBe('A &apos;B&apos; C');
    });

    it('複数の特殊文字を同時にエスケープすること', () => {
      expect(escapeXml('<a href="test">A & B</a>')).toBe(
        '&lt;a href=&quot;test&quot;&gt;A &amp; B&lt;/a&gt;'
      );
    });
  });

  describe('validateTemplate', () => {
    it('有効なテンプレートを検証できること', () => {
      const result = validateTemplate(BASE_TILE_TEMPLATE);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('SVGルート要素がない場合にエラーを返すこと', () => {
      const result = validateTemplate('<div>Not SVG</div>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SVGルート要素が見つかりません');
    });

    it('寸法が正しくない場合にエラーを返すこと', () => {
      const invalidTemplate = '<svg width="20mm" height="30mm" viewBox="0 0 68 96"></svg>';
      const result = validateTemplate(invalidTemplate);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('幅が17mmではありません');
      expect(result.errors).toContain('高さが24mmではありません');
    });

    it('プレースホルダーがない場合にエラーを返すこと', () => {
      const invalidTemplate = '<svg width="17mm" height="24mm" viewBox="0 0 68 96"></svg>';
      const result = validateTemplate(invalidTemplate);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('牌種類プレースホルダー（tile-type-placeholder）が見つかりません');
      expect(result.errors).toContain('アイコンプレースホルダー（icon-placeholder）が見つかりません');
      expect(result.errors).toContain('サービス名プレースホルダー（service-name-placeholder）が見つかりません');
    });
  });

  describe('extractDimensions', () => {
    it('mm単位の寸法を抽出できること', () => {
      const result = extractDimensions('<svg width="17mm" height="24mm">');
      expect(result.width).toBe(17);
      expect(result.height).toBe(24);
      expect(result.unit).toBe('mm');
    });

    it('px単位の寸法を抽出できること', () => {
      const result = extractDimensions('<svg width="100px" height="200px">');
      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
      expect(result.unit).toBe('px');
    });

    it('寸法がない場合にnullを返すこと', () => {
      const result = extractDimensions('<svg viewBox="0 0 100 100">');
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
    });
  });

  describe('hasPlaceholders', () => {
    it('すべてのプレースホルダーを検出できること', () => {
      const result = hasPlaceholders(BASE_TILE_TEMPLATE);
      expect(result.tileType).toBe(true);
      expect(result.icon).toBe(true);
      expect(result.serviceName).toBe(true);
    });

    it('プレースホルダーがない場合にfalseを返すこと', () => {
      const result = hasPlaceholders('<svg></svg>');
      expect(result.tileType).toBe(false);
      expect(result.icon).toBe(false);
      expect(result.serviceName).toBe(false);
    });
  });
});


// ============================================================================
// プロパティベーステスト (Property-Based Tests)
// ============================================================================

describe('プロパティベーステスト', () => {
  /**
   * Property 1: ベース牌の寸法
   * 
   * *For any* 生成されたベース牌SVG、幅は17mm、高さは24mmでなければならない。
   * 
   * **Validates: Requirements 1.1**
   * 
   * このテストは、ベーステンプレートに対してさまざまな変換（プレースホルダー置換）を
   * 適用しても、牌の基本寸法（17mm × 24mm）が常に維持されることを検証します。
   */
  describe('Property 1: ベース牌の寸法', () => {
    // 牌種類のアービトラリ
    const tileTypeArb = fc.constantFrom('萬子', '筒子', '索子', '字牌', '東', '南', '西', '北', '白', '發', '中');
    
    // サービス名のアービトラリ（様々なAWSサービス名を生成）
    const serviceNameArb = fc.oneof(
      fc.constantFrom(
        'Amazon EC2',
        'Amazon S3',
        'AWS Lambda',
        'Amazon DynamoDB',
        'Amazon RDS',
        'Amazon CloudFront',
        'AWS IAM',
        'Amazon VPC',
        'Amazon ECS',
        'Amazon EKS'
      ),
      // ランダムな文字列も含める（エッジケース）
      fc.string({ minLength: 1, maxLength: 50 })
    );
    
    // アイコンコンテンツのアービトラリ（様々なSVG要素を生成）
    const iconContentArb = fc.oneof(
      fc.constantFrom(
        '<rect width="40" height="40" fill="orange"/>',
        '<circle cx="20" cy="20" r="15" fill="blue"/>',
        '<path d="M0 0 L40 40" stroke="black"/>',
        '<g><rect x="5" y="5" width="30" height="30" fill="green"/></g>',
        ''
      ),
      // ランダムなSVG要素
      fc.record({
        fill: fc.hexaString({ minLength: 6, maxLength: 6 }),
        width: fc.integer({ min: 1, max: 40 }),
        height: fc.integer({ min: 1, max: 40 }),
      }).map(({ fill, width, height }) => 
        `<rect width="${width}" height="${height}" fill="#${fill}"/>`
      )
    );

    it('ベーステンプレートは常に17mm × 24mmの寸法を持つこと', () => {
      fc.assert(
        fc.property(
          fc.constant(BASE_TILE_TEMPLATE),
          (template) => {
            const dimensions = extractDimensions(template);
            
            // 幅は17mmでなければならない
            expect(dimensions.width).toBe(17);
            // 高さは24mmでなければならない
            expect(dimensions.height).toBe(24);
            // 単位はmmでなければならない
            expect(dimensions.unit).toBe('mm');
            
            return dimensions.width === 17 && 
                   dimensions.height === 24 && 
                   dimensions.unit === 'mm';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('プレースホルダー置換後も寸法は17mm × 24mmを維持すること', () => {
      fc.assert(
        fc.property(
          tileTypeArb,
          serviceNameArb,
          iconContentArb,
          (tileType, serviceName, iconContent) => {
            // すべてのプレースホルダーを置換
            const generatedSvg = replaceAllPlaceholders(BASE_TILE_TEMPLATE, {
              tileType,
              serviceName,
              iconContent,
            });
            
            // 寸法を抽出
            const dimensions = extractDimensions(generatedSvg);
            
            // 幅は17mmでなければならない
            expect(dimensions.width).toBe(17);
            // 高さは24mmでなければならない
            expect(dimensions.height).toBe(24);
            // 単位はmmでなければならない
            expect(dimensions.unit).toBe('mm');
            
            return dimensions.width === 17 && 
                   dimensions.height === 24 && 
                   dimensions.unit === 'mm';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('牌種類置換後も寸法は17mm × 24mmを維持すること', () => {
      fc.assert(
        fc.property(
          tileTypeArb,
          (tileType) => {
            const generatedSvg = replaceTileType(BASE_TILE_TEMPLATE, tileType);
            const dimensions = extractDimensions(generatedSvg);
            
            return dimensions.width === 17 && 
                   dimensions.height === 24 && 
                   dimensions.unit === 'mm';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('サービス名置換後も寸法は17mm × 24mmを維持すること', () => {
      fc.assert(
        fc.property(
          serviceNameArb,
          (serviceName) => {
            const generatedSvg = replaceServiceName(BASE_TILE_TEMPLATE, serviceName);
            const dimensions = extractDimensions(generatedSvg);
            
            return dimensions.width === 17 && 
                   dimensions.height === 24 && 
                   dimensions.unit === 'mm';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('アイコン置換後も寸法は17mm × 24mmを維持すること', () => {
      fc.assert(
        fc.property(
          iconContentArb,
          (iconContent) => {
            const generatedSvg = replaceIcon(BASE_TILE_TEMPLATE, iconContent);
            const dimensions = extractDimensions(generatedSvg);
            
            return dimensions.width === 17 && 
                   dimensions.height === 24 && 
                   dimensions.unit === 'mm';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('TILE_DIMENSIONS定数は17mm × 24mmであること', () => {
      fc.assert(
        fc.property(
          fc.constant(TILE_DIMENSIONS),
          (dimensions) => {
            return dimensions.width === 17 && dimensions.height === 24;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validateTemplateは正しい寸法のテンプレートを有効と判定すること', () => {
      fc.assert(
        fc.property(
          tileTypeArb,
          serviceNameArb,
          iconContentArb,
          (tileType, serviceName, iconContent) => {
            const generatedSvg = replaceAllPlaceholders(BASE_TILE_TEMPLATE, {
              tileType,
              serviceName,
              iconContent,
            });
            
            // 生成されたSVGは有効でなければならない
            const validation = validateTemplate(generatedSvg);
            
            // 寸法に関するエラーがないことを確認
            const hasDimensionError = validation.errors.some(
              error => error.includes('幅') || error.includes('高さ')
            );
            
            return !hasDimensionError;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
