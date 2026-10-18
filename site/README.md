# サイト

Cloudscape React と Vite で構成したAWS麻雀の閲覧サイトです。Node.js `24.19.0` を使います。

## 開発・確認

```bash
npm ci
npm run dev
```

テストと本番用ビルドは次のコマンドで実行できます。

```bash
npm test
npm run build
npm run preview
```

`build` は型チェック、Viteビルド、GitHub Pages向けの静的ルート生成を続けて実行します。既定のbase pathは `/aws-mahjong/` です。別の配信先で確認する場合は、例えば `VITE_BASE_PATH=/ npm run build` のように変更できます。

## コンテンツの編集

- `src/content/versions/<version>/version.json`、`rules.md`、`tile-groups.json`、`yaku.json` にバージョン別のタイトル・説明・ルール・牌グループ・役データを置きます。
- `public/assets/<version>/output/` に、そのバージョンの牌SVGとPDFを置きます。
- 役データの編集元は `src/content/versions/<version>/yaku.json` です。ビルド時に同じデータを旧ダウンロードURL用の `dist/assets/<version>/yaku.json` に生成します。`public` 側の同名ファイルは編集元にしません。
- `src/content/pages/quick-start.md` は全体向けのQuick Startです。`rules.md` などのMarkdown内で牌の手を表示する場合は、コードフェンスの言語に `hand` を指定します。

```hand
123m456p789s12344z
```

- `src/domain/` には牌・役検索の純粋な関数、`src/features/search/` には役検索画面を置きます。共通UIは `src/components/`、バージョン別ページは `src/pages/` にあります。
- `src/content/site.ts` はサイト全体で使う設定（レンタル申込フォームURLなど）、`src/app/paths.ts` はbase pathに対応したページ・アセットURLを扱います。

## バージョンの追加

既存バージョンのコンテンツと牌画像・PDFをコピーして新しいバージョンを作るには、次のように実行します。

```bash
npm run version:new -- v2.0.2 --from v2.0.1
```

生成された `src/content/versions/v2.0.2/` のメタデータ、ルール、牌グループ、役データを確認して編集してください。牌画像とPDFも `public/assets/v2.0.2/output/` にコピーされるので、必要に応じて差し替えます。`version.json` の `id` はディレクトリ名と一致させます。

`src/content/versions.ts` が各バージョンの `version.json` を自動検出するため、バージョン一覧、ナビゲーション、ダウンロード一覧、バージョン別ページはそこから作られます。役データや画像、PDFの参照先も確認してください。新しい共通ページを追加するときは、`src/App.tsx` のルートに加えて `scripts/generate-static-routes.mjs` にも静的エントリを登録します。

## 静的ルートと公開

`npm run build` の最後に `scripts/generate-static-routes.mjs` が、アプリの入口HTMLを各ページのURLに対応する `index.html` と `404.html` に配置します。GitHub Pagesで深いURLを直接開いた場合にも、React Routerのページを表示するためです。編集するソースは `src/` と `public/` で、ビルド出力は `dist/` です。

`.github/workflows/site.yaml` はPull RequestでCLIとサイトのテスト・ビルドを実行します。`main` へのpushまたはActionsからの `workflow_dispatch` では、サイトのビルド成果物をGitHub Pagesへ公開します。
