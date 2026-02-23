/**
 * AWS麻雀牌 - ベース牌テンプレート
 * 
 * 17mm × 24mm のSVGテンプレートで、以下の3つのプレースホルダーエリアを含みます：
 * - 牌種類表示エリア（上部）
 * - AWSアイコン表示エリア（中央）
 * - サービス名表示エリア（下部）
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

// ============================================================================
// テンプレート定数 (Template Constants)
// ============================================================================

/**
 * 牌の寸法（ミリメートル）
 * Requirements: 1.1
 */
export const TILE_DIMENSIONS = {
  /** 幅（mm） */
  width: 17,
  /** 高さ（mm） */
  height: 24,
} as const;

/**
 * SVG viewBox の寸法（ピクセル）
 * 約4px/mmの比率
 */
export const VIEWBOX_DIMENSIONS = {
  /** 幅（px） */
  width: 68,
  /** 高さ（px） */
  height: 96,
} as const;

/**
 * レイアウト仕様
 */
export const LAYOUT_SPECS = {
  /** 牌種類エリア */
  tileType: {
    /** X座標（px） */
    x: 64,
    /** Y座標（px） */
    y: 12,
    /** フォントサイズ（px） */
    fontSize: 8,
  },
  /** アイコンエリア */
  icon: {
    /** X座標（px） */
    x: 4,
    /** Y座標（px） */
    y: 18,
    /** 幅（px） */
    width: 60,
    /** 高さ（px） */
    height: 60,
  },
  /** サービス名エリア */
  serviceName: {
    /** Y座標（px） */
    y: 88,
    /** フォントサイズ（px） */
    fontSize: 6,
  },
} as const;

/**
 * プレースホルダー文字列
 */
export const PLACEHOLDERS = {
  /** 牌種類プレースホルダー */
  tileType: '{{TILE_TYPE}}',
  /** アイコンプレースホルダー */
  icon: '{{ICON}}',
  /** サービス名プレースホルダー */
  serviceName: '{{SERVICE_NAME}}',
} as const;

// ============================================================================
// ベーステンプレート (Base Template)
// ============================================================================

/**
 * ベース牌SVGテンプレート
 * 
 * 17mm × 24mm のSVGテンプレートで、以下の要素を含みます：
 * - 透明背景
 * - 牌種類表示エリア（右上 8px）
 * - AWSアイコン表示エリア（中央 60x60px）
 * - サービス名表示エリア（下部 12px）
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export const BASE_TILE_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="17mm" height="24mm" viewBox="0 0 68 96">
  <!-- 牌種類表示エリア（右上） -->
  <text 
    id="tile-type-placeholder" 
    x="64" 
    y="12" 
    font-family="sans-serif" 
    font-size="8" 
    text-anchor="end" 
    fill="#666666"
  >{{TILE_TYPE}}</text>
  
  <!-- AWSアイコン表示エリア（中央） -->
  <g id="icon-placeholder" transform="translate(4, 18)">
    <!-- アイコンは60x60pxの正方形エリアに配置 -->
    <rect 
      x="0" 
      y="0" 
      width="60" 
      height="60" 
      fill="none" 
      stroke="#CCCCCC" 
      stroke-width="0.5" 
      stroke-dasharray="2,2"
    />
    <text 
      x="30" 
      y="34" 
      font-family="sans-serif" 
      font-size="6" 
      text-anchor="middle" 
      fill="#999999"
    >{{ICON}}</text>
  </g>
  
  <!-- サービス名表示エリア（下部） -->
  <text 
    id="service-name-placeholder" 
    x="34" 
    y="88" 
    font-family="sans-serif" 
    font-size="6" 
    text-anchor="middle" 
    fill="#333333"
  >{{SERVICE_NAME}}</text>
</svg>`;

// ============================================================================
// ヘルパー関数 (Helper Functions)
// ============================================================================

/**
 * テンプレートから牌種類プレースホルダーを置換
 * @param template SVGテンプレート文字列
 * @param tileType 牌種類ラベル
 * @returns 置換後のSVG文字列
 */
export function replaceTileType(template: string, tileType: string): string {
  return template.replace(PLACEHOLDERS.tileType, escapeXml(tileType));
}

