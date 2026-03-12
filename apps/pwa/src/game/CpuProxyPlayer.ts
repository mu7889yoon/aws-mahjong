type WorkerMessage =
  | {
      type: 'action';
      playerIndex: number;
      requestId: number;
      message: Record<string, unknown>;
    }
  | {
      type: 'reply';
      requestId: number;
      reply: Record<string, string> | null;
    };

type ReplyHandler = (reply?: Record<string, string>) => void;

let requestSequence = 0;

export class CpuProxyPlayer {
  private worker: Worker;
  private playerIndex: number;
  private pending = new Map<number, ReplyHandler>();
  private boundHandler: (event: MessageEvent<WorkerMessage>) => void;

  constructor(worker: Worker, playerIndex: number) {
    this.worker = worker;
    this.playerIndex = playerIndex;
    this.boundHandler = (event) => {
      if (event.data.type !== 'reply') return;
      const callback = this.pending.get(event.data.requestId);
      if (!callback) return;

      this.pending.delete(event.data.requestId);
      callback(event.data.reply ?? undefined);
    };

    this.worker.addEventListener('message', this.boundHandler);
  }

  action(message: Record<string, unknown>, callback: ReplyHandler): void {
    const requestId = requestSequence++;
    this.pending.set(requestId, callback);
    this.worker.postMessage({
      type: 'action',
      playerIndex: this.playerIndex,
      requestId,
      message
    } satisfies WorkerMessage);
  }

  dispose(): void {
    this.worker.removeEventListener('message', this.boundHandler);
    for (const callback of this.pending.values()) callback();
    this.pending.clear();
  }
}
