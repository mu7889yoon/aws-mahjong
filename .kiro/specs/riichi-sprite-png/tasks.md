# Implementation Plan: riichi-sprite-png

## Overview

`src/riichiAdvancedSprite.ts` を新規作成し、ImageMagickを完全に排除した新しいスプライト生成パイプラインを実装する。`@resvg/resvg-js`（SVG→PNG変換）と `sharp`（画像回転・合成・縦結合）のみで全処理を行う。既存の `generator.ts` / `template.ts` から必要な関数を移植・統合する。テストも `sharp` ベースに書き換える。

## Tasks

- [x] 1. プロジェクト依存関係の追加と定数・型定義
  - [x] 1.1 `package.json` に `sharp` を dependencies に追加する
    - `npm install sharp` を実行
    - `@types/sharp` が必要な場合は devDependencies に追加
    - _Requirements: 8.2_

  - [x] 1.2 `src/riichiAdvancedSprite.ts` を新規作成し、定数とインターフェースを定義する
    - `SPRITE_WIDTH`, `SPRITE_ROW_HEIGHT`, `SPRITE_ROWS`, `SPRITE_HEIGHT` 定数
    - `UPRIGHT_TILE_WIDTH`, `UPRIGHT_TILE_HEIGHT`, `SIDEWAYS_TILE_WIDTH`, `SIDEWAYS_TILE_HEIGHT` 定数
    - パス定数: `TILE_SVG_DIR`, `TILE_MANIFEST_PATH`, `RIICHI_ADVANCED_TILE_SPRITE_PATH`, `STOCK_TILE_SPRITE_PATH`
    - `SpriteReplacement` インターフェース（`kind: 'tile' | 'back' | 'transparent'`）
    - `BuildRiichiAdvancedAwsSpriteOptions` インターフェース
    - `RIICHI_ADVANCED_AWS_REPLACEMENTS` 配列（38エントリ: 0m/0p/0s は `kind: 'transparent'`、行44は `kind: 'back'`）
    - `RED_DORA_MAPPING` 配列
    - _Requirements: 1.1, 3.2, 4.4, 6.1, 6.2_

  - [ ]* 1.3 Property 11 のテストを書く: 行数の不変条件
    - **Property 11: 行数の不変条件**
    - `RIICHI_ADVANCED_AWS_REPLACEMENTS` の総エントリ数が38、非透明エントリが35、透明エントリが3（0m, 0p, 0s）であることを検証
    - **Validates: Requirements 6.2**

- [x] 2. SVG生成関数の移植と実装
  - [x] 2.1 既存ロジックを `src/riichiAdvancedSprite.ts` に移植する
    - `generator.ts` から `generateSpriteTile()` を移植（`SPRITE_BASE_TILE_TEMPLATE` と `replaceSpriteAllPlaceholders` を含む）
    - `addTileFaceBackground()` を移植
    - `buildBackFaceSvg()` を移植
    - `readTileSvg()` と `readManifestEntries()` を移植
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.2_

  - [ ]* 2.2 Property 7 のテストを書く: Tile_SVGテンプレート要素の保持
    - **Property 7: Tile_SVGテンプレート要素の保持**
    - `generateSpriteTile` で生成されたTile_SVGが viewBox "0 0 192 256"、22px角丸クリッピングパス、グラデーション背景、ボーダー装飾、シャドウ・ハイライト要素を含むことを検証
    - sharpベースの検証（ImageMagick不使用）
    - **Validates: Requirements 1.2, 1.3, 1.4, 9.2**

