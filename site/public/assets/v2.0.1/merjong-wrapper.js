import merjong from "https://cdn.jsdelivr.net/npm/merjong/+esm";

const MERJONG_API_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/merjong@0.0.9/dist/merjongAPI.js/+esm";

const merjongApiModule = await import(MERJONG_API_MODULE_URL).catch(() => null);

function resolveMerjongAPI(moduleObj) {
  const candidates = [
    moduleObj?.merjongAPI,
    moduleObj?.default?.merjongAPI,
    moduleObj?.default,
    moduleObj,
  ];

  return candidates.find((candidate) => typeof candidate?.render === "function") || null;
}

const merjongAPI = resolveMerjongAPI(merjongApiModule);

const DEFAULT_TILESET_BASE_URL =
  "https://raw.githubusercontent.com/FluffyStuff/riichi-mahjong-tiles/26e127ba2117f45cdce5ea0225748cc0cfad3169/Regular/";

const DEFAULT_THEME = Object.freeze({
  backgroundColor: "green",
  tileWidth: 36,
  tileHeight: 48,
  tileGap: 3,
  spaceWidth: 10,
  tileDesigns: (() => {
    const designs = {
      base: `${DEFAULT_TILESET_BASE_URL}Front.svg`,
      q: `${DEFAULT_TILESET_BASE_URL}Blank.svg`,
      x: `${DEFAULT_TILESET_BASE_URL}Back.svg`,
      "0m": `${DEFAULT_TILESET_BASE_URL}Man5-Dora.svg`,
      "0p": `${DEFAULT_TILESET_BASE_URL}Pin5-Dora.svg`,
      "0s": `${DEFAULT_TILESET_BASE_URL}Sou5-Dora.svg`,
    };

    for (const suit of ["m", "p", "s"]) {
      const suitName = suit === "m" ? "Man" : suit === "p" ? "Pin" : "Sou";
      for (let i = 1; i <= 9; i++) {
        designs[`${i}${suit}`] = `${DEFAULT_TILESET_BASE_URL}${suitName}${i}.svg`;
      }
    }

    const honorNames = {
      1: "Ton",
      2: "Nan",
      3: "Shaa",
      4: "Pei",
      5: "Haku",
      6: "Hatsu",
      7: "Chun",
    };

    for (const [num, name] of Object.entries(honorNames)) {
      designs[`${num}z`] = `${DEFAULT_TILESET_BASE_URL}${name}.svg`;
    }

    return designs;
  })(),
});

