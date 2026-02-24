+++
title = "牌一覧"
weight = 2
+++

v2.0.0 の牌一覧です。


## 萬子

### コンピューティングとサーバレス

- [AWS Lambda]
- [Amazon EC2]
- [Amazon ECS]
- [Amazon EC2 Auto Scaling]
- [AWS Batch]
- [Amazon ECR]
- [AWS Step Functions]
- [Amazon Event Bridge]
- [Amazon SQS]

<div id="manzu"></div>

## 筒子

### ネットワークとDevTools

<div id="pinzu"></div>

## 索子

### ストレージとAI/MLとデータベース

<div id="souzu"></div>

## 字牌

### リージョンなど

<div id="jihai"></div>


<script type="module">
  const assetRoot = "{{< asseturl "assets/v2.0.0" >}}";
  const { renderWithOutputTheme } = await import(`${assetRoot}/merjong-wrapper.js`);

  const baseUrl = `${assetRoot}/output/`;
  const rows = [
    { id: "manzu", mpsz: "123456789m" },
    { id: "pinzu", mpsz: "123456789p" },
    { id: "souzu", mpsz: "123456789s" },
    { id: "jihai", mpsz: "1234567z" },
  ];

  rows.forEach(({ id, mpsz }) => {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    target.innerHTML = renderWithOutputTheme(mpsz, baseUrl);
  });
</script>
