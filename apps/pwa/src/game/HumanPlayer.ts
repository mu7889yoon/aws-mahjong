import MajiangCore from '@kobalab/majiang-core';
import {
  classifyGangAction,
  makeDiscardOptions,
  meldOptions
} from './tiles';
import type {
  ActionSelection,
  LegalAction,
  PendingAction,
  RoundResult
} from './types';

type StateChangeHandler = () => void;
type ResolveHandler = (reply?: Record<string, string>) => void;

function uniqueActions(actions: LegalAction[]): LegalAction[] {
  const merged = new Map<string, LegalAction>();

  for (const action of actions) {
    const current = merged.get(action.type);

    if (!current) {
      merged.set(action.type, action);
      continue;
    }

    if ('options' in action && 'options' in current) {
      merged.set(action.type, {
        ...action,
        options: [...current.options, ...action.options]
      } as LegalAction);
    }
  }

  return [...merged.values()];
}

export class HumanPlayer extends MajiangCore.Player {
  private onStateChange: StateChangeHandler;
  private pendingResolve: ResolveHandler | null = null;
  private pendingAction: PendingAction | null = null;
  private phase: string = 'idle';
  private result: RoundResult | null = null;

  constructor(onStateChange: StateChangeHandler) {
    super();
    this.onStateChange = onStateChange;
  }

  getPendingAction(): PendingAction | null {
    return this.pendingAction;
  }

  getPhase(): string {
    return this.phase;
  }

  getResult(): RoundResult | null {
    return this.result;
  }

  clearResult(): void {
    this.result = null;
  }

  dispatch(action: ActionSelection): boolean {
    if (!this.pendingResolve) return false;

    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    this.pendingAction = null;
    this.onStateChange();

    switch (action.type) {
      case 'discard':
        resolve({ dapai: action.tile });
        return true;
      case 'riichi':
        resolve({ dapai: `${action.tile}*` });
        return true;
      case 'chi':
      case 'pon':
      case 'daiminkan':
        resolve({ fulou: action.meld });
        return true;
      case 'ankan':
      case 'kakan':
        resolve({ gang: action.meld });
        return true;
      case 'ron':
      case 'tsumo':
        resolve({ hule: '-' });
        return true;
      case 'abortiveDraw':
        resolve({ daopai: '-' });
        return true;
      case 'pass':
        resolve();
        return true;
      default:
        return false;
    }
  }

  private setPending(reason: PendingAction['reason'], actions: LegalAction[]): void {
    this.pendingAction = {
      reason,
      actions: uniqueActions(actions)
    };
    this.pendingResolve = this._callback.bind(this);
    this.onStateChange();
  }

  private finishImmediately(): void {
    this.pendingAction = null;
    this.pendingResolve = null;
    this.onStateChange();
    this._callback();
  }

  action(msg: Record<string, unknown>, callback?: ResolveHandler): void {
    this.phase = Object.keys(msg)[0] ?? 'idle';

    if (msg.qipai) this.result = null;

    super.action(msg, callback);
    this.onStateChange();
  }

  action_kaiju(): void {
    this.finishImmediately();
  }

  action_qipai(): void {
    this.finishImmediately();
  }

  action_zimo(zimo: { l: number }, gangzimo?: boolean): void {
    if (zimo.l !== this._menfeng) {
      this.finishImmediately();
      return;
    }

    const actions: LegalAction[] = [];

    if (this.allow_hule(this.shoupai, null, gangzimo)) {
      actions.push({ type: 'tsumo' });
    }

    if (this.allow_pingju(this.shoupai)) {
      actions.push({ type: 'abortiveDraw' });
    }

    const gangMelds = this.get_gang_mianzi(this.shoupai) ?? [];
    const gangBuckets: Record<'ankan' | 'kakan', string[]> = {
      ankan: [] as string[],
      kakan: [] as string[]
    };

    for (const meld of gangMelds) {
      const actionType = classifyGangAction(meld);
      if (actionType === 'daiminkan') continue;
      gangBuckets[actionType].push(meld);
    }

    if (gangBuckets.ankan.length > 0) {
      actions.push({ type: 'ankan', options: meldOptions(gangBuckets.ankan) });
    }

    if (gangBuckets.kakan.length > 0) {
      actions.push({ type: 'kakan', options: meldOptions(gangBuckets.kakan) });
    }

    const riichiTiles = this.allow_lizhi(this.shoupai) || [];
    if (riichiTiles.length > 0) {
      actions.push({ type: 'riichi', options: makeDiscardOptions(riichiTiles) });
    }

    const discardTiles = this.shoupai.lizhi
      ? [this.shoupai._zimo + '_']
      : (this.get_dapai(this.shoupai) ?? []);
    actions.push({ type: 'discard', options: makeDiscardOptions(discardTiles) });

    this.setPending('draw', actions);
  }

