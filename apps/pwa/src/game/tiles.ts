import type {
  DiscardOption,
  MeldOption,
  RelativeSeat,
  UiDiscard,
  UiMeld,
  UiPlayerState,
  UiSnapshot
} from './types';

const WIND_LABELS = ['東', '南', '西', '北'] as const;
const ROUND_LABELS = ['東', '南', '西', '北'] as const;
const PLAYER_LABELS = ['自家', '下家', '対面', '上家'] as const;

function parseTiles(block: string): string[] {
  const tiles: string[] = [];

  for (const token of block.match(/[mpsz]\d+|_+/g) ?? []) {
    if (token.startsWith('_')) {
      tiles.push(...token.split('').filter(Boolean));
      continue;
    }

    const suit = token[0];
    for (const digit of token.slice(1)) {
      tiles.push(`${suit}${digit}`);
    }
  }

  return tiles;
}

export function expandMeldTiles(meld: string): string[] {
  const suit = meld[0];
  return (meld.match(/\d/g) ?? []).map((digit) => `${suit}${digit}`);
}

export function classifyGangAction(meld: string): 'ankan' | 'kakan' | 'daiminkan' {
  if (/^[mpsz]\d{4}$/.test(meld)) return 'ankan';
  if (/^[mpsz]\d{3}[\+\=\-]\d$/.test(meld)) return 'kakan';
  return 'daiminkan';
}

export function meldOptions(melds: string[]): MeldOption[] {
  return melds.map((meld) => ({
    meld,
    tiles: expandMeldTiles(meld)
  }));
}

function parseHand(shoupai: any, revealAll: boolean) {
  const handString = String(shoupai.toString());
  const [bingpaiPart, ...meldParts] = handString.split(',');
  const melds = meldParts.filter(Boolean).map((meld) => ({
    meld,
    tiles: expandMeldTiles(meld)
  }));
  const riichi = /\*$/.test(bingpaiPart);
  const normalized = bingpaiPart.replace(/\*$/, '');
  const tiles = parseTiles(normalized);
  const visibleTiles = revealAll ? tiles.filter((tile) => tile !== '_') : [];
  const concealedCount = revealAll
    ? visibleTiles.length
    : tiles.filter((tile) => tile === '_').length;
  const drawnTile =
    revealAll && shoupai._zimo && String(shoupai._zimo).length <= 2 ? String(shoupai._zimo) : null;

  if (drawnTile) {
    const drawIndex = visibleTiles.lastIndexOf(drawnTile);
    if (drawIndex >= 0) visibleTiles.splice(drawIndex, 1);
  }

  return {
    concealedTiles: visibleTiles,
    concealedCount,
    drawnTile,
    melds,
    riichi
  };
}

function parseDiscards(he: any): UiDiscard[] {
  return (he?._pai ?? []).map((tile: string) => ({
    tile: tile.slice(0, 2),
    called: /[\+\=\-]$/.test(tile)
  }));
}

export function makeDiscardOptions(tiles: string[]): DiscardOption[] {
  return tiles.map((tile) => ({
    tile: tile.replace(/\*$/, ''),
    tsumogiri: tile.endsWith('_')
  }));
}

export function rotateSeat(base: number, absoluteSeat: number): RelativeSeat {
  return ((absoluteSeat + 4 - base) % 4) as RelativeSeat;
}

export function roundLabel(zhuangfeng: number, jushu: number): string {
  return `${ROUND_LABELS[zhuangfeng] ?? '?'}${jushu + 1}局`;
}

export function buildPlayerStates(model: any, humanSeat: number): UiPlayerState[] {
  const players: UiPlayerState[] = [];

  for (let relativeSeat = 0 as RelativeSeat; relativeSeat < 4; relativeSeat += 1) {
    const absoluteSeat = (humanSeat + relativeSeat) % 4;
    const revealAll = relativeSeat === 0 || model.lunban < 0;
    const hand = parseHand(model.shoupai[absoluteSeat], revealAll);

    players.push({
      seat: relativeSeat,
      label: PLAYER_LABELS[relativeSeat],
      wind: WIND_LABELS[absoluteSeat],
      score: model.defen[model.player_id[absoluteSeat]],
      concealedTiles: hand.concealedTiles,
      concealedCount: hand.concealedCount,
      drawnTile: hand.drawnTile,
      melds: hand.melds,
      discards: parseDiscards(model.he[absoluteSeat]),
      riichi: hand.riichi,
      isTurn: model.lunban === absoluteSeat,
      isDealer: absoluteSeat === 0
    });
  }

  return players;
}

export function emptySnapshot(title = 'AWS Mahjong PWA'): UiSnapshot {
  return {
    phase: 'idle',
    status: 'idle',
    title,
    roundLabel: '開始前',
    honba: 0,
    riichiSticks: 0,
    remainingTiles: 0,
    doraIndicators: [],
    uraDoraIndicators: [],
    players: [
      {
        seat: 0,
        label: '自家',
        wind: '東',
        score: 25000,
        concealedTiles: [],
        concealedCount: 0,
        drawnTile: null,
        melds: [],
        discards: [],
        riichi: false,
        isTurn: false,
        isDealer: true
      },
      {
        seat: 1,
        label: '下家',
        wind: '南',
        score: 25000,
        concealedTiles: [],
        concealedCount: 0,
        drawnTile: null,
        melds: [],
        discards: [],
        riichi: false,
        isTurn: false,
        isDealer: false
      },
      {
        seat: 2,
        label: '対面',
        wind: '西',
        score: 25000,
        concealedTiles: [],
        concealedCount: 0,
        drawnTile: null,
        melds: [],
        discards: [],
        riichi: false,
        isTurn: false,
        isDealer: false
      },
      {
        seat: 3,
        label: '上家',
        wind: '北',
        score: 25000,
        concealedTiles: [],
        concealedCount: 0,
        drawnTile: null,
        melds: [],
        discards: [],
        riichi: false,
        isTurn: false,
        isDealer: false
      }
    ],
    pendingAction: null,
    result: null
  };
}