- [x] 3. Checkpoint - SVG生成関数の確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. SVG→PNG変換とCombined_Tile_PNG合成の実装
  - [x] 4.1 `renderSvgToPngBuffer()` を実装する
    - `@resvg/resvg-js` を使用してSVG文字列を256×192ピクセルのPNGバッファに変換
    - `fitTo: { mode: 'width', value: 256 }` を指定し、192×256 viewBoxのSVGを256×192にレンダリング
    - _Requirements: 2.1, 2.2, 2.3, 8.1_

  - [ ]* 4.2 Property 9 のテストを書く: Upright_PNG寸法の不変条件
    - **Property 9: Upright_PNG寸法の不変条件**
    - 全有効牌エントリのUpright_PNGが幅256px、高さ192pxであることを `sharp(buffer).metadata()` で検証
    - ImageMagick不使用
    - **Validates: Requirements 2.1, 2.3, 9.1**

  - [x] 4.3 `buildCombinedTilePng()` を実装する
    - sharpでUpright_PNG（256×192）を読み込み
    - `sharp.rotate(-90)` で反時計回り90°回転 → Sideways_PNG（192×256）
    - 448×256の透明キャンバスを作成
    - Upright_PNGを左上 (0, 0) に合成（下部64pxは透明パディング）
    - Sideways_PNGを右側 (256, 0) に合成
    - PNGバッファとして返す
    - _Requirements: 3.1, 3.2, 8.2_

  - [ ]* 4.4 Property 10 のテストを書く: Combined_Tile_PNGの合成レイアウト
    - **Property 10: Combined_Tile_PNGの合成レイアウト**
    - Combined_Tile_PNG（448×256）の左下領域（x: 0-255, y: 192-255）が完全透明であることを `sharp(buffer).extract().raw()` で検証
    - ImageMagick不使用
    - **Validates: Requirements 3.1, 3.2**

- [x] 5. Checkpoint - PNG変換と合成の確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. buildReplacementRow と個別牌PNG出力の実装
  - [x] 6.1 `buildReplacementRow()` を実装する
    - `kind: 'tile'`: SVG読み込み → `addTileFaceBackground` → `generateSpriteTile` → `renderSvgToPngBuffer` → `buildCombinedTilePng`
    - `kind: 'back'`: `buildBackFaceSvg` → `renderSvgToPngBuffer` → `buildCombinedTilePng`
    - `kind: 'transparent'`: sharpで448×256の透明PNGバッファを生成
    - _Requirements: 1.1, 3.1, 4.4, 5.2, 5.3_

  - [x] 6.2 `buildRiichiAdvancedAwsSprite()` メインエントリポイントを実装する
    - マニフェスト読み込み
    - `RIICHI_ADVANCED_AWS_REPLACEMENTS` の各エントリに対して `buildReplacementRow` を実行
    - `individualOutputDir` 指定時: 出力ディレクトリを再帰的に作成し、各行PNGを `{spriteTileId}.png` として保存
    - `individualOutputDir` 指定時: `RED_DORA_MAPPING` に基づいて赤ドラ個別ファイル（0m.png, 0p.png, 0s.png）を5番牌のソースSVGから生成
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3_

  - [ ]* 6.3 Property 3 のテストを書く: 個別PNG寸法の不変条件
    - **Property 3: 個別PNG寸法の不変条件**
    - 生成された全個別牌PNGの寸法が448×256であることを `sharp(buffer).metadata()` で検証
    - ImageMagick不使用
    - **Validates: Requirements 3.2, 5.1**

  - [ ]* 6.4 Property 4 のテストを書く: 赤ドラ個別ファイルの存在と寸法
    - **Property 4: 赤ドラ個別ファイルの存在と寸法**
    - `individualOutputDir` に 0m.png, 0p.png, 0s.png が存在し、ファイルサイズ > 0、寸法が448×256であることを `sharp` で検証
    - ImageMagick不使用
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 7. Checkpoint - 個別牌PNG出力の確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. スプライトシート縦結合の実装
  - [x] 8.1 `composeSpriteSheet()` を実装する
    - 214行分の448×256バッファを用意（未指定行は透明）
    - `sharp` の `composite` で各行を `top: rowIndex * 256` に配置
    - 448×54784のPNGバッファを返す
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.3_

  - [x] 8.2 `buildRiichiAdvancedAwsSprite()` にスプライトシート生成・保存ロジックを統合する
    - `composeSpriteSheet` を呼び出してスプライトシートを生成
    - `outputPath` に保存（デフォルト: `RIICHI_ADVANCED_TILE_SPRITE_PATH`）
    - _Requirements: 6.8, 6.9_

  - [ ]* 8.3 Property 1 のテストを書く: スプライトシート寸法の不変条件
    - **Property 1: スプライトシート寸法の不変条件**
    - 出力スプライトシートPNGの寸法が448×54784であることを `sharp(buffer).metadata()` で検証
    - ImageMagick不使用
    - **Validates: Requirements 6.1, 6.7**

  - [ ]* 8.4 Property 2 のテストを書く: 赤ドラ位置の透明行
    - **Property 2: 赤ドラ位置の透明行**
    - スプライトシートの行0（0m）、行10（0p）、行20（0s）が完全透明であることを `sharp(buffer).extract().raw()` でアルファ値検証
    - ImageMagick不使用
    - **Validates: Requirements 4.4, 6.4**

  - [ ]* 8.5 Property 5 のテストを書く: 裏面牌行の配置とギャップ行の透明性
    - **Property 5: 裏面牌行の配置とギャップ行の透明性**
    - 行44が非透明（裏面牌）、行37-43が完全透明であることを `sharp` で検証
    - ImageMagick不使用
    - **Validates: Requirements 6.2, 6.5**

  - [ ]* 8.6 Property 6 のテストを書く: 末尾透明行
    - **Property 6: 末尾透明行**
    - 行45-213が完全透明であることを `sharp(buffer).extract().raw()` でサンプリング検証
    - ImageMagick不使用
    - **Validates: Requirements 6.6**

  - [ ]* 8.7 Property 12 のテストを書く: 牌行の非透明性
    - **Property 12: 牌行の非透明性**
    - `kind === 'tile'` または `kind === 'back'` エントリの対応するスプライトシート行が非透明（アルファチャネル平均 > 0）であることを `sharp` で検証
    - ImageMagick不使用
    - **Validates: Requirements 6.2, 6.3**