  action_dapai(dapai: { l: number; p: string }): void {
    if (dapai.l === this._menfeng) {
      this.finishImmediately();
      return;
    }

    const d = ['', '+', '=', '-'][(4 + this._model.lunban - this._menfeng) % 4];
    const p = `${dapai.p}${d}`;
    const actions: LegalAction[] = [];

    if (this.allow_hule(this.shoupai, p)) {
      actions.push({ type: 'ron' });
    }

    const gangMelds = this.get_gang_mianzi(this.shoupai, p) ?? [];
    if (gangMelds.length > 0) {
      actions.push({ type: 'daiminkan', options: meldOptions(gangMelds) });
    }

    const ponMelds = this.get_peng_mianzi(this.shoupai, p) ?? [];
    if (ponMelds.length > 0) {
      actions.push({ type: 'pon', options: meldOptions(ponMelds) });
    }

    const chiMelds = this.get_chi_mianzi(this.shoupai, p) ?? [];
    if (chiMelds.length > 0) {
      actions.push({ type: 'chi', options: meldOptions(chiMelds) });
    }

    if (actions.length === 0) {
      this.finishImmediately();
      return;
    }

    actions.push({ type: 'pass' });
    this.setPending('discard', actions);
  }

  action_fulou(fulou: { l: number; m: string }): void {
    if (fulou.l !== this._menfeng || /^[mpsz]\d{4}/.test(fulou.m)) {
      this.finishImmediately();
      return;
    }

    const discardTiles = this.get_dapai(this.shoupai) ?? [];
    this.setPending('call', [{ type: 'discard', options: makeDiscardOptions(discardTiles) }]);
  }

  action_gang(gang: { l: number; m: string }): void {
    if (gang.l === this._menfeng || /^[mpsz]\d{4}$/.test(gang.m)) {
      this.finishImmediately();
      return;
    }

    const d = ['', '+', '=', '-'][(4 + this._model.lunban - this._menfeng) % 4];
    const p = `${gang.m[0]}${gang.m.slice(-1)}${d}`;

    if (this.allow_hule(this.shoupai, p, true)) {
      this.setPending('rob-kong', [{ type: 'ron' }, { type: 'pass' }]);
      return;
    }

    this.finishImmediately();
  }

  action_hule(hule: {
    l: number;
    defen: number;
    fu?: number;
    fanshu?: number;
    damanguan?: number;
    hupai?: Array<{ name: string }>;
  }): void {
    const details = [
      `${['東', '南', '西', '北'][hule.l]}家 ${hule.defen}点`,
      ...(hule.fu ? [`${hule.fu}符`] : []),
      ...(hule.fanshu ? [`${hule.fanshu}翻`] : []),
      ...(hule.damanguan ? [`${hule.damanguan}倍役満`] : []),
      ...((hule.hupai ?? []).map((item) => item.name))
    ];
    this.result = { type: 'hule', title: '和了', detailLines: details };
    this.finishImmediately();
  }

  action_pingju(pingju: { name: string }): void {
    this.result = {
      type: 'pingju',
      title: pingju.name,
      detailLines: ['流局']
    };
    this.finishImmediately();
  }

  action_jieju(jieju: { defen: number[]; rank: number[]; point: string[] }): void {
    const lines = jieju.rank.map((rank, id) => {
      return `${id + 1}P: ${rank}位 / ${jieju.defen[id]}点 / ${jieju.point[id]}pt`;
    });

    this.result = {
      type: 'jieju',
      title: '終局',
      detailLines: lines
    };
    this.finishImmediately();
  }
}
