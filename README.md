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

Pull RequestではCLIとサイトのテスト・ビルドを実行します。`main` へのpush、または `main` を選んだActionsの `workflow_dispatch` でGitHub Pagesへ公開します。サイトの既定のbase pathは `/aws-mahjong/` です。

## 画像から牌候補を検索

役検索ではJPG/PNG画像から牌種の候補を判定できます。候補ごとの枠・一致度・トークン数を表示し、枚数は人が確認してから役検索へ反映します。同じ牌種の枠は1つなので、同種牌が複数ある場合は枚数を入力してください。

画像判定APIはTerraformでAWSに作成し、GitHub ActionsからOIDCで更新します。TypeSafe APIキーはSecrets Managerにだけ保存し、Terraform変数・state・GitHub Actions・公開サイトには登録しません。画像は判定のためAPIからTypeSafeへ送られ、アプリ側には保存しません。

公開APIには次の制限を設けています。

- API Gateway CORSは `https://mu7889yoon.github.io` だけを許可します。
- API Gateway全体のスロットリングは毎秒3リクエスト、バースト2リクエストです。
- 画像サイズは4MBまでです。

CORSはブラウザーからの呼び出しを制限する仕組みで、APIの認証ではありません。リクエスト頻度の制限にはAPI Gatewayのスロットリングだけを使います。AWSのスロットリングはベストエフォートの目標値で、厳密な利用数・費用上限にはなりません。1回の画像判定でTypeSafeへ17回リクエストします。

### 初回セットアップ

Terraform state用のS3バケット名を一意に決め、AWSの管理権限を持つ端末でbootstrapを一度実行します。例のバケット名はアカウントIDとランダムな文字列を含めてください。bootstrap自体のstateはローカルに保存されるため、このstateファイルは削除せず、Gitへ追加しないでください。アプリ本体のstateは作成したS3バケットに保存します。

```bash
cd terraform/bootstrap
terraform init -backend=false
terraform apply -var="state_bucket_name=aws-mahjong-tfstate-<account-id>-<unique-suffix>"
```

Terraform outputから `github_actions_role_arn` と `state_bucket_name` を取得し、GitHubリポジトリの **Settings → Secrets and variables → Actions → Variables** に次のRepository variableを登録します。

| Variable | 値 |
| --- | --- |
| `AWS_REGION` | `ap-northeast-1` |
| `AWS_ROLE_ARN` | Terraform outputの `github_actions_role_arn` |
| `TF_STATE_BUCKET` | Terraform outputの `state_bucket_name` |

GitHub Actionsの `github-pages` environmentを使います。`main` へのpushでTerraform applyとサイト公開が走ります。AWSの長期アクセスキーはGitHubへ登録しません。

最初のActions実行でAWSリソースが作られた後、AWS Secrets Managerで `aws-mahjong/typesafe-api-key` を開き、TypeSafe APIキーをシークレット値として登録してください。値はJSONではなくAPIキー文字列そのものです。TerraformはSecretの器だけを作成します。キーを登録すると画像判定を利用できます。

### 画像APIの開発ビルド

```bash
cd backend
npm ci
npm run sync:references
npm run build
```

バックエンドの配布パッケージはLinux上のGitHub Actionsで作成します。AWSリソースのデプロイはPull Requestでは行いません。

サイト側の依存関係をインストール済みなら、ルートから `npm run docs:build` でもサイトをビルドできます。出力先は `site/dist/` です。
