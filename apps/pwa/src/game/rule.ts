import MajiangCore from '@kobalab/majiang-core';

export function buildDefaultRule(): Record<string, unknown> {
  return MajiangCore.rule({
    場数: 1,
    クイタンあり: true,
    赤牌: { m: 1, p: 1, s: 1 },
    最大同時和了数: 2,
    途中流局あり: true,
    流し満貫あり: true,
    ノーテン宣言あり: false,
    ノーテン罰あり: true,
    連荘方式: 2,
    トビ終了あり: true,
    オーラス止めあり: true,
    延長戦方式: 1,
    一発あり: true,
    裏ドラあり: true,
    カンドラあり: true,
    カン裏あり: true,
    カンドラ後乗せ: true,
    ツモ番なしリーチあり: false,
    リーチ後暗槓許可レベル: 2,
    役満の複合あり: true,
    ダブル役満あり: true,
    数え役満あり: true,
    役満パオあり: true,
    切り上げ満貫あり: false
  });
}
