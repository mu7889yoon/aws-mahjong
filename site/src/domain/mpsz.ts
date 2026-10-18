export type TileOrientation = "upright" | "sideways" | "sidewaysTop";

export type MpszTile = {
  kind: "tile";
  tileKey: string;
  orientation: TileOrientation;
};

export type MpszSpace = { kind: "space" };
export type MpszToken = MpszTile | MpszSpace;

const TILE_NUMBER_PATTERN = /^[0-9XQ]$/;
const TILE_TYPE_PATTERN = /^[mpszqx]$/i;

function appendQuote(buffer: string[], quote: "'" | '"'): void {
  const last = buffer.pop();
  buffer.push(`${last || "Q"}${quote}`);
}

function tileKeyFor(token: string, suitChar: string): string {
  const number = token[0];
  const suit = suitChar.toLowerCase();

  if (number === "X" || number === "Q") {
    return number.toLowerCase();
  }
  if (suit === "x" || suit === "q") {
    return suit;
  }
  return `${number}${suit}`;
}

function profilesFor(token: string, suitChar: string): MpszTile[] {
  const tileKey = tileKeyFor(token, suitChar);
  const quote = token.slice(1);

  if (quote === "'") {
    return [{ kind: "tile", tileKey, orientation: "sideways" }];
  }
  if (quote === "''") {
    return [{ kind: "tile", tileKey, orientation: "sidewaysTop" }];
  }
  if (quote === '"') {
    return [
      { kind: "tile", tileKey, orientation: "sideways" },
      { kind: "tile", tileKey, orientation: "sidewaysTop" },
    ];
  }
  return [{ kind: "tile", tileKey, orientation: "upright" }];
}

/** Parse tile tokens, separators, and the orientation markers used by merjong MPSZ strings. */
export function parseMpsz(mpsz: string): MpszToken[] {
  const result: MpszToken[] = [];
  const buffer: string[] = [];

  for (const char of mpsz) {
    if (TILE_NUMBER_PATTERN.test(char)) {
      buffer.push(char);
      continue;
    }

    if (char === "'" || char === '"') {
      appendQuote(buffer, char);
      continue;
    }

    if (TILE_TYPE_PATTERN.test(char)) {
      const suit = char.toLowerCase();
      if (buffer.length === 0) {
        result.push({ kind: "tile", tileKey: suit === "x" ? "x" : "q", orientation: "upright" });
      } else {
        for (const token of buffer) {
          result.push(...profilesFor(token, suit));
        }
        buffer.length = 0;
      }
      continue;
    }

    if (char === "-") {
      result.push({ kind: "space" });
    }
  }

  return result;
}

/** Count digit tiles in MPSZ notation; unknown suits remain in the denominator like the legacy search. */
export function parseMpszToCounts(mpsz: string): Record<string, number> {
  const counts: Record<string, number> = {};
  let buffer = "";

  for (const char of mpsz) {
    if (char >= "0" && char <= "9") {
      buffer += char;
      continue;
    }

    if ("mpsz".includes(char.toLowerCase())) {
      const suit = char.toLowerCase();
      for (const number of buffer) {
        const tile = `${number}${suit}`;
        counts[tile] = (counts[tile] || 0) + 1;
      }
      buffer = "";
    }
  }

  return counts;
}

export function tileImageFile(tileKey: string): string {
  if (/^[1-9][mps]$/.test(tileKey) || /^[1-7]z$/.test(tileKey)) {
    return `${tileKey}.svg`;
  }
  if (/^0[mps]$/.test(tileKey)) {
    return `5${tileKey[1]}.svg`;
  }
  if (tileKey === "x") {
    return "1z.svg";
  }
  return "5z.svg";
}
