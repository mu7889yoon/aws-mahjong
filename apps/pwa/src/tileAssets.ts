import tileManifest from '../../../site/static/assets/v2.0.0/output/tiles-manifest.json';

const tileSvgModules = import.meta.glob('../../../site/static/assets/v2.0.0/output/*.svg', {
  eager: true,
  import: 'default'
}) as Record<string, string>;

const tileImageMap = new Map<string, string>();
for (const [path, url] of Object.entries(tileSvgModules)) {
  const match = path.match(/\/([1-9][mps]|[1-7]z)\.svg$/);
  if (!match) continue;
  tileImageMap.set(match[1], url);
}

const tileServiceMap = new Map<string, string>();
for (const tile of tileManifest.tiles as Array<{ id: string; awsService?: { displayName?: string } }>) {
  if (tile.awsService?.displayName) {
    tileServiceMap.set(tile.id, tile.awsService.displayName);
  }
}

function normalizeTile(tile: string): string | null {
  if (!tile || tile === '_') return null;
  const suit = tile[0];
  const digit = tile[1];
  if (!suit || !digit) return null;
  const normalizedDigit = digit === '0' ? '5' : digit;
  return `${normalizedDigit}${suit}`;
}

export interface TileArt {
  code: string;
  imageUrl: string;
  label: string;
}

export function getTileArt(tile: string): TileArt | null {
  const code = normalizeTile(tile);
  if (!code) return null;

  const imageUrl = tileImageMap.get(code);
  if (!imageUrl) return null;

  const serviceName = tileServiceMap.get(code);
  const label = serviceName ? `${serviceName} (${code})` : code;

  return {
    code,
    imageUrl,
    label
  };
}
