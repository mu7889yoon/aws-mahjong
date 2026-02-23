+++
title = "牌一覧"
weight = 2
+++

v2.0.0 の牌一覧です。


## 萬子

<div id="manzu"></div>

## 筒子
<div id="pinzu"></div>

## そうず
<div id="souzu"></div>

## 字牌
<div id="jihai"></div>


<script type="module">
  import { renderWithOutputTheme } from "/assets/v2.0.0/merjong-wrapper.js";

  const baseUrl = "/assets/v2.0.0/output/";
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
