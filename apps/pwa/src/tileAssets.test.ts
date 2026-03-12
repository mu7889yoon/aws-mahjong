import { describe, expect, it } from 'vitest';
import { getTileArt } from './tileAssets';

describe('getTileArt', () => {
  it('通常牌の AWS 牌画像を返す', () => {
    const art = getTileArt('m1');

    expect(art).not.toBeNull();
    expect(art?.code).toBe('1m');
    expect(typeof art?.imageUrl).toBe('string');
    expect(art?.imageUrl.length).toBeGreaterThan(0);
  });

  it('赤5は通常5牌の画像へ正規化する', () => {
    const art = getTileArt('m0');

    expect(art).not.toBeNull();
    expect(art?.code).toBe('5m');
  });
});
