export type RelativeSeat = 0 | 1 | 2 | 3;

export type GamePhase =
  | 'idle'
  | 'kaiju'
  | 'qipai'
  | 'zimo'
  | 'dapai'
  | 'fulou'
  | 'gang'
  | 'gangzimo'
  | 'hule'
  | 'pingju'
  | 'jieju'
  | 'finished';

export interface DiscardOption {
  tile: string;
  tsumogiri: boolean;
}

export interface MeldOption {
  meld: string;
  tiles: string[];
}

export type LegalAction =
  | { type: 'discard'; options: DiscardOption[] }
  | { type: 'riichi'; options: DiscardOption[] }
  | { type: 'chi'; options: MeldOption[] }
  | { type: 'pon'; options: MeldOption[] }
  | { type: 'daiminkan'; options: MeldOption[] }
  | { type: 'ankan'; options: MeldOption[] }
  | { type: 'kakan'; options: MeldOption[] }
  | { type: 'ron' }
  | { type: 'tsumo' }
  | { type: 'pass' }
  | { type: 'abortiveDraw' };

export type ActionSelection =
  | { type: 'discard'; tile: string }
  | { type: 'riichi'; tile: string }
  | { type: 'chi'; meld: string }
  | { type: 'pon'; meld: string }
  | { type: 'daiminkan'; meld: string }
  | { type: 'ankan'; meld: string }
  | { type: 'kakan'; meld: string }
  | { type: 'ron' }
  | { type: 'tsumo' }
  | { type: 'pass' }
  | { type: 'abortiveDraw' };

export interface PendingAction {
  reason: 'draw' | 'discard' | 'call' | 'rob-kong';
  actions: LegalAction[];
}

export interface RoundResult {
  type: 'hule' | 'pingju' | 'jieju';
  title: string;
  detailLines: string[];
}

export interface UiMeld {
  meld: string;
  tiles: string[];
}

export interface UiDiscard {
  tile: string;
  called: boolean;
}

export interface UiPlayerState {
  seat: RelativeSeat;
  label: string;
  wind: string;
  score: number;
  concealedTiles: string[];
  concealedCount: number;
  drawnTile: string | null;
  melds: UiMeld[];
  discards: UiDiscard[];
  riichi: boolean;
  isTurn: boolean;
  isDealer: boolean;
}

export interface UiSnapshot {
  phase: GamePhase;
  status: 'idle' | 'playing' | 'finished';
  title: string;
  roundLabel: string;
  honba: number;
  riichiSticks: number;
  remainingTiles: number;
  doraIndicators: string[];
  uraDoraIndicators: string[];
  players: UiPlayerState[];
  pendingAction: PendingAction | null;
  result: RoundResult | null;
}
