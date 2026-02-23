# aws-mahjong

https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/architecture/approved/architecture-icons/Icon-package_01302026.31b40d126ed27079b708594940ad577a86150582.zip

AWSアイコン麻雀牌の生成ツールです。  
このリポジトリには次の機能を統合しています。

- `aws-mahjong`: AWSアイコン入り牌SVG生成
- `mahjong-tile-generator`: SVG/PNG生成とPNGレイアウトPDF出力
- `merjong` (CDN): ブラウザレンダリングは `jsdelivr` 経由で利用

## セットアップ

```bash
npm install
```

## 牌画像を生成する

```bash
npm run generate
```

出力形式を指定する場合:

```bash
npm run generate -- --format png
npm run generate -- --format svg,png --scale 4
```

## PNGを印刷用PDFに並べる

```bash
npm run pdf:layout
```

入力/出力を指定する場合:

```bash
npm run pdf:layout -- --input ./output --output ./output/tile-layout.pdf
```

## MPSZレンダラーを使う

すぐに試す場合:

1. `npm run generate`（`output/*.svg` を作成）
2. `npx serve .`
3. `http://localhost:3000/sample-custom-tiles.html` を開く
4. `theme.json` の `baseUrl` が `./output/` であることを確認

`sample-custom-tiles.html` は `web/merjong-wrapper.js` 経由で描画します。
`web/merjong-wrapper.js` は `https://cdn.jsdelivr.net/npm/merjong/+esm` をベースに呼び出し、カスタム牌テーマを適用します。

## Docs (GitHub Pages)

```bash
npm run docs:build
```

生成物:

- `docs/index.html`
- `docs/web/merjong-wrapper.js`
- `docs/output/*.svg`
- `docs/theme.json`

GitHub Pages は `docs/` を配信対象に設定してください。

## 主なディレクトリ

- `src`: SVG/PNG/PDF生成のCLI実装
- `tests`: ユニットテスト
- `web/merjong-wrapper.js`: カスタム牌テーマ用ラッパー
- `scripts/build-docs.mjs`: docsビルドスクリプト
- `assets`: AWSアイコン
- `output`: 生成結果
