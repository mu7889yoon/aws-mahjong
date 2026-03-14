# Requirements Document

## Introduction

riichi-advanced向けのスプライトシートPNG生成機能を、ImageMagickベースのパイプラインから新しいフローに全面的に再設計する。新フローは以下の手順で構成される：

1. sprite-base-tileテンプレートを使用して各牌のSVGを書き出す
2. SVGをPNG化（256×192ピクセル、Upright_PNG）する
3. 縦向き牌（256×192）と横向き牌（192×256、90度回転）を結合した個別牌画像（448×256ピクセル）を出力する
4. 全個別牌画像を所定の行順序で縦方向に結合し、スプライトシートPNG（448×54784ピクセル、214行×256ピクセル/行）を生成する

個別牌画像（448×256px）はそのままスプライト行の1行分に対応する。左側のUpright_PNG（256×192）は上詰めで配置され、下部64ピクセルは透明パディングとなる。右側のSideways_PNG（192×256）は行の高さと一致する。0m/0p/0sの行はスプライトシート上では透明プレースホルダーとなる（個別ファイルとしては赤ドラ画像を出力する）。

## Glossary

- **Riichi_Sprite_Generator**: riichi-advanced向けのスプライトシートPNGおよび個別牌PNG画像を生成するモジュール
- **Sprite_Base_Tile**: assets/sprite-base-tile.svg に定義された192×256 viewBoxのベース牌SVGテンプレート（22px角丸クリッピング、グラデーション背景、ボーダー装飾を含む）
- **Tile_SVG**: Sprite_Base_Tileテンプレートにアイコンと牌種類ラベルを埋め込んだ各牌のSVGデータ
- **Upright_PNG**: Tile_SVGをresvgで256×192ピクセルにレンダリングした縦向き牌のPNG画像（幅256px、高さ192px。元の192×256 SVGを横長にフィットさせた結果）
- **Sideways_PNG**: Upright_PNGを反時計回り90度回転させた横向き牌のPNG画像（192×256ピクセル）
- **Combined_Tile_PNG**: 左側にUpright_PNG（256×192）、右側にSideways_PNG（192×256）を横に並べた448×256ピクセルの個別牌画像。左側のUpright_PNGは上詰めで配置され、下部64ピクセルは透明パディング
- **PNG_Converter**: @resvg/resvg-jsを使用してSVGをPNGバイナリに変換するモジュール
- **Tile_Config**: tile-config.jsonに定義された全牌のエントリ情報
- **MPSZ_Naming**: 麻雀牌の命名規則（例: 1m.png, 5p.png, 7z.png）
- **Output_Directory**: 生成されたPNGファイルの出力先ディレクトリ
- **Sprite_Sheet**: 全牌画像を所定の行順序で縦方向に結合した単一PNGファイル（448×54784px、214行×256px/行）
- **Sprite_Row**: スプライトシートの1行分の領域（448×256ピクセル）。Combined_Tile_PNG（448×256）をそのまま配置
- **Transparent_Row**: 448×256ピクセルの完全透明な行（全ピクセルのアルファ値0）
- **Sprite_Row_Order**: スプライトシートの行配置順序（0m〜9m, 0p〜9p, 0s〜9s, 1z〜7z, 空白×7, 裏面, 残余空白）
- **Back_Face_Tile**: 裏面牌のPNG画像

## Requirements

### Requirement 1: sprite-base-tileテンプレートによるSVG書き出し

**User Story:** As a developer, I want to generate tile SVGs using the sprite-base-tile template, so that each tile has consistent styling with 22px rounded corners and proper background decorations.

#### Acceptance Criteria

1. WHEN a Tile_Config entry is provided, THE Riichi_Sprite_Generator SHALL produce a Tile_SVG by embedding the tile's icon and type label into the Sprite_Base_Tile template.
2. THE Tile_SVG SHALL have a viewBox of "0 0 192 256" consistent with the Sprite_Base_Tile template.
3. THE Tile_SVG SHALL include the 22-pixel corner radius clipping path defined in the Sprite_Base_Tile template.
4. THE Tile_SVG SHALL include the linear gradient background, border decorations, shadow elements, and highlight elements from the Sprite_Base_Tile template.
5. THE Riichi_Sprite_Generator SHALL remove the service-name-placeholder text element from each Tile_SVG before rendering to PNG.
6. THE Riichi_Sprite_Generator SHALL preserve the tile type label and icon content after removing the service name.