- [x] 9. Checkpoint - スプライトシート生成の確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. CLIエントリポイントの実装
  - [x] 10.1 `src/riichiAdvancedSpriteCli.ts` を新規作成する
    - `process.argv` から `--output`（出力パス）と `--individual-dir`（個別PNG出力ディレクトリ）を取得
    - `buildRiichiAdvancedAwsSprite` を呼び出し
    - 成功時: 生成タイル数と出力ディレクトリパスのサマリーを表示
    - エラー発生時: エラーログを出力し処理を継続、最終的に非ゼロ終了コードで終了
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 10.2 `package.json` の `riichi-advanced:tiles` スクリプトを更新する
    - 新しい `src/riichiAdvancedSpriteCli.ts` を使用するようにスクリプトを変更
    - ImageMagickコマンドへの参照を削除
    - _Requirements: 8.4_

- [x] 11. テストのImageMagick依存排除と最終統合
  - [x] 11.1 `tests/riichiAdvancedSprite.test.ts` のImageMagick依存ヘルパーをsharpベースに書き換える
    - `cropRow`: `sharp(buffer).extract()` に置換
    - `identifySize`: `sharp(buffer).metadata()` に置換
    - `alphaChannelMean`: `sharp(buffer).raw().toBuffer()` でRGBAピクセルデータのアルファ値を計算に置換
    - `pixelDifference`: sharp ベースのピクセル比較に置換（または不要なら削除）
    - `execFileAsync('magick', ...)` の全呼び出しを削除
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 11.2 既存テストケースのインポートと参照を新モジュールに合わせて更新する
    - `../src/riichiAdvancedSprite` からのインポートを新しいエクスポートに合わせる
    - 既存の `describe('buildRiichiAdvancedAwsSprite')` 内のテストを新パイプラインに対応させる
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 12. Final checkpoint - 全テスト通過の確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 付きタスクはオプションであり、MVP実現のためにスキップ可能
- テストは全て `sharp` ベースで実装し、ImageMagickへの依存を完全に排除する
- 既存の `generator.ts` / `template.ts` の関数は `src/riichiAdvancedSprite.ts` に移植・統合する
- 各プロパティテストは design.md の Correctness Properties に対応する
- `sprite-base-tile` テンプレートはサービス名を含まないため、`stripServiceNameFromTileSvg` は不要
