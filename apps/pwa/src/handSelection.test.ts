import { describe, expect, it } from 'vitest';
import { resolveTileAction } from './handSelection';

describe('resolveTileAction', () => {
  it('ツモ切り option がなくてもツモ牌クリックを打牌として許可する', () => {
    expect(
      resolveTileAction(
        [
          { tile: 's3', tsumogiri: false },
          { tile: 'm1', tsumogiri: false }
        ],
        'discard',
        's3',
        'draw'
      )
    ).toEqual({ type: 'discard', tile: 's3' });
  });

  it('ツモ切り option がある時はそれを優先する', () => {
    expect(
      resolveTileAction(
        [
          { tile: 's3', tsumogiri: false },
          { tile: 's3', tsumogiri: true }
        ],
        'discard',
        's3',
        'draw'
      )
    ).toEqual({ type: 'discard', tile: 's3_' });
  });

  it('リーチは source に関係なく同じ牌なら選択できる', () => {
    expect(
      resolveTileAction([{ tile: 'p7', tsumogiri: false }], 'riichi', 'p7', 'draw')
    ).toEqual({ type: 'riichi', tile: 'p7' });
  });
});
