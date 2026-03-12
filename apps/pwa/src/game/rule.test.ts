import { describe, expect, it } from 'vitest';
import { buildDefaultRule } from './rule';

describe('buildDefaultRule', () => {
  it('東風戦のネット標準寄り設定を固定する', () => {
    const rule = buildDefaultRule();

    expect(rule['場数']).toBe(1);
    expect(rule['クイタンあり']).toBe(true);
    expect(rule['赤牌']).toEqual({ m: 1, p: 1, s: 1 });
    expect(rule['最大同時和了数']).toBe(2);
    expect(rule['途中流局あり']).toBe(true);
    expect(rule['流し満貫あり']).toBe(true);
  });
});
