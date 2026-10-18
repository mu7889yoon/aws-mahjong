# aws-mahjong

AWSアイコンを使った麻雀牌の生成ツールと、牌・ルールを閲覧するサイトです。牌画像生成CLIとサイトは独立しており、それぞれルートと `site/` にあります。

## 牌画像生成CLI

```bash
npm ci
npm run generate
```

出力形式や縮尺は指定できます。

```bash
npm run generate -- --format png
npm run generate -- --format svg,png --scale 4
```

生成したPNGを印刷用PDFに並べるには、次を実行します。

```bash
npm run pdf:layout
npm run pdf:layout -- --input ./output --output ./output/tile-layout.pdf
```

`npm test` はCLIのテスト、`npm run build` はTypeScriptのビルドを実行します。牌画像の元になるAWS Architecture Iconsは[公式配布アーカイブ](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/architecture/approved/architecture-icons/Icon-package_01302026.31b40d126ed27079b708594940ad577a86150582.zip)です。

## サイト

サイトの開発・ビルド手順とコンテンツ構成は [site/README.md](site/README.md) を参照してください。ローカルで起動するには次を実行します。

```bash
cd site
npm ci
npm run dev
```

Pull RequestではCLIとサイトのテスト・ビルドを実行します。`main` へのpush、またはActionsの `workflow_dispatch` でGitHub Pagesへ公開します。サイトの既定のbase pathは `/aws-mahjong/` です。

サイト側の依存関係をインストール済みなら、ルートから `npm run docs:build` でもサイトをビルドできます。出力先は `site/dist/` です。
