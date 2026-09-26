# AWS 麻雀牌 YOLO データセット

画像はローカルに置き、牌ごとの Labelme JSON とクラス定義、YOLO 形式のラベルを Git で管理します。`images/` 以下の画像ファイルは Git ignore 対象ですが、同じフォルダにできる `.json` は追跡対象です。

## クラス順

`classes.txt` の1行目から順に YOLO の class ID `0`〜`33` に対応します。萬子・筒子・索子を各1〜9、字牌を東南西北白發中の順に固定しています。既存の注釈がある間は順序を変更しないでください。

## 画像を注釈する

画像を `images/train/`、`images/val/`、`images/test/` のいずれかに置き、画像フォルダを Labelme で開きます。

```sh
labelme dataset/aws-mahjong/images/train \
  --labels dataset/aws-mahjong/classes.txt
```

各牌に `rectangle` を1つ描き、ラベルは `classes.txt` の MPSZ 表記（例: `4m`、`7z`）から選びます。色付きの絵柄だけでなく、牌の白い縁を含む見えている牌面全体を囲みます。牌の順番は関係ありません。画像を JSON に埋め込む `--with-image-data` は使わないでください。

保存後は、`.json` を画像と一緒にこのフォルダに残します。JSON は画像ファイル名と矩形・クラス名を保持しますが、画像データそのものは含めません。注釈 JSON は GitHub に追加し、写真は追加しない運用です。

## YOLO ラベルを書き出す

```sh
python3 scripts/labelme_to_yolo.py
```

各画像の JSON から `labels/{train,val,test}/<画像名>.txt` を生成します。YOLO 座標は正規化された `class_id center_x center_y width height` 形式です。`data.yaml` がクラス定義と画像分割を指定します。

## 分割とレビュー

- 同じ撮影セッションの連写や加工画像を train と val/test に分けないでください。元写真単位で分けます。
- test は学習やモデル選択に使わず、最後の評価用に残します。
- commit 前に JSON の `imageData` が `null` であること、各矩形が牌の外周を囲んでいること、クラス表記が `classes.txt` と一致することを確認します。
- JSON と YOLO txt は追跡します。画像は GitHub に上げず、別の保管場所で共有・バックアップしてください。
