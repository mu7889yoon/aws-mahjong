import AiPlayer from '@kobalab/majiang-ai';

const players = [new AiPlayer(), new AiPlayer(), new AiPlayer()];

type WorkerRequest = {
  type: 'action';
  playerIndex: number;
  requestId: number;
  message: Record<string, unknown>;
};

type WorkerReply = {
  type: 'reply';
  requestId: number;
  reply: Record<string, string> | null;
};

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== 'action') return;

  const player = players[event.data.playerIndex];
  player.action(event.data.message, (reply?: Record<string, string>) => {
    self.postMessage({
      type: 'reply',
      requestId: event.data.requestId,
      reply: reply ?? null
    } satisfies WorkerReply);
  });
});
