+++
title = "役一覧"
weight = 3
+++

v2.0.0 の役サンプル一覧です。

<div id="yaku-list-v200"></div>

<style>
  .yaku-description p {
    margin: 0 0 4px 0;
  }
  .yaku-description p:last-child {
    margin-bottom: 0;
  }
</style>

<script type="module">
  const assetRoot = "{{< asseturl "assets/v2.0.0" >}}";
  const { renderWithOutputTheme } = await import(`${assetRoot}/merjong-wrapper.js`);

  const baseUrl = `${assetRoot}/output/`;
  const dataUrl = `${assetRoot}/yaku.json`;
  const list = document.getElementById("yaku-list-v200");

  function renderInto(id, mpsz) {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    target.innerHTML = renderWithOutputTheme(mpsz, baseUrl);
  }

  function boolLabel(value) {
    if (value == true) {
      return "あり";
    }
    if (value == false) {
      return "なし";
    }
    if (value === null || value === undefined || value === "") {
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

  function sampleMpszList(yaku) {
    if (Array.isArray(yaku.sampleMpszList) && yaku.sampleMpszList.length > 0) {
      return yaku.sampleMpszList;
    }
    if (yaku.compositionExampleMpsz) {
      return [yaku.compositionExampleMpsz];
    }
    return [];
  }

  function buildYakuRow(yaku) {
    const samples = sampleMpszList(yaku);
    const name = valueLabel(yaku.name) === "未設定" ? yaku.id : yaku.name;
    let descriptionBlock = "";
    if (Array.isArray(yaku.description) && yaku.description.length > 0) {
      descriptionBlock = yaku.description
        .map((line) => `<p>${valueLabel(line)}</p>`)
        .join("");
    } else {
      const description = valueLabel(yaku.description);
      descriptionBlock = description === "未設定" ? "" : `<p>${description}</p>`;
    }
    const ponAllowed = yaku.isPonAllowed;
    const chiAllowed = yaku.isChiAllowed;
    const canCombine = yaku.isCombineAllowed;
    const hanOpenBlock =
      ponAllowed !== true && chiAllowed !== true
        ? ""
        : `<span>鳴いた時の飜数: ${valueLabel(yaku.hanOpen)}</span>`;
    return `
      <section>
        <h3>${name}</h3>
        <b class="yaku-description">${descriptionBlock}</b>
        <div>
          <span>ポン: ${boolLabel(ponAllowed)}</span>
          <span>チー: ${boolLabel(chiAllowed)}</span>
          <br>
          <span>飜数: ${valueLabel(yaku.han)}</span>
          ${hanOpenBlock}
          <br>
          <span>複合の有無: ${boolLabel(canCombine)}</span>
        </div>
        <div>
          ${samples.map((_, index) => `<div id="${yaku.id}-${index + 1}"></div>`).join("")}
        </div>
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

      const groups = new Map();
      yakus.forEach((yaku) => {
        const hanKey = valueLabel(yaku.han);
        if (!groups.has(hanKey)) {
          groups.set(hanKey, []);
        }
        groups.get(hanKey).push(yaku);
      });

      list.innerHTML = Array.from(groups.entries())
        .map(([hanKey, items]) => {
          const hanHeading = hanKey === "未設定" ? "飜数未設定" : `${hanKey}飜`;
          return `
            <section>
              <h2>${hanHeading}</h2>
              ${items.map((yaku) => buildYakuRow(yaku)).join("")}
            </section>
          `;
        })
        .join("");
      yakus.forEach((yaku) => {
        const samples = sampleMpszList(yaku);
        if (samples.length === 0) {
          return;
        }
        samples.forEach((sample, index) => {
          renderInto(`${yaku.id}-${index + 1}`, sample);
        });
      });
    } catch (error) {
      console.error(error);
      list.innerHTML = "<p>役データの読み込みに失敗しました。</p>";
    }
  }

  init();
</script>
