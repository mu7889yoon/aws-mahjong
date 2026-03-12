import MajiangCore from '@kobalab/majiang-core';
import AiPlayer from '@kobalab/majiang-ai';
import { HumanPlayer } from './HumanPlayer';
import { buildDefaultRule } from './rule';
import { buildPlayerStates, emptySnapshot, roundLabel, rotateSeat } from './tiles';
import type { ActionSelection, RoundResult, UiSnapshot } from './types';
import { CpuProxyPlayer } from './CpuProxyPlayer';

export interface GameControllerOptions {
  speed?: number;
  useWorker?: boolean;
  cpuPlayerFactory?: () => any[];
}

type SnapshotListener = () => void;

export class GameController {
  private snapshot: UiSnapshot = emptySnapshot();
  private listeners = new Set<SnapshotListener>();
  private humanPlayer: HumanPlayer;
  private game: any | null = null;
  private worker: Worker | null = null;
  private cpuPlayers: Array<CpuProxyPlayer | InstanceType<typeof AiPlayer>> = [];
  private options: {
    speed: number;
    useWorker: boolean;
  };
  private matchFinished = false;

  constructor(options: GameControllerOptions = {}) {
    this.options = {
      speed: options.speed ?? 1,
      useWorker: options.useWorker ?? typeof Worker !== 'undefined'
    };
    this.cpuPlayerFactory = options.cpuPlayerFactory;
    this.humanPlayer = new HumanPlayer(() => this.refreshSnapshot());
  }

  private cpuPlayerFactory?: () => any[];

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): UiSnapshot {
    return this.snapshot;
  }

  startGame(): void {
    this.disposeRuntime();

    this.matchFinished = false;
    this.humanPlayer = new HumanPlayer(() => this.refreshSnapshot());

    const players: any[] = [this.humanPlayer];

    if (this.cpuPlayerFactory) {
      this.cpuPlayers = this.cpuPlayerFactory();
    } else if (this.options.useWorker) {
      this.worker = new Worker(new URL('../workers/cpu.worker.ts', import.meta.url), {
        type: 'module'
      });
      this.cpuPlayers = [0, 1, 2].map((index) => new CpuProxyPlayer(this.worker!, index));
    } else {
      this.cpuPlayers = [new AiPlayer(), new AiPlayer(), new AiPlayer()];
    }

    players.push(...this.cpuPlayers);

    this.game = new MajiangCore.Game(
      players,
      () => {
        this.matchFinished = true;
        this.refreshSnapshot();
      },
      buildDefaultRule(),
      'AWS Mahjong PWA'
    );
    this.game.speed = this.options.speed;
    this.game.wait = this.options.speed === 0 ? 0 : 1200;
    this.game.handler = () => this.refreshSnapshot();

    this.refreshSnapshot();
    this.game.kaiju();
  }

  dispatchHumanAction(action: ActionSelection): boolean {
    const accepted = this.humanPlayer.dispatch(action);
    if (accepted) this.refreshSnapshot();
    return accepted;
  }

  async advanceCpu(): Promise<UiSnapshot> {
    if (this.matchFinished || this.snapshot.pendingAction) return this.snapshot;

    return new Promise<UiSnapshot>((resolve) => {
      const unsubscribe = this.subscribe(() => {
        if (this.snapshot.pendingAction || this.snapshot.status === 'finished') {
          unsubscribe();
          resolve(this.snapshot);
        }
      });
    });
  }

  dispose(): void {
    this.disposeRuntime();
  }

  private refreshSnapshot(): void {
    if (!this.game) {
      this.snapshot = emptySnapshot();
      this.emit();
      return;
    }

    const model = this.humanPlayer.model;
    if (!Array.isArray(model.shoupai) || model.shoupai.length < 4) {
      this.snapshot = {
        ...emptySnapshot(this.game.model.title),
        status: this.matchFinished ? 'finished' : 'playing'
      };
      this.emit();
      return;
    }

    const humanSeat = typeof this.humanPlayer._menfeng === 'number' ? this.humanPlayer._menfeng : 0;
    const result = this.humanPlayer.getResult();

    this.snapshot = {
      phase: this.matchFinished ? 'finished' : (this.humanPlayer.getPhase() as UiSnapshot['phase']),
      status: this.matchFinished ? 'finished' : 'playing',
      title: model.title ?? 'AWS Mahjong PWA',
      roundLabel: roundLabel(model.zhuangfeng ?? 0, model.jushu ?? 0),
      honba: model.changbang ?? 0,
      riichiSticks: model.lizhibang ?? 0,
      remainingTiles: model.shan?.paishu ?? 0,
      doraIndicators: [...(model.shan?.baopai ?? [])],
      uraDoraIndicators: [...(model.shan?.fubaopai ?? [])],
      players: buildPlayerStates(model, humanSeat),
      pendingAction: this.humanPlayer.getPendingAction(),
      result: this.decorateResult(result, humanSeat)
    };

    this.emit();
  }

  private decorateResult(result: RoundResult | null, humanSeat: number): RoundResult | null {
    if (!result) return null;
    if (result.type !== 'hule') return result;

    return {
      ...result,
      detailLines: result.detailLines.map((line) =>
        line.replace(/^(東|南|西|北)家/, (_, wind: string) => {
          const absoluteSeat = ['東', '南', '西', '北'].indexOf(wind);
          if (absoluteSeat < 0) return `${wind}家`;
          return this.snapshot.players[rotateSeat(humanSeat, absoluteSeat)]?.label ?? `${wind}家`;
        })
      )
    };
  }

  private disposeRuntime(): void {
    if (this.worker) {
      for (const player of this.cpuPlayers) {
        if (player instanceof CpuProxyPlayer) player.dispose();
      }
      this.worker.terminate();
      this.worker = null;
    }
    this.cpuPlayers = [];
    this.game = null;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
