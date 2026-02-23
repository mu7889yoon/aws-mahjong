/**
 * AWS麻雀牌 - 型定義のテスト
 * 
 * テストフレームワークのセットアップ確認用テスト
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  TileType,
  VALID_TILE_TYPES,
  TILE_NUMBER_RANGES,
  HONOR_TILE_NAMES,
  TILE_TYPE_NAMES,
} from '../src/types';

describe('Types - 基本テスト', () => {
  describe('定数の検証', () => {
    it('VALID_TILE_TYPES は4種類の牌タイプを含む', () => {
      expect(VALID_TILE_TYPES).toHaveLength(4);
      expect(VALID_TILE_TYPES).toContain('m');
      expect(VALID_TILE_TYPES).toContain('p');
      expect(VALID_TILE_TYPES).toContain('s');
      expect(VALID_TILE_TYPES).toContain('z');
    });

    it('TILE_NUMBER_RANGES は各牌タイプの有効範囲を定義', () => {
      // 数牌（萬子、筒子、索子）は1-9
      expect(TILE_NUMBER_RANGES.m).toEqual({ min: 1, max: 9 });
      expect(TILE_NUMBER_RANGES.p).toEqual({ min: 1, max: 9 });
      expect(TILE_NUMBER_RANGES.s).toEqual({ min: 1, max: 9 });
      // 字牌は1-7
      expect(TILE_NUMBER_RANGES.z).toEqual({ min: 1, max: 7 });
    });

    it('HONOR_TILE_NAMES は7種類の字牌名を定義', () => {
      expect(Object.keys(HONOR_TILE_NAMES)).toHaveLength(7);
      expect(HONOR_TILE_NAMES[1]).toBe('東');
      expect(HONOR_TILE_NAMES[2]).toBe('南');
      expect(HONOR_TILE_NAMES[3]).toBe('西');
      expect(HONOR_TILE_NAMES[4]).toBe('北');
      expect(HONOR_TILE_NAMES[5]).toBe('白');
      expect(HONOR_TILE_NAMES[6]).toBe('發');
      expect(HONOR_TILE_NAMES[7]).toBe('中');
    });

    it('TILE_TYPE_NAMES は各牌タイプの日本語名を定義', () => {
      expect(TILE_TYPE_NAMES.m).toBe('萬子');
      expect(TILE_TYPE_NAMES.p).toBe('筒子');
      expect(TILE_TYPE_NAMES.s).toBe('索子');
      expect(TILE_TYPE_NAMES.z).toBe('字牌');
    });
  });
});

describe('Types - プロパティベーステスト (fast-check)', () => {
  /**
   * **Feature: aws-mahjong-tiles, Property: 牌タイプの有効性**
   * 
   * すべての有効な牌タイプは VALID_TILE_TYPES に含まれる
   */
  it('有効な牌タイプは常に VALID_TILE_TYPES に含まれる', () => {
    // 有効な牌タイプのジェネレーター
    const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

    fc.assert(
      fc.property(tileTypeArb, (tileType) => {
        return VALID_TILE_TYPES.includes(tileType);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: aws-mahjong-tiles, Property: 牌番号の範囲**
   * 
   * 各牌タイプに対して、有効な番号範囲が正しく定義されている
   */
  it('各牌タイプの番号範囲は min <= max を満たす', () => {
    const tileTypeArb = fc.constantFrom<TileType>('m', 'p', 's', 'z');

    fc.assert(
      fc.property(tileTypeArb, (tileType) => {
        const range = TILE_NUMBER_RANGES[tileType];
        return range.min <= range.max && range.min >= 1;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: aws-mahjong-tiles, Property: 字牌名の完全性**
   * 
   * 字牌の有効な番号（1-7）すべてに対応する名前が存在する
   */
  it('字牌の有効な番号すべてに名前が定義されている', () => {
    const honorNumberArb = fc.integer({ min: 1, max: 7 });

    fc.assert(
      fc.property(honorNumberArb, (number) => {
        return HONOR_TILE_NAMES[number] !== undefined;
      }),
      { numRuns: 100 }
    );
  });
});
