const baseUrl = import.meta.env.BASE_URL;

function toSitePath(path: string): string {
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(path)) {
    return path;
  }

  const basePrefix = baseUrl.replace(/\/$/, "");
  let normalizedPath = path.trim();

  if (basePrefix && normalizedPath.startsWith(basePrefix + "/")) {
    normalizedPath = normalizedPath.slice(basePrefix.length);
  } else if (basePrefix && normalizedPath === basePrefix) {
    normalizedPath = "/";
  } else if (normalizedPath.startsWith("/aws-mahjong/")) {
    normalizedPath = normalizedPath.slice("/aws-mahjong".length);
  } else if (normalizedPath === "/aws-mahjong") {
    normalizedPath = "/";
  }

  const route = normalizedPath.replace(/^\/+/, "");
  const prefix = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  if (route === "") {
    return prefix;
  }

  return `${prefix}${route}`;
}

/** Build a URL for a page route that respects Vite's configured base path. */
export function siteUrl(path: string): string {
  return toSitePath(path);
}

/** Build a URL for a static asset that respects Vite's configured base path. */
export function assetUrl(path: string): string {
  return toSitePath(path);
}
