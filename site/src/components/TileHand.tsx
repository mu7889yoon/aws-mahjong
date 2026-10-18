import { assetUrl } from "../app/paths";
import { parseMpsz, tileImageFile, type MpszTile, type MpszToken } from "../domain/mpsz";

export type TileHandProps = {
  mpsz: string;
  assetPath: string;
  ariaLabel?: string;
};

const TILE_WIDTH = 36;
const TILE_HEIGHT = 48;
const TILE_GAP = 3;
const SPACE_WIDTH = 10;
const HAND_HEIGHT = Math.max(TILE_HEIGHT, TILE_WIDTH * 2 + TILE_GAP);

type PositionedTile = {
  tile: MpszTile;
  left: number;
  top: number;
  width: number;
  height: number;
  order: number;
};

function layoutTiles(tokens: readonly MpszToken[]): { tiles: PositionedTile[]; width: number } {
  let left = 0;
  const tiles: PositionedTile[] = [];

  tokens.forEach((token, order) => {
    if (token.kind === "space") {
      left += SPACE_WIDTH;
      return;
    }

    if (token.orientation === "sidewaysTop") {
      tiles.push({
        tile: token,
        left: left - TILE_HEIGHT - TILE_GAP,
        top: 0,
        width: TILE_HEIGHT,
        height: TILE_WIDTH,
        order,
      });
      return;
    }

    const sideways = token.orientation === "sideways";
    tiles.push({
      tile: token,
      left,
      top: sideways ? HAND_HEIGHT - TILE_WIDTH : HAND_HEIGHT - TILE_HEIGHT,
      width: sideways ? TILE_HEIGHT : TILE_WIDTH,
      height: sideways ? TILE_WIDTH : TILE_HEIGHT,
      order,
    });
    left += (sideways ? TILE_HEIGHT : TILE_WIDTH) + TILE_GAP;
  });

  return { tiles, width: Math.max(left - (left > 0 ? TILE_GAP : 0), 1) };
}

function TileFace({ tile, assetPath }: { tile: MpszTile; assetPath: string }) {
  const imageUrl = assetUrl(`${assetPath}/output/${tileImageFile(tile.tileKey)}`);
  const sideways = tile.orientation !== "upright";

  return (
    <span
      className="tile-hand__tile"
      style={{
        position: "absolute",
        left: sideways ? 6 : 0,
        top: sideways ? -6 : 0,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        display: "block",
        overflow: "hidden",
        boxSizing: "border-box",
        border: "1px solid #b8b8b8",
        borderRadius: 4,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.35)",
        transform: sideways ? "rotate(-90deg)" : undefined,
        transformOrigin: "center",
      }}
    >
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "fill" }}
      />
    </span>
  );
}

export function TileHand({ mpsz, assetPath, ariaLabel }: TileHandProps) {
  const { tiles, width } = layoutTiles(parseMpsz(mpsz));

  return (
    <div
      className="tile-hand"
      role="img"
      aria-label={ariaLabel ?? `手牌: ${mpsz}`}
      style={{
        maxWidth: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        borderRadius: 6,
        backgroundColor: "green",
        padding: 6,
        boxSizing: "border-box",
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: "relative", width, minWidth: width, height: HAND_HEIGHT }}
      >
        {tiles.map(({ tile, left, top, width: tileWidth, height, order }) => (
          <span
            key={`${order}-${tile.tileKey}`}
            style={{
              position: "absolute",
              left,
              top,
              width: tileWidth,
              height,
              zIndex: order,
            }}
          >
            <TileFace tile={tile} assetPath={assetPath} />
          </span>
        ))}
      </div>
    </div>
  );
}