### Requirement 2: SVGからPNGへの変換（256×192ピクセル）

**User Story:** As a developer, I want to convert each tile SVG to a 256×192 pixel PNG, so that I have rasterized tile images at the correct dimensions for sprite composition.

#### Acceptance Criteria

1. WHEN a Tile_SVG is provided, THE PNG_Converter SHALL render the Tile_SVG to an Upright_PNG with exact dimensions of 256 pixels wide and 192 pixels tall.
2. THE PNG_Converter SHALL use @resvg/resvg-js for SVG-to-PNG conversion without depending on ImageMagick.
3. FOR ALL valid Tile_Config entries, generating a Tile_SVG and converting it to Upright_PNG SHALL produce a valid PNG buffer with width equal to 256 and height equal to 192.

### Requirement 3: 縦横結合による個別牌画像の出力（448×256ピクセル）

**User Story:** As a developer, I want to combine the upright and sideways tile images into a single 448×256 pixel PNG for each tile, so that riichi-advanced can display tiles in both orientations from one image.

#### Acceptance Criteria

1. WHEN an Upright_PNG is generated, THE Riichi_Sprite_Generator SHALL create a Sideways_PNG by rotating the Upright_PNG 90 degrees counter-clockwise, resulting in a 192×256 pixel image.
2. THE Riichi_Sprite_Generator SHALL compose a Combined_Tile_PNG (448×256) by placing the Upright_PNG (256×192) on the left side (top-aligned, with 64px transparent padding at the bottom) and the Sideways_PNG (192×256) on the right side.
3. THE Riichi_Sprite_Generator SHALL generate one Combined_Tile_PNG per tile entry defined in the Tile_Config.
4. THE Riichi_Sprite_Generator SHALL save each Combined_Tile_PNG using MPSZ_Naming convention (e.g., "1m.png", "5p.png", "7z.png") in the Output_Directory.
5. WHEN the Output_Directory does not exist, THE Riichi_Sprite_Generator SHALL create the directory recursively.
6. WHEN a PNG file already exists at the output path, THE Riichi_Sprite_Generator SHALL overwrite the existing file.
7. THE Riichi_Sprite_Generator SHALL perform all image composition using Node.js libraries (sharp, resvg, or canvas) without depending on ImageMagick.

### Requirement 4: 赤ドラ牌（0m, 0p, 0s）の個別ファイル生成

**User Story:** As a developer, I want to generate red dora tile individual PNG files (0m.png, 0p.png, 0s.png) mapped from their 5-number counterparts, so that the riichi-advanced sprite includes all required tile variants as standalone files.

#### Acceptance Criteria

1. THE Riichi_Sprite_Generator SHALL generate "0m.png" as an individual Combined_Tile_PNG using the same source SVG as "5m".
2. THE Riichi_Sprite_Generator SHALL generate "0p.png" as an individual Combined_Tile_PNG using the same source SVG as "5p".
3. THE Riichi_Sprite_Generator SHALL generate "0s.png" as an individual Combined_Tile_PNG using the same source SVG as "5s".
4. WHEN composing the Sprite_Sheet, THE Riichi_Sprite_Generator SHALL use a fully transparent Sprite_Row (448×256 pixels) for the 0m (row 0), 0p (row 10), and 0s (row 20) positions instead of the red dora tile images.

### Requirement 5: 裏面牌（バック牌）の生成

**User Story:** As a developer, I want to generate a back-face tile PNG, so that the riichi-advanced sprite includes a tile back design.

#### Acceptance Criteria

1. THE Riichi_Sprite_Generator SHALL generate a Back_Face_Tile as a Combined_Tile_PNG with dimensions of 448×256 pixels.
2. THE Back_Face_Tile SHALL use the existing buildBackFaceSvg design for the upright orientation.
3. THE Riichi_Sprite_Generator SHALL apply the same rotation and composition process to the Back_Face_Tile as regular tiles.
4. THE Riichi_Sprite_Generator SHALL save the Back_Face_Tile as "1x.png" in the Output_Directory.

