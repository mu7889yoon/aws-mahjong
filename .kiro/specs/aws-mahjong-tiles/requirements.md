# 要件定義書

## はじめに

AWS麻雀は、従来の麻雀牌をAWSサービスアイコンで表現したカスタム麻雀システムです。本プロジェクトでは、SVG形式の牌画像を生成するシステムを構築します。

## 用語集

- **Tile_Generator**: 牌のSVGデータを生成するシステム
- **Base_Tile**: サービスアイコンと名前を埋め込む前のベース牌テンプレート
- **Tile_Config**: 牌ごとのAWSサービスと画像を指定するJSON設定
- **Service_Icon**: AWSサービスを表す正方形のアイコン画像
- **Tile_Set**: 生成された全牌のSVGファイル群

## 要件

### 要件 1: ベース牌テンプレートの作成

**ユーザーストーリー:** 開発者として、統一されたデザインのベース牌テンプレートを作成したい。これにより、すべての牌が一貫した外観を持つことができる。

#### 受け入れ基準

1. THE Base_Tile SHALL have dimensions of 17mm width and 24mm height
2. THE Base_Tile SHALL include a designated area for the tile type indicator (萬子、筒子、索子、字牌の種類表示)
3. THE Base_Tile SHALL include a designated area for the Service_Icon placement (AWSアイコン表示エリア)
4. THE Base_Tile SHALL include a designated area for the service name text (AWSサービス名表示エリア)
5. THE Base_Tile SHALL be defined as a valid SVG template with placeholder elements for all three display areas
6. WHEN the Base_Tile is rendered, THE Tile_Generator SHALL produce a visually consistent tile appearance with rounded corners and shadow effects

### 要件 2: 牌設定JSONスキーマの定義

**ユーザーストーリー:** 開発者として、各牌にどのAWSサービスを割り当てるかをJSONで指定したい。これにより、牌の設定を簡単に管理・変更できる。

#### 受け入れ基準

1. THE Tile_Config SHALL define a JSON schema for specifying tile-to-service mappings
2. WHEN a Tile_Config entry is provided, THE entry SHALL include the tile type (萬子、筒子、索子、字牌)
3. WHEN a Tile_Config entry is provided, THE entry SHALL include the tile number or name
4. WHEN a Tile_Config entry is provided, THE entry SHALL include the AWS service identifier
5. WHEN a Tile_Config entry is provided, THE entry SHALL include the path to the Service_Icon image
6. IF a Tile_Config entry is missing required fields, THEN THE Tile_Generator SHALL return a validation error with specific field information

### 要件 3: SVG牌生成処理

**ユーザーストーリー:** 開発者として、JSON設定からSVG牌画像を自動生成したい。これにより、大量の牌を効率的に作成できる。

#### 受け入れ基準

1. WHEN the Tile_Generator receives a valid Tile_Config, THE Tile_Generator SHALL generate an SVG file for each tile entry
2. WHEN generating a tile SVG, THE Tile_Generator SHALL embed the specified Service_Icon into the Base_Tile
3. WHEN generating a tile SVG, THE Tile_Generator SHALL embed the service name text into the Base_Tile
4. THE Tile_Generator SHALL output SVG files with consistent naming convention based on tile type and number
5. WHEN the Service_Icon is embedded, THE Tile_Generator SHALL scale the icon to fit the designated area while maintaining aspect ratio
6. FOR ALL generated SVG files, parsing then re-serializing SHALL produce equivalent SVG content (round-trip property)

### 要件 4: 牌セット管理

**ユーザーストーリー:** 開発者として、生成された牌セットを一元管理したい。これにより、牌の追加・更新・削除を効率的に行える。

#### 受け入れ基準

1. THE Tile_Generator SHALL output all generated SVGs to a configurable output directory
2. THE Tile_Generator SHALL generate a manifest file listing all generated tiles with their metadata
3. WHEN a tile is regenerated, THE Tile_Generator SHALL overwrite the existing file
4. THE Tile_Generator SHALL support batch generation of all tiles from a single command
5. WHEN batch generation completes, THE Tile_Generator SHALL report the number of tiles generated and any errors encountered