/**
 * テンプレートからサービス名プレースホルダーを置換
 * @param template SVGテンプレート文字列
 * @param serviceName サービス名
 * @returns 置換後のSVG文字列
 */
export function replaceServiceName(template: string, serviceName: string): string {
  return template.replace(PLACEHOLDERS.serviceName, escapeXml(serviceName));
}

/**
 * テンプレートからアイコンプレースホルダーを置換
 * アイコンコンテンツはicon-placeholderグループ内に配置されます
 * @param template SVGテンプレート文字列
 * @param iconContent アイコンSVGコンテンツ（<g>タグ内に配置される）
 * @returns 置換後のSVG文字列
 */
export function replaceIcon(template: string, iconContent: string): string {
  // アイコンプレースホルダーグループ全体を置換
  const iconPlaceholderRegex = /<g id="icon-placeholder"[^>]*>[\s\S]*?<\/g>/;
  const newIconGroup = `<g id="icon-placeholder" transform="translate(4, 18)">${iconContent}</g>`;
  return template.replace(iconPlaceholderRegex, newIconGroup);
}

/**
 * すべてのプレースホルダーを一度に置換
 * @param template SVGテンプレート文字列
 * @param options 置換オプション
 * @returns 置換後のSVG文字列
 */
export function replaceAllPlaceholders(
  template: string,
  options: {
    tileType: string;
    serviceName: string;
    iconContent: string;
  }
): string {
  let result = template;
  result = replaceTileType(result, options.tileType);
  result = replaceServiceName(result, options.serviceName);
  result = replaceIcon(result, options.iconContent);
  return result;
}

/**
 * XML特殊文字をエスケープ
 * @param text エスケープするテキスト
 * @returns エスケープ後のテキスト
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * テンプレートが有効なSVGかどうかを検証
 * @param template 検証するSVGテンプレート
 * @returns 検証結果
 */
export function validateTemplate(template: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // SVGルート要素の存在確認
  if (!template.includes('<svg')) {
    errors.push('SVGルート要素が見つかりません');
  }

  // 寸法の確認 (17mm x 24mm)
  if (!template.includes('width="17mm"')) {
    errors.push('幅が17mmではありません');
  }
  if (!template.includes('height="24mm"')) {
    errors.push('高さが24mmではありません');
  }

  // viewBoxの確認
  if (!template.includes('viewBox="0 0 68 96"')) {
    errors.push('viewBoxが正しくありません（期待値: 0 0 68 96）');
  }

  // プレースホルダーの存在確認
  if (!template.includes('id="tile-type-placeholder"')) {
    errors.push('牌種類プレースホルダー（tile-type-placeholder）が見つかりません');
  }
  if (!template.includes('id="icon-placeholder"')) {
    errors.push('アイコンプレースホルダー（icon-placeholder）が見つかりません');
  }
  if (!template.includes('id="service-name-placeholder"')) {
    errors.push('サービス名プレースホルダー（service-name-placeholder）が見つかりません');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * テンプレートから寸法を抽出
 * @param template SVGテンプレート
 * @returns 寸法情報（mm単位）
 */
export function extractDimensions(template: string): {
  width: number | null;
  height: number | null;
  unit: string | null;
} {
  const widthMatch = template.match(/width="(\d+(?:\.\d+)?)(mm|px|cm|in)?"/);
  const heightMatch = template.match(/height="(\d+(?:\.\d+)?)(mm|px|cm|in)?"/);

  return {
    width: widthMatch && widthMatch[1] ? parseFloat(widthMatch[1]) : null,
    height: heightMatch && heightMatch[1] ? parseFloat(heightMatch[1]) : null,
    unit: widthMatch?.[2] ?? heightMatch?.[2] ?? null,
  };
}

/**
 * テンプレートにプレースホルダーが含まれているか確認
 * @param template SVGテンプレート
 * @returns プレースホルダーの存在状況
 */
export function hasPlaceholders(template: string): {
  tileType: boolean;
  icon: boolean;
  serviceName: boolean;
} {
  return {
    tileType: template.includes(PLACEHOLDERS.tileType) || template.includes('id="tile-type-placeholder"'),
    icon: template.includes(PLACEHOLDERS.icon) || template.includes('id="icon-placeholder"'),
    serviceName: template.includes(PLACEHOLDERS.serviceName) || template.includes('id="service-name-placeholder"'),
  };
}
