import { describe, expect, it } from 'vitest';
import MajiangCore from '@kobalab/majiang-core';
import { GameController } from './GameController';
import { buildDefaultRule } from './rule';
import type { ActionSelection, LegalAction, PendingAction } from './types';

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
  const tsumoOrRon = pending.actions.find(
    (action) => action.type === 'tsumo' || action.type === 'ron'
  );
  if (tsumoOrRon) return { type: tsumoOrRon.type };

  const riichi = pending.actions.find(
    (action): action is Extract<LegalAction, { type: 'riichi' }> => action.type === 'riichi'
  );
  if (riichi) return { type: 'riichi', tile: riichi.options[0].tile };

  const discard = pending.actions.find(
    (action): action is Extract<LegalAction, { type: 'discard' }> => action.type === 'discard'
  );
  if (discard) {
    const option = discard.options[0];
    return { type: 'discard', tile: option.tsumogiri ? `${option.tile}_` : option.tile };
  }

  const pass = pending.actions.find((action) => action.type === 'pass');
  if (pass) return { type: 'pass' };

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

async function waitForSnapshot(
  controller: GameController,
  predicate: (controller: GameController) => boolean,
  timeoutMs = 1000
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate(controller)) return controller.getSnapshot();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`snapshot wait timed out: ${JSON.stringify(controller.getSnapshot())}`);
}

describe('GameController', () => {
  it('開始後に人間プレイヤーの入力待ちへ到達できる', async () => {
    const controller = new GameController({
      speed: 0,
      useWorker: false,
      cpuPlayerFactory: () => [new FastCpuPlayer(), new FastCpuPlayer(), new FastCpuPlayer()]
    });

    controller.startGame();
    const snapshot = await waitForSnapshot(controller, (instance) => instance.getSnapshot().pendingAction !== null);

    expect(snapshot.status).toBe('playing');
    expect(snapshot.pendingAction).not.toBeNull();
    controller.dispose();
  });

  it('人間の選択を受け付けて次の状態へ進める', async () => {
    const controller = new GameController({
      speed: 0,
      useWorker: false,
      cpuPlayerFactory: () => [new FastCpuPlayer(), new FastCpuPlayer(), new FastCpuPlayer()]
    });

    controller.startGame();
    const first = await waitForSnapshot(controller, (instance) => instance.getSnapshot().pendingAction !== null);
    expect(first.pendingAction).not.toBeNull();

    controller.dispatchHumanAction(chooseAction(first.pendingAction!));
    const next = await waitForSnapshot(
      controller,
      (instance) => {
        const snapshot = instance.getSnapshot();
        return snapshot.roundLabel !== first.roundLabel || snapshot.pendingAction !== first.pendingAction;
      }
    );

    expect(next.status).toBe('playing');
    controller.dispose();
  });
});

describe('majiang-core integration', () => {
  it('AI 4 人で東風戦を同期完走できる', () => {
    const players = [new FastCpuPlayer(), new FastCpuPlayer(), new FastCpuPlayer(), new FastCpuPlayer()];
    const game = new MajiangCore.Game(players, undefined, buildDefaultRule(), 'test').do_sync();

    expect(game._paipu.log.length).toBeGreaterThan(0);
    expect(game._paipu.rank).toHaveLength(4);
  });
});
