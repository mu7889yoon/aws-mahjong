export interface Tile {
  id: string;
  name: string;
  url?: string;
}

export interface TileGroup {
  id: string;
  title: string;
  description: string;
  tiles: Tile[];
}

/**
 * The source JSON has accumulated optional fields over time. Keep its shape
 * open so a newly added field survives migration without a type rewrite.
 */
export interface Yaku {
  id: string;
  name?: string | null;
  sampleMpszList?: string[];
  compositionExampleMpsz?: string | null;
  isPonAllowed?: boolean | null;
  isChiAllowed?: boolean | null;
  han?: number | string | null;
  hanOpen?: number | string | null;
  isCombineAllowed?: boolean | null;
  description?: string | string[] | null;
  [key: string]: unknown;
}

export interface SiteVersion {
  id: string;
  title: string;
  description: string;
  rules: string;
  tileGroups: TileGroup[];
  yakus: Yaku[];
  /** Relative to the configured site base path, without a leading slash. */
  assetPath: string;
}

export interface VersionMetadata {
  id: string;
  title: string;
  description: string;
}
