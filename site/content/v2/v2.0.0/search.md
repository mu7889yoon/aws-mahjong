+++
title = "役検索"
weight = 4
+++

手元の牌を選ぶと、条件に合う役サンプルを表示します。

<div class="search-panel">
  <div class="search-panel__tiles">
    <h2>牌を選ぶ</h2>
    <div id="tile-picker" class="tile-picker"></div>
  </div>
  <div class="search-panel__selected">
    <div class="selected-header">
      <h2>選択中の牌</h2>
      <button id="clear-tiles" class="clear-button" type="button">すべてクリア</button>
    </div>
    <div id="selected-hand" class="selected-hand"></div>
    <div id="selected-summary" class="selected-summary"></div>
    <div id="selected-list" class="selected-list"></div>
  </div>
</div>

<section>
  <h2>おすすめの役</h2>
  <div id="recommendations" class="recommendations"></div>
</section>

<style>
  .search-panel {
    display: grid;
    gap: 24px;
    grid-template-columns: 1fr;
    align-items: start;
  }
  .search-panel__tiles,
  .search-panel__selected {
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    background: #fafafa;
  }
  .tile-picker {
    display: grid;
    gap: 12px;
  }
  .tile-group {
    display: grid;
    gap: 6px;
  }
  .tile-group__title {
    margin: 0;
    font-size: 13px;
    color: #555;
    font-weight: 600;
  }
  .tile-group__row {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .tile-button {
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    padding: 2px;
    background: #fff;
    cursor: pointer;
    min-width: 44px;
    min-height: 54px;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    transition: opacity 0.2s ease, filter 0.2s ease;
  }
  .tile-button__img {
    display: block;
    width: 36px;
    height: 48px;
  }
  .tile-button[data-count="0"] {
    opacity: 0.5;
    filter: grayscale(0.35);
  }
  .tile-button[data-count]:not([data-count="0"]) {
    border-color: #0b7a75;
    box-shadow: 0 0 0 2px rgba(11, 122, 117, 0.2);
    opacity: 1;
    filter: none;
  }
  .tile-count {
    display: block;
    font-size: 12px;
    color: #0b7a75;
    margin-top: 2px;
    text-align: center;
  }
  .selected-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .clear-button {
    border: 1px solid #d0d0d0;
    background: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
  }
  .selected-hand {
    margin: 12px 0;
    min-height: 64px;
  }
  .selected-summary {
    margin-bottom: 12px;
    color: #666;
    font-size: 14px;
  }
  .selected-list {
    display: grid;
    gap: 8px;
  }
  .selected-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    padding: 8px 10px;
    background: #fff;
  }
  .selected-item__info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .selected-item__controls {
    display: flex;
    gap: 6px;
  }
  .count-button {
    border: 1px solid #d0d0d0;
    background: #fff;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  .recommendations {
    display: grid;
    gap: 16px;
  }
  .recommendation {
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 14px 16px;
    background: #fff;
  }
  .recommendation h3 {
    margin: 0 0 4px 0;
  }
  .recommendation p {
    margin: 0 0 6px 0;
  }
  .recommendation p:last-child {
    margin-bottom: 0;
  }
  .tile-surface > div {
    background-color: transparent !important;
    padding: 0 !important;
  }
  .tile-surface {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tile-surface :is(svg, img, canvas) {
    display: block;
    max-width: 100%;
    height: auto;
  }
  .selected-hand .tile-surface,
  .recommendation .tile-surface {
    justify-content: flex-start;
    overflow-x: auto;
  }
  .selected-item .tile-surface :is(svg, img, canvas) {
    width: 36px;
    max-width: none;
  }
</style>

<script type="module">
  const assetRoot = "{{< asseturl \"assets/v2.0.0\" >}}";
  const merjongWrapper = await import(`${assetRoot}/merjong-wrapper.js`);

  const baseUrl = `${assetRoot}/output/`;
  const dataUrl = `${assetRoot}/yaku.json`;

  const tilePicker = document.getElementById("tile-picker");
  const selectedHand = document.getElementById("selected-hand");
  const selectedSummary = document.getElementById("selected-summary");
  const selectedList = document.getElementById("selected-list");
  const recommendations = document.getElementById("recommendations");
  const clearButton = document.getElementById("clear-tiles");

  const tileGroups = [
    { label: "萬子", tiles: [1,2,3,4,5,6,7,8,9].map((n) => `${n}m`) },
    { label: "筒子", tiles: [1,2,3,4,5,6,7,8,9].map((n) => `${n}p`) },
    { label: "索子", tiles: [1,2,3,4,5,6,7,8,9].map((n) => `${n}s`) },
    { label: "字牌", tiles: [1,2,3,4,5,6,7].map((n) => `${n}z`) },
  ];
  const tileDefs = tileGroups.flatMap((group) => group.tiles);

  const maxCopies = 4;
  const counts = Object.fromEntries(tileDefs.map((tile) => [tile, 0]));
  let yakuData = [];

  function parseMpszToCounts(mpsz) {
    const result = {};
    let buffer = [];
    for (let i = 0; i < mpsz.length; i++) {
      const char = mpsz[i];
      if (char >= "0" && char <= "9") {
        buffer.push(char);
        continue;
      }
      if ("mpsz".includes(char)) {
        buffer.forEach((num) => {
          const key = `${num}${char}`;
          result[key] = (result[key] || 0) + 1;
        });
        buffer = [];
      }
    }
    return result;
  }

  function toMpsz(countMap) {
    const suits = ["m", "p", "s", "z"];
    let mpsz = "";
    suits.forEach((suit) => {
      let digits = "";
      tileDefs.forEach((tile) => {
        if (!tile.endsWith(suit)) {
          return;
        }
        const count = countMap[tile] || 0;
        if (count > 0) {
          digits += tile[0].repeat(count);
        }
      });
      if (digits) {
        mpsz += `${digits}${suit}`;
      }
    });
    return mpsz;
  }

  function totalCount(countMap) {
    return Object.values(countMap).reduce((sum, value) => sum + value, 0);
  }

  function tileLabel(tile) {
    return tile.replace("m", "萬").replace("p", "筒").replace("s", "索").replace("z", "字");
  }

  function renderTileSurface(mpsz) {
    if (typeof merjongWrapper.renderWithOutputTheme === "function") {
      return merjongWrapper.renderWithOutputTheme(mpsz, baseUrl);
    }
    if (typeof merjongWrapper.renderWithMerjong === "function") {
      return merjongWrapper.renderWithMerjong(mpsz, baseUrl);
    }
    if (typeof merjongWrapper.renderDefault === "function") {
      return merjongWrapper.renderDefault(mpsz);
    }
    return "";
  }

  function updateTileButton(tile) {
    const button = document.querySelector(`[data-tile="${tile}"]`);
    if (!button) {
      return;
    }
    const count = counts[tile] || 0;
    button.dataset.count = String(count);
    const counter = button.querySelector(".tile-count");
    if (counter) {
      counter.textContent = count > 0 ? `x${count}` : "";
    }
  }

  function renderSelectedList() {
    if (!selectedList) {
      return;
    }
    const tiles = tileDefs.filter((tile) => counts[tile] > 0);
    if (tiles.length === 0) {
      selectedList.innerHTML = "<p>まだ牌が選ばれていません。</p>";
      return;
    }
    selectedList.innerHTML = tiles
      .map((tile) => {
        return `
          <div class="selected-item">
            <div class="selected-item__info">
              <div class="tile-surface">${renderTileSurface(tile)}</div>
              <div>${tileLabel(tile)} x${counts[tile]}</div>
            </div>
            <div class="selected-item__controls">
              <button class="count-button" type="button" data-action="minus" data-tile="${tile}">-</button>
              <button class="count-button" type="button" data-action="plus" data-tile="${tile}">+</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderSelectedHand() {
    if (!selectedHand || !selectedSummary) {
      return;
    }
    const mpsz = toMpsz(counts);
    const total = totalCount(counts);
    selectedSummary.textContent = total > 0 ? `合計 ${total} 枚` : "";
    selectedHand.innerHTML = total > 0 ? `<div class="tile-surface">${renderTileSurface(mpsz)}</div>` : "";
  }

  function matchesSample(sampleCounts) {
    return Object.entries(sampleCounts).every(([tile, need]) => {
      return (counts[tile] || 0) >= need;
    });
  }

  function buildRecommendation(yaku) {
    const samples = Array.isArray(yaku.sampleMpszList) ? yaku.sampleMpszList : [];
    const matchedSample = samples.find((sample) => matchesSample(parseMpszToCounts(sample)));
    if (!matchedSample) {
      return null;
    }

    const name = yaku.name || yaku.id;
    const hanLabel = yaku.han ? `${yaku.han}飜` : "飜数未設定";
    const description = Array.isArray(yaku.description)
      ? yaku.description.join(" ")
      : yaku.description || "";

    return `
      <div class="recommendation">
        <h3>${name}</h3>
        <p>${hanLabel}</p>
        <p>${description}</p>
        <div class="tile-surface">${renderTileSurface(matchedSample)}</div>
        <p>一致したサンプル: ${matchedSample}</p>
      </div>
    `;
  }

  function renderRecommendations() {
    if (!recommendations) {
      return;
    }
    if (totalCount(counts) === 0) {
      recommendations.innerHTML = "<p>牌を選ぶとおすすめの役が表示されます。</p>";
      return;
    }
    const items = yakuData
      .map((yaku) => buildRecommendation(yaku))
      .filter(Boolean);

    recommendations.innerHTML =
      items.length > 0
        ? items.join("")
        : "<p>一致する役サンプルが見つかりませんでした。</p>";
  }

  function rerenderAll() {
    tileDefs.forEach((tile) => updateTileButton(tile));
    renderSelectedHand();
    renderSelectedList();
    renderRecommendations();
  }

  function initTilePicker() {
    if (!tilePicker) {
      return;
    }
    tilePicker.innerHTML = tileGroups
      .map((group) => {
        const buttons = group.tiles
          .map((tile) => {
            return `
              <button class="tile-button" type="button" data-tile="${tile}" data-count="0" aria-label="${tileLabel(tile)}を追加">
                <img class="tile-button__img" src="${baseUrl}${tile}.svg" alt="" loading="lazy" decoding="async">
                <span class="tile-count"></span>
              </button>
            `;
          })
          .join("");
        return `
          <section class="tile-group">
            <h3 class="tile-group__title">${group.label}</h3>
            <div class="tile-group__row">${buttons}</div>
          </section>
        `;
      })
      .join("");
  }

  function attachHandlers() {
    if (tilePicker) {
      tilePicker.addEventListener("click", (event) => {
        const target = event.target.closest("[data-tile]");
        if (!target) {
          return;
        }
        const tile = target.dataset.tile;
        if (!tile) {
          return;
        }
        if (counts[tile] < maxCopies) {
          counts[tile] += 1;
        }
        rerenderAll();
      });
    }

    if (selectedList) {
      selectedList.addEventListener("click", (event) => {
        const target = event.target.closest("[data-action]");
        if (!target) {
          return;
        }
        const action = target.dataset.action;
        const tile = target.dataset.tile;
        if (!tile) {
          return;
        }
        if (action === "minus" && counts[tile] > 0) {
          counts[tile] -= 1;
        }
        if (action === "plus" && counts[tile] < maxCopies) {
          counts[tile] += 1;
        }
        rerenderAll();
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        tileDefs.forEach((tile) => {
          counts[tile] = 0;
        });
        rerenderAll();
      });
    }
  }

  async function init() {
    initTilePicker();
    attachHandlers();
    rerenderAll();

    if (!recommendations) {
      return;
    }
    recommendations.innerHTML = "<p>役データを読み込み中です...</p>";

    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`役データの取得に失敗: ${response.status} ${response.statusText}`);
      }
      const payload = await response.json();
      yakuData = Array.isArray(payload.yakus) ? payload.yakus : [];
      renderRecommendations();
    } catch (error) {
      console.error(error);
      recommendations.innerHTML = "<p>役データの読み込みに失敗しました。</p>";
    }
  }

  init();
</script>
