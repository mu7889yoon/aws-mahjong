+++
title = "役一覧"
weight = 3
+++

v2.0.0 の役サンプル一覧です。

<div id="yaku-list-v200"></div>

<script type="module">
  import { renderWithOutputTheme } from "/assets/v2.0.0/merjong-wrapper.js";

  const baseUrl = "/assets/v2.0.0/output/";
  const dataUrl = "/assets/v2.0.0/yaku.json";
  const list = document.getElementById("yaku-list-v200");

  function renderInto(id, mpsz) {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    target.innerHTML = renderWithOutputTheme(mpsz, baseUrl);
  }

  function boolLabel(value) {
    if (value === true) {
      return "あり";
    }
    if (value === false) {
      return "なし";
    }
    return "未設定";
  }

  function valueLabel(value) {
    if (value === null || value === undefined || value === "") {
      return "未設定";
    }
    return String(value);
  }

  function primarySample(yaku) {
    if (Array.isArray(yaku.samples) && yaku.samples.length > 0) {
      return yaku.samples[0];
    }
    return yaku.compositionExampleMpsz || "";
  }

  function buildYakuRow(yaku) {
    const sample = primarySample(yaku);
    const name = valueLabel(yaku.name) === "未設定" ? yaku.id : yaku.name;
    return `
      <section>
        <h3>${name} <code>(${yaku.id})</code></h3>
        <p>構成牌の例: <code>${valueLabel(yaku.compositionExampleMpsz)}</code></p>
        <div>
          <span>サンプル: <code>${valueLabel(sample)}</code></span>
          <span>ポンあり: ${boolLabel(yaku.ponAllowed)}</span>
          <span>チーあり: ${boolLabel(yaku.chiAllowed)}</span>
          <span>飜数: ${valueLabel(yaku.han)}</span>
          <span>泣いた時の飜数: ${valueLabel(yaku.hanOpen)}</span>
          <span>複合の有無: ${boolLabel(yaku.canCombine)}</span>
        </div>
        <div id="${yaku.id}"></div>
      </section>
    `;
  }

  async function init() {
    if (!list) {
      return;
    }
    list.innerHTML = "<p>役データを読み込み中です...</p>";

    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`役データの取得に失敗: ${response.status} ${response.statusText}`);
      }
      const payload = await response.json();
      const yakus = Array.isArray(payload.yakus) ? payload.yakus : [];

      list.innerHTML = yakus.map((yaku) => buildYakuRow(yaku)).join("");
      yakus.forEach((yaku) => {
        const sample = primarySample(yaku);
        if (!sample) {
          return;
        }
        renderInto(yaku.id, sample);
      });
    } catch (error) {
      console.error(error);
      list.innerHTML = "<p>役データの読み込みに失敗しました。</p>";
    }
  }

  init();
</script>
