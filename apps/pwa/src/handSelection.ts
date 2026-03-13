import type { ActionSelection, DiscardOption, LegalAction } from './game/types';

export type HandMode = 'discard' | 'riichi';

export function findAction<TType extends LegalAction['type']>(
  actions: LegalAction[],
  type: TType
): Extract<LegalAction, { type: TType }> | null {
  return (actions.find((action) => action.type === type) as Extract<LegalAction, { type: TType }> | undefined) ?? null;
}

export function resolveTileAction(
  options: DiscardOption[],
  mode: HandMode,
  tile: string,
  source: 'hand' | 'draw'
): ActionSelection | null {
  const sameTile = options.filter((option) => option.tile === tile);
  if (sameTile.length === 0) return null;

  if (mode === 'riichi') {
    return { type: 'riichi', tile: sameTile[0].tile };
  }

  const preferred =
    source === 'draw'
      ? (sameTile.find((option) => option.tsumogiri) ?? sameTile[0])
      : (sameTile.find((option) => !option.tsumogiri) ?? null);

  if (!preferred) return null;

  return {
    type: 'discard',
    tile: preferred.tsumogiri ? `${preferred.tile}_` : preferred.tile
  };
}