function resolveBaseUrl(designs, baseUrl) {
  if (!baseUrl) {
    return { ...designs };
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const resolved = {};

  for (const [key, value] of Object.entries(designs || {})) {
    if (typeof value !== "string") {
      continue;
    }
    if (value.startsWith("http://") || value.startsWith("https://")) {
      resolved[key] = value;
      continue;
    }
    resolved[key] = `${normalizedBaseUrl}${value}`;
  }

  return resolved;
}

function buildTheme(themeConfig) {
  if (!themeConfig) {
    return {
      ...DEFAULT_THEME,
      tileDesigns: { ...DEFAULT_THEME.tileDesigns },
    };
  }

  return {
    backgroundColor: themeConfig.backgroundColor ?? DEFAULT_THEME.backgroundColor,
    tileWidth: themeConfig.tileWidth ?? DEFAULT_THEME.tileWidth,
    tileHeight: themeConfig.tileHeight ?? DEFAULT_THEME.tileHeight,
    tileGap: themeConfig.tileGap ?? DEFAULT_THEME.tileGap,
    spaceWidth: themeConfig.spaceWidth ?? DEFAULT_THEME.spaceWidth,
    tileDesigns: {
      ...DEFAULT_THEME.tileDesigns,
      ...resolveBaseUrl(themeConfig.tileDesigns || {}, themeConfig.baseUrl),
    },
  };
}

const TILE_NUMBER_PATTERN = /[0-9XQ]/;
const TILE_TYPE_PATTERN = /[mpszqx]/;

function createTileProfile(tileKey, tileOrient) {
  return { type: "tile", tileKey, tileOrient };
}

function appendQuoteToBuffer(buffer, quoteChar) {
  const last = buffer.pop();
  buffer.push(`${last || "Q"}${quoteChar}`);
}

function resolveTileKey(token, suitChar) {
  const num = token[0];

  if (num === "X" || num === "Q") {
    return num.toLowerCase();
  }
  if (suitChar === "x" || suitChar === "q") {
    return suitChar;
  }
  return `${num}${suitChar}`.toLowerCase();
}

function createProfilesFromToken(token, suitChar) {
  const tileKey = resolveTileKey(token, suitChar);
  const quote = token.slice(1);

  if (!quote) {
    return [createTileProfile(tileKey, "upright")];
  }
  if (quote === "'") {
    return [createTileProfile(tileKey, "sideways")];
  }
  if (quote === "''") {
    return [createTileProfile(tileKey, "sidewaysTop")];
  }
  if (quote === '"') {
    return [createTileProfile(tileKey, "sideways"), createTileProfile(tileKey, "sidewaysTop")];
  }
  return [createTileProfile(tileKey, "upright")];
}

function flushTileBuffer(result, buffer, suitChar) {
  if (buffer.length === 0) {
    result.push(createTileProfile(suitChar === "x" ? "x" : "q", "upright"));
    return;
  }

  for (const token of buffer) {
    result.push(...createProfilesFromToken(token, suitChar));
  }

  buffer.length = 0;
}

function parseMpsz(mpsz) {
  const result = [];
  const buffer = [];

  for (let i = 0; i < mpsz.length; i++) {
    const char = mpsz[i];

    if (TILE_NUMBER_PATTERN.test(char)) {
      buffer.push(char);
      continue;
    }

    if (char === "'" || char === '"') {
      appendQuoteToBuffer(buffer, char);
      continue;
    }

    if (TILE_TYPE_PATTERN.test(char)) {
      flushTileBuffer(result, buffer, char);
      continue;
    }

    if (char === "-") {
      result.push({ type: "space" });
    }
  }

  return result;
}

function imageTag(href, x, y, width, height, transform) {
  if (!href) {
    return "";
  }
  const transformAttr = transform ? ` transform="${transform}"` : "";
  return `<image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}"${transformAttr} />`;
}

function createTileSvg(tileBaseHref, tileFaceHref, x, y, width, height, transform) {
  return (
    imageTag(tileBaseHref, x, y, width, height, transform) +
    imageTag(tileFaceHref, x, y, width, height, transform)
  );
}

function renderTileProfile(profile, config, svgHeight, xPosition, tileBaseHref, tileFaceHref) {
  if (profile.tileOrient === "upright") {
    return {
      svg: createTileSvg(
        tileBaseHref,
        tileFaceHref,
        xPosition,
        svgHeight - config.tileHeight,
        config.tileWidth,
        config.tileHeight,
      ),
      advance: config.tileWidth + config.tileGap,
    };
  }

  if (profile.tileOrient === "sideways") {
    return {
      svg: createTileSvg(
        tileBaseHref,
        tileFaceHref,
        -svgHeight,
        xPosition,
        config.tileWidth,
        config.tileHeight,
        "rotate(-90)",
      ),
      advance: config.tileHeight + config.tileGap,
    };
  }

  const xRotated = config.tileWidth - svgHeight + config.tileGap;
  const yRotated = xPosition - config.tileHeight - config.tileGap;
  return {
    svg: createTileSvg(
      tileBaseHref,
      tileFaceHref,
      xRotated,
      yRotated,
      config.tileWidth,
      config.tileHeight,
      "rotate(-90)",
    ),
    advance: 0,
  };
}

function renderLocal(mpsz, themeConfig) {
  const config = buildTheme(themeConfig);
  const profiles = parseMpsz(mpsz);
  const svgHeight = Math.max(config.tileHeight, config.tileWidth * 2 + config.tileGap);
  let svgInner = "";
  let xPosition = 0;

  for (const profile of profiles) {
    if (profile.type === "space") {
      xPosition += config.spaceWidth;
      continue;
    }

    const tileBaseHref = config.tileDesigns.base;
    const tileFaceHref = config.tileDesigns[profile.tileKey] || config.tileDesigns.q;
    const rendered = renderTileProfile(
      profile,
      config,
      svgHeight,
      xPosition,
      tileBaseHref,
      tileFaceHref,
    );
    svgInner += rendered.svg;
    xPosition += rendered.advance;
  }

  return `<div style="background-color: ${config.backgroundColor}; padding: 0.375rem; border-radius: 6px;"><svg width="100%" height="${svgHeight}" style="display: block;">${svgInner}</svg></div>`;
}

function createStandardTileDesigns() {
  const tileDesigns = {
    q: "5z.svg",
    x: "1z.svg",
    "0m": "5m.svg",
    "0p": "5p.svg",
    "0s": "5s.svg",
  };

  for (const suit of ["m", "p", "s"]) {
    for (let i = 1; i <= 9; i++) {
      tileDesigns[`${i}${suit}`] = `${i}${suit}.svg`;
    }
  }

  for (let i = 1; i <= 7; i++) {
    tileDesigns[`${i}z`] = `${i}z.svg`;
  }

  return tileDesigns;
}

export function createOutputTheme(baseUrl = "./output/") {
  return {
    baseUrl,
    tileDesigns: createStandardTileDesigns(),
  };
}

export async function loadTheme(themeUrl = "./theme.json") {
  const response = await fetch(themeUrl);
  if (!response.ok) {
    throw new Error(`テーマの読み込みに失敗しました: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export function renderDefault(mpsz) {
  if (merjongAPI && typeof merjongAPI.render === "function") {
    return merjongAPI.render(mpsz);
  }
  return renderLocal(mpsz);
}

export function renderWithMerjong(mpsz, fallbackBaseUrl = "./output/") {
  if (merjongAPI && typeof merjongAPI.render === "function") {
    return merjongAPI.render(mpsz);
  }
  return renderWithOutputTheme(mpsz, fallbackBaseUrl);
}

export function renderWithCustomTheme(mpsz, themeConfig) {
  return renderLocal(mpsz, themeConfig);
}

export function renderWithOutputTheme(mpsz, baseUrl = "./output/") {
  return renderWithCustomTheme(mpsz, createOutputTheme(baseUrl));
}

export { merjong, merjongAPI };
