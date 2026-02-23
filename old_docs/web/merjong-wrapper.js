import merjong from "https://cdn.jsdelivr.net/npm/merjong/+esm";

const MERJONG_API_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/merjong@0.0.9/dist/merjongAPI.js/+esm";

const merjongApiModule = await import(MERJONG_API_MODULE_URL).catch(() => null);

function resolveMerjongAPI(moduleObj) {
  if (!moduleObj) {
    return null;
  }
  if (moduleObj.merjongAPI && typeof moduleObj.merjongAPI.render === "function") {
    return moduleObj.merjongAPI;
  }
  if (moduleObj.default?.merjongAPI && typeof moduleObj.default.merjongAPI.render === "function") {
    return moduleObj.default.merjongAPI;
  }
  if (moduleObj.default && typeof moduleObj.default.render === "function") {
    return moduleObj.default;
  }
  if (typeof moduleObj.render === "function") {
    return moduleObj;
  }
  return null;
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

function parseMpsz(mpsz) {
  const result = [];
  const buffer = [];

  for (let i = 0; i < mpsz.length; i++) {
    const char = mpsz[i];

    if (/[0-9XQ]/.test(char)) {
      buffer.push(char);
      continue;
    }

    if (char === "'" || char === '"') {
      const last = buffer.pop();
      buffer.push(`${last || "Q"}${char}`);
      continue;
    }

    if (/[mpszqx]/.test(char)) {
      if (buffer.length === 0) {
        result.push({ type: "tile", tileKey: char === "x" ? "x" : "q", tileOrient: "upright" });
        continue;
      }

      for (const token of buffer) {
        const num = token[0];
        const quote = token.slice(1);
        let tileKey = "";

        if (num === "X" || num === "Q") {
          tileKey = num.toLowerCase();
        } else if (char === "x" || char === "q") {
          tileKey = char;
        } else {
          tileKey = `${num}${char}`.toLowerCase();
        }

        if (!quote) {
          result.push({ type: "tile", tileKey, tileOrient: "upright" });
          continue;
        }
        if (quote === "'") {
          result.push({ type: "tile", tileKey, tileOrient: "sideways" });
          continue;
        }
        if (quote === "''") {
          result.push({ type: "tile", tileKey, tileOrient: "sidewaysTop" });
          continue;
        }
        if (quote === '"') {
          result.push({ type: "tile", tileKey, tileOrient: "sideways" });
          result.push({ type: "tile", tileKey, tileOrient: "sidewaysTop" });
          continue;
        }

        result.push({ type: "tile", tileKey, tileOrient: "upright" });
      }

      buffer.length = 0;
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

    if (profile.tileOrient === "upright") {
      svgInner +=
        imageTag(tileBaseHref, xPosition, svgHeight - config.tileHeight, config.tileWidth, config.tileHeight) +
        imageTag(tileFaceHref, xPosition, svgHeight - config.tileHeight, config.tileWidth, config.tileHeight);
      xPosition += config.tileWidth + config.tileGap;
      continue;
    }

    if (profile.tileOrient === "sideways") {
      svgInner +=
        imageTag(tileBaseHref, -svgHeight, xPosition, config.tileWidth, config.tileHeight, "rotate(-90)") +
        imageTag(tileFaceHref, -svgHeight, xPosition, config.tileWidth, config.tileHeight, "rotate(-90)");
      xPosition += config.tileHeight + config.tileGap;
      continue;
    }

    const xRotated = config.tileWidth - svgHeight + config.tileGap;
    const yRotated = xPosition - config.tileHeight - config.tileGap;
    svgInner +=
      imageTag(tileBaseHref, xRotated, yRotated, config.tileWidth, config.tileHeight, "rotate(-90)") +
      imageTag(tileFaceHref, xRotated, yRotated, config.tileWidth, config.tileHeight, "rotate(-90)");
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

export function renderWithCustomTheme(mpsz, themeConfig) {
  return renderLocal(mpsz, themeConfig);
}

export function renderWithOutputTheme(mpsz, baseUrl = "./output/") {
  return renderWithCustomTheme(mpsz, createOutputTheme(baseUrl));
}

export { merjong, merjongAPI };
