import { describe, expect, it } from 'vitest';
import { GameController } from './GameController';
import type { ActionSelection, LegalAction, PendingAction } from './types';
import { findAction, resolveTileAction } from '../handSelection';
import MajiangCore from '@kobalab/majiang-core';

class FastCpuPlayer extends MajiangCore.Player {
  action_kaiju() {
    this._callback();
  }

  action_qipai() {
    this._callback();
  }

  action_zimo(zimo: { l: number }, gangzimo?: boolean) {
    if (zimo.l !== this._menfeng) {
      this._callback();
      return;
    }

    if (this.allow_hule(this.shoupai, null, gangzimo)) {
      this._callback({ hule: '-' });
      return;
    }

    const gang = this.get_gang_mianzi(this.shoupai)?.[0];
    if (gang) {
      this._callback({ gang });
      return;
    }

    const dapai = this.get_dapai(this.shoupai)?.[0];
    this._callback({ dapai });
  }

  action_dapai(dapai: { l: number; p: string }) {
    if (dapai.l === this._menfeng) {
      this._callback();
      return;
    }

    const d = ['', '+', '=', '-'][(4 + this._model.lunban - this._menfeng) % 4];
    if (this.allow_hule(this.shoupai, `${dapai.p}${d}`)) {
      this._callback({ hule: '-' });
      return;
    }

    this._callback();
  }

  action_fulou(fulou: { l: number; m: string }) {
    if (fulou.l !== this._menfeng || /^[mpsz]\d{4}/.test(fulou.m)) {
      this._callback();
      return;
    }

    const dapai = this.get_dapai(this.shoupai)?.[0];
    this._callback({ dapai });
  }

  action_gang(gang: { l: number; m: string }) {
    if (gang.l === this._menfeng) {
      this._callback();
      return;
    }

    const d = ['', '+', '=', '-'][(4 + this._model.lunban - this._menfeng) % 4];
    if (this.allow_hule(this.shoupai, `${gang.m[0]}${gang.m.slice(-1)}${d}`, true)) {
      this._callback({ hule: '-' });
      return;
    }

    this._callback();
  }

  action_hule() {
    this._callback();
  }

  action_pingju() {
    this._callback();
  }

  action_jieju() {
    this._callback();
  }
}

function chooseAction(pending: PendingAction): ActionSelection {
  const discard = findAction(pending.actions, 'discard');
  if (discard) {
    const option = discard.options.find((candidate) => !candidate.tsumogiri) ?? discard.options[0];
    return { type: 'discard', tile: option.tsumogiri ? `${option.tile}_` : option.tile };
  }

  const riichi = findAction(pending.actions, 'riichi');
  if (riichi) {
    return { type: 'riichi', tile: riichi.options[0].tile };
  }

  const pass = pending.actions.find((action) => action.type === 'pass');
  if (pass) return { type: 'pass' };

  const tsumoOrRon = pending.actions.find((action) => action.type === 'tsumo' || action.type === 'ron');
  if (tsumoOrRon) return { type: tsumoOrRon.type };

  const meld = pending.actions.find(
    (
      action
    ): action is Extract<LegalAction, { type: 'chi' | 'pon' | 'daiminkan' | 'ankan' | 'kakan' }> =>
      action.type === 'chi' ||
      action.type === 'pon' ||
      action.type === 'daiminkan' ||
      action.type === 'ankan' ||
      action.type === 'kakan'
  );

  if (meld) {
    return { type: meld.type, meld: meld.options[0].meld } as ActionSelection;
  }

  return { type: 'abortiveDraw' };
}

function isOwnDiscardTurn(controller: GameController): boolean {
  const snapshot = controller.getSnapshot();
  return Boolean(
    snapshot.players[0].isTurn &&
      snapshot.pendingAction &&
      findAction(snapshot.pendingAction.actions, 'discard')
  );
}

async function waitForOwnDiscardTurn(controller: GameController, timeoutMs = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (isOwnDiscardTurn(controller)) return controller.getSnapshot();

    const snapshot = controller.getSnapshot();
    if (snapshot.pendingAction) {
      controller.dispatchHumanAction(chooseAction(snapshot.pendingAction));
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`own discard turn wait timed out: ${JSON.stringify(controller.getSnapshot())}`);
}

describe('turn flow', () => {
  it('二巡目以降もツモ牌に対応する action を作れる', async () => {
    const controller = new GameController({
      speed: 0,
      useWorker: false,
      cpuPlayerFactory: () => [new FastCpuPlayer(), new FastCpuPlayer(), new FastCpuPlayer()]
    });

    controller.startGame();

    const first = await waitForOwnDiscardTurn(controller);
    expect(first.players[0].drawnTile).toBeTruthy();
    controller.dispatchHumanAction(chooseAction(first.pendingAction!));

    const second = await waitForOwnDiscardTurn(controller);

    const discard = findAction(second.pendingAction!.actions, 'discard');
    expect(second.players[0].drawnTile).toBeTruthy();
    expect(discard).not.toBeNull();

    const drawAction = resolveTileAction(
      discard?.options ?? [],
      'discard',
      second.players[0].drawnTile!,
      'draw'
    );

    expect(drawAction).not.toBeNull();
    controller.dispose();
  });
});
