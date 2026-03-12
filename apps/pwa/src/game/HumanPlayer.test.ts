import { describe, expect, it, vi } from 'vitest';
import { HumanPlayer } from './HumanPlayer';
import { buildDefaultRule } from './rule';

function createPlayer(hand: string): HumanPlayer {
  const player = new HumanPlayer(() => {});
  const rule = buildDefaultRule();

  player.action(
    {
      kaiju: {
        id: 0,
        rule,
        title: 'test',
        player: ['自家', '下家', '対面', '上家'],
        qijia: 0
      }
    },
    vi.fn()
  );

  player.action(
    {
      qipai: {
        zhuangfeng: 0,
        jushu: 0,
        changbang: 0,
        lizhibang: 0,
        defen: [25000, 25000, 25000, 25000],
        baopai: 'm1',
        shoupai: [hand, '', '', '']
      }
    },
    vi.fn()
  );

  return player;
}

describe('HumanPlayer pending actions', () => {
  it('上家の打牌に対してチー候補を出す', () => {
    const player = createPlayer('m123456p123s456z1');

    player.action({ dapai: { l: 3, p: 'm2' } }, vi.fn());

    expect(player.getPendingAction()?.actions.some((action) => action.type === 'chi')).toBe(true);
  });

  it('他家の打牌に対してポン候補を出す', () => {
    const player = createPlayer('m1123p123s456z112');

    player.action({ dapai: { l: 1, p: 'm1' } }, vi.fn());

    expect(player.getPendingAction()?.actions.some((action) => action.type === 'pon')).toBe(true);
  });

  it('他家の打牌に対して大明槓候補を出す', () => {
    const player = createPlayer('m1112p123s456z112');

    player.action({ dapai: { l: 2, p: 'm1' } }, vi.fn());

    expect(player.getPendingAction()?.actions.some((action) => action.type === 'daiminkan')).toBe(true);
  });

  it('自摸時に暗槓候補を出す', () => {
    const player = createPlayer('m111p123s456z1122');

    player.action({ zimo: { l: 0, p: 'm1' } }, vi.fn());

    expect(player.getPendingAction()?.actions.some((action) => action.type === 'ankan')).toBe(true);
  });
});