### Requirement 6: スプライトシート縦結合

**User Story:** As a developer, I want all individual tile images concatenated vertically into a single sprite sheet PNG with a specific row order, so that riichi-advanced can load one image and index tiles by row offset.

#### Acceptance Criteria

1. THE Riichi_Sprite_Generator SHALL produce a single Sprite_Sheet PNG file with exact dimensions of 448 pixels wide and 54784 pixels tall (214 rows × 256 pixels per row).
2. THE Sprite_Sheet SHALL arrange rows in the following Sprite_Row_Order: rows 0–9 for 0m through 9m, rows 10–19 for 0p through 9p, rows 20–29 for 0s through 9s, rows 30–36 for 1z through 7z, rows 37–43 as Transparent_Row, row 44 as the Back_Face_Tile (1x), and rows 45–213 as Transparent_Row.
3. WHEN a tile row contains a valid Combined_Tile_PNG, THE Riichi_Sprite_Generator SHALL place the 448×256 image at the corresponding Sprite_Row (vertical offset = row_index × 256 pixels from the top).
4. THE Sprite_Sheet SHALL use a fully transparent Sprite_Row (448×256 pixels) for the 0m (row 0), 0p (row 10), and 0s (row 20) positions.
5. THE Sprite_Sheet SHALL place exactly 7 Transparent_Row entries between the last honor tile (7z at row 36) and the Back_Face_Tile (1x at row 44).
6. THE Sprite_Sheet SHALL fill all rows below the Back_Face_Tile (rows 45 through 213) with Transparent_Row entries.
7. FOR ALL rows in the Sprite_Sheet, each row SHALL occupy exactly 448×256 pixels with no gaps or overlaps between adjacent rows.
8. THE Riichi_Sprite_Generator SHALL save the Sprite_Sheet to the Output_Directory with a configurable filename.
9. THE Riichi_Sprite_Generator SHALL perform sprite sheet assembly using Node.js libraries without depending on ImageMagick.

### Requirement 7: CLIコマンドの提供

**User Story:** As a developer, I want a CLI command to generate all riichi-sprite PNG tiles and the sprite sheet, so that I can run the generation process from the command line.

#### Acceptance Criteria

1. WHEN the CLI command is executed, THE Riichi_Sprite_Generator SHALL process all tiles defined in the Tile_Config and the red dora replacement mapping.
2. THE CLI command SHALL accept an optional output directory argument with a default value.
3. WHEN all tiles are generated successfully, THE CLI command SHALL print a summary including the number of generated tiles and the output directory path.
4. IF a tile generation fails, THEN THE CLI command SHALL log the error for that tile and continue processing remaining tiles.
5. WHEN one or more tiles fail to generate, THE CLI command SHALL exit with a non-zero exit code after processing all tiles.

### Requirement 8: ImageMagick依存の排除

**User Story:** As a developer, I want the entire sprite generation pipeline to work without ImageMagick, so that the build process has fewer external dependencies and can run in more environments.

#### Acceptance Criteria

1. THE Riichi_Sprite_Generator SHALL perform all SVG-to-PNG conversion using @resvg/resvg-js.
2. THE Riichi_Sprite_Generator SHALL perform all image rotation, composition, and concatenation using Node.js libraries (sharp or equivalent).
3. THE Riichi_Sprite_Generator SHALL perform sprite sheet assembly (vertical concatenation of rows) using Node.js libraries.
4. THE Riichi_Sprite_Generator SHALL not invoke ImageMagick (magick, convert, composite) commands at any point in the generation pipeline.

### Requirement 9: SVG生成とPNG変換のラウンドトリップ整合性

**User Story:** As a developer, I want to verify that the SVG-to-PNG conversion produces consistent results, so that the generated tiles are reliable.

#### Acceptance Criteria

1. FOR ALL valid Tile_Config entries, generating a Tile_SVG and converting it to Upright_PNG SHALL produce a PNG buffer with width equal to 256 and height equal to 192.
2. FOR ALL valid Tile_Config entries, the Tile_SVG SHALL contain a valid SVG document with the viewBox "0 0 192 256".
3. FOR ALL Tile_SVGs, applying the service name removal function twice SHALL produce the same result as applying it once (idempotency).
