import { useEffect, useState } from 'react';
import { GameController } from './game/GameController';
import { expandMeldTiles } from './game/tiles';
import { findAction, resolveTileAction } from './handSelection';
import { getTileArt } from './tileAssets';
import type {
  ActionSelection,
  LegalAction,
  MeldOption,
  UiDiscard,
  UiMeld,
  UiPlayerState,
  UiSnapshot
} from './game/types';
import type { HandMode } from './handSelection';

const controller = new GameController();

type TileOrientation = 'horizontal' | 'vertical';
type SeatPosition = 'south' | 'west' | 'north' | 'east';

const actionLabels: Record<string, string> = {
  chi: 'チー',
  pon: 'ポン',
  daiminkan: '大明槓',
  ankan: '暗槓',
  kakan: '加槓'
};

const pendingReasonLabels: Record<string, string> = {
  draw: 'ツモ後の選択',
  discard: '他家打牌への応答',
  call: '副露後の打牌',
  'rob-kong': '槍槓の応答'
};

function Tile({
  tile,
  hidden = false,
  compact = false,
  mini = false,
  orientation = 'horizontal'
}: {
  tile: string;
  hidden?: boolean;
  compact?: boolean;
  mini?: boolean;
  orientation?: TileOrientation;
}) {
  const art = hidden ? null : getTileArt(tile);
  const sizeClass = mini ? ' mini' : compact ? ' compact' : '';
  const orientationClass = orientation === 'vertical' ? ' vertical' : '';

  return (
    <span className={`tile${hidden ? ' hidden' : ''}${sizeClass}${orientationClass}`}>
      {art ? <img alt={art.label} className="tile-image" src={art.imageUrl} title={art.label} /> : null}
      {!art && !hidden ? <span className="tile-fallback">{tile}</span> : null}
    </span>
  );
}

function MeldView({
  meld,
  compact = false,
  mini = false,
  orientation = 'horizontal'
}: {
  meld: UiMeld;
  compact?: boolean;
  mini?: boolean;
  orientation?: TileOrientation;
}) {
  return (
    <span className="meld">
      {meld.tiles.map((tile, index) => (
        <Tile
          key={`${meld.meld}-${tile}-${index}`}
          tile={tile}
          compact={compact}
          mini={mini}
          orientation={orientation}
        />
      ))}
    </span>
  );
}

function DiscardGrid({
  discards,
  vertical = false
}: {
  discards: UiDiscard[];
  vertical?: boolean;
}) {
  return (
    <div className={`discard-grid${vertical ? ' vertical' : ''}`}>
      {discards.map((discard, index) => (
        <span className={`discard${discard.called ? ' called' : ''}`} key={`${discard.tile}-${index}`}>
          <Tile tile={discard.tile} compact orientation={vertical ? 'vertical' : 'horizontal'} />
        </span>
      ))}
    </div>
  );
}

function HiddenRack({
  count,
  position
}: {
  count: number;
  position: 'north' | 'west' | 'east';
}) {
  return (
    <div className={`hidden-rack ${position}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Tile
          key={`${position}-hidden-${index}`}
          tile="_"
          hidden
          compact
          orientation={position === 'north' ? 'horizontal' : 'vertical'}
        />
      ))}
    </div>
  );
}

function ScorePlaque({
  player,
  position
}: {
  player: UiPlayerState;
  position: SeatPosition;
}) {
  return (
    <div className={`score-plaque ${position}${player.isTurn ? ' active' : ''}`}>
      <span className="score-plaque-wind">{player.wind}家</span>
      <strong>{player.score.toLocaleString()}</strong>
      <span className="score-plaque-label">{player.label}</span>
      {player.riichi ? <span className="score-plaque-badge">立直</span> : null}
    </div>
  );
}

function CorePond({
  player,
  position
}: {
  player: UiPlayerState;
  position: SeatPosition;
}) {
  const vertical = position === 'west' || position === 'east';

  return (
    <section className={`core-pond ${position}${player.isTurn ? ' active' : ''}`}>
      {(position === 'north' || position === 'west') && player.melds.length > 0 ? (
        <div className={`pond-melds ${vertical ? ' vertical' : ''}`}>
          {player.melds.map((meld) => (
            <MeldView
              key={meld.meld}
              meld={meld}
              compact
              orientation={vertical ? 'vertical' : 'horizontal'}
            />
          ))}
        </div>
      ) : null}

      <DiscardGrid discards={player.discards} vertical={vertical} />

      {(position === 'south' || position === 'east') && player.melds.length > 0 ? (
        <div className={`pond-melds ${vertical ? ' vertical' : ''}`}>
          {player.melds.map((meld) => (
            <MeldView
              key={meld.meld}
              meld={meld}
              compact
              orientation={vertical ? 'vertical' : 'horizontal'}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CenterMachine({ snapshot }: { snapshot: UiSnapshot }) {
  return (
    <section className="center-machine">
      <ScorePlaque player={snapshot.players[2]} position="north" />
      <ScorePlaque player={snapshot.players[3]} position="west" />
      <ScorePlaque player={snapshot.players[1]} position="east" />
      <ScorePlaque player={snapshot.players[0]} position="south" />

      <div className="machine-shell">
        <div className="machine-screen">
          <span className="machine-round">{snapshot.roundLabel}</span>
          <strong className="machine-count">{snapshot.remainingTiles}</strong>
          <span className="machine-caption">
            {snapshot.honba}本場 / 供託 {snapshot.riichiSticks}
          </span>
        </div>
        <div className="machine-dora">
          <span>ドラ</span>
          <div className="machine-dora-tiles">
            {(snapshot.doraIndicators.length > 0 ? snapshot.doraIndicators : ['-']).map((tile, index) =>
              tile === '-' ? (
                <span className="machine-empty" key={`dora-empty-${index}`}>
                  -
                </span>
              ) : (
                <Tile key={`dora-${tile}-${index}`} tile={tile} mini />
              )
            )}
          </div>
        </div>
      </div>

      {snapshot.result ? (
        <div className={`result-overlay ${snapshot.result.type}`}>
          <strong>{snapshot.result.title}</strong>
          {snapshot.result.detailLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SouthHand({
  player,
  handMode,
  getTileAction,
  interactionEnabled
}: {
  player: UiPlayerState;
  handMode: HandMode;
  getTileAction: (tile: string, source: 'hand' | 'draw') => ActionSelection | null;
  interactionEnabled: boolean;
}) {
  const renderTile = (tile: string, index: number, source: 'hand' | 'draw') => {
    const action = getTileAction(tile, source);
    const selectable = Boolean(action);

    return (
      <button
        aria-label={`${action?.type === 'riichi' ? 'リーチ' : '打牌'} ${tile}`}
        className={`south-hand-tile${selectable ? ' selectable' : ''}${handMode === 'riichi' && selectable ? ' riichi-mode' : ''}${interactionEnabled && !selectable ? ' muted' : ''}`}
        disabled={!selectable}
        key={`${source}-${tile}-${index}`}
        onClick={() => {
          if (action) controller.dispatchHumanAction(action);
        }}
        type="button"
      >
        <Tile tile={tile} />
      </button>
    );
  };

  return (
    <section className="south-hand-area">
      <div className="south-hand">
        <div className="south-hand-main">
          {player.concealedTiles.map((tile, index) => renderTile(tile, index, 'hand'))}
        </div>
        {player.drawnTile ? (
          <div className="south-hand-draw">
            {renderTile(player.drawnTile, 0, 'draw')}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ActionButton({
  tone = 'secondary',
  onClick,
  children
}: {
  tone?: 'secondary' | 'primary' | 'danger';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={`action-button ${tone}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function ActionPanel({
  actions,
  handMode,
  onHandModeChange,
  onSelect
}: {
  actions: LegalAction[];
  handMode: HandMode;
  onHandModeChange: (mode: HandMode) => void;
  onSelect: (action: ActionSelection) => void;
}) {
  const discardAction = findAction(actions, 'discard');
  const riichiAction = findAction(actions, 'riichi');
  const panelActions = actions.filter((action) => action.type !== 'discard' && action.type !== 'riichi');

  return (
    <div className="actions">
      {discardAction || riichiAction ? (
        <div className="action-group hand-selection-panel">
          <span className="action-title">手牌から選択</span>
          <div className="hand-selection-copy">
            {handMode === 'riichi' ? '下の手牌をクリックしてリーチ' : '下の手牌をクリックして打牌'}
          </div>
          {riichiAction ? (
            <div className="option-grid">
              <ActionButton
                onClick={() => onHandModeChange('discard')}
                tone={handMode === 'discard' ? 'primary' : 'secondary'}
              >
                <span>通常打牌</span>
              </ActionButton>
              <ActionButton
                onClick={() => onHandModeChange('riichi')}
                tone={handMode === 'riichi' ? 'danger' : 'secondary'}
              >
                <span>リーチ宣言</span>
              </ActionButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {panelActions.map((action, index) => {
        if (
          action.type === 'chi' ||
          action.type === 'pon' ||
          action.type === 'daiminkan' ||
          action.type === 'ankan' ||
          action.type === 'kakan'
        ) {
          return (
            <div className="action-group" key={`${action.type}-${index}`}>
              <span className="action-title">{actionLabels[action.type] ?? action.type}</span>
              <div className="option-grid">
                {action.options.map((option: MeldOption) => (
                  <ActionButton
                    key={`${action.type}-${option.meld}`}
                    onClick={() => onSelect({ type: action.type, meld: option.meld } as ActionSelection)}
                  >
                    <span className="action-meld-run">
                      {expandMeldTiles(option.meld).map((tile, tileIndex) => (
                        <Tile key={`${option.meld}-${tile}-${tileIndex}`} tile={tile} mini />
                      ))}
                    </span>
                  </ActionButton>
                ))}
              </div>
            </div>
          );
        }

        if (action.type === 'pass') {
          return (
            <ActionButton key="pass" onClick={() => onSelect({ type: 'pass' })}>
              <span>見送る</span>
            </ActionButton>
          );
        }

        if (action.type === 'abortiveDraw') {
          return (
            <ActionButton key="abortive-draw" onClick={() => onSelect({ type: 'abortiveDraw' })}>
              <span>九種九牌</span>
            </ActionButton>
          );
        }

        if (action.type === 'ron' || action.type === 'tsumo') {
          return (
            <ActionButton key={action.type} tone="danger" onClick={() => onSelect({ type: action.type })}>
              <span>{action.type === 'ron' ? 'ロン' : 'ツモ'}</span>
            </ActionButton>
          );
        }

        return null;
      })}
    </div>
  );
}

function InfoPanel({ snapshot }: { snapshot: UiSnapshot }) {
  return (
    <aside className="info-panel">
      <p className="panel-kicker">AWS Mahjong</p>
      <strong>{snapshot.roundLabel}</strong>
      <span>残り {snapshot.remainingTiles} 枚</span>
      <span>{snapshot.honba}本場</span>
      <span>供託 {snapshot.riichiSticks}</span>
    </aside>
  );
}

function ControlRail({ snapshot }: { snapshot: UiSnapshot }) {
  return (
    <aside className="control-rail">
      <button className="rail-button" onClick={() => controller.startGame()} type="button">
        新局
      </button>
      <div className="rail-card">
        <span>状態</span>
        <strong>
          {snapshot.pendingAction
            ? '入力待ち'
            : snapshot.status === 'finished'
              ? '終局'
              : '進行中'}
        </strong>
      </div>
      <div className="rail-card">
        <span>ドラ</span>
        <strong>{snapshot.doraIndicators.join(' ') || '-'}</strong>
      </div>
    </aside>
  );
}

export function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<UiSnapshot>(controller.getSnapshot());
  const [handMode, setHandMode] = useState<HandMode>('discard');

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setSnapshot(controller.getSnapshot());
    });

    controller.startGame();

    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    const pending = snapshot.pendingAction;
    if (!pending) {
      setHandMode('discard');
      return;
    }

    const hasRiichi = pending.actions.some((action) => action.type === 'riichi');
    setHandMode((current) => (current === 'riichi' && !hasRiichi ? 'discard' : current));
  }, [snapshot.pendingAction]);

  const pendingAction = snapshot.pendingAction;
  const discardAction = pendingAction ? findAction(pendingAction.actions, 'discard') : null;
  const riichiAction = pendingAction ? findAction(pendingAction.actions, 'riichi') : null;
  const handSelectableOptions = handMode === 'riichi' ? riichiAction?.options ?? [] : discardAction?.options ?? [];
  const handInteractionEnabled = handSelectableOptions.length > 0;

  const getSouthTileAction = (tile: string, source: 'hand' | 'draw'): ActionSelection | null =>
    handInteractionEnabled ? resolveTileAction(handSelectableOptions, handMode, tile, source) : null;

  const statusText = snapshot.pendingAction
    ? pendingReasonLabels[snapshot.pendingAction.reason] ?? snapshot.pendingAction.reason
    : snapshot.status === 'finished'
      ? '対局終了'
      : 'CPU の応答待ち';

  return (
    <main className="app-shell">
      <section className="table-stage">
        <div className="table-rim">
          <div className="table-felt">
            <InfoPanel snapshot={snapshot} />
            <ControlRail snapshot={snapshot} />

            <HiddenRack count={snapshot.players[2].concealedCount} position="north" />
            <HiddenRack count={snapshot.players[3].concealedCount} position="west" />
            <HiddenRack count={snapshot.players[1].concealedCount} position="east" />

            <div className="table-core">
              <CorePond player={snapshot.players[2]} position="north" />
              <CorePond player={snapshot.players[3]} position="west" />
              <CorePond player={snapshot.players[1]} position="east" />
              <CorePond player={snapshot.players[0]} position="south" />
              <CenterMachine snapshot={snapshot} />
            </div>

            <SouthHand
              getTileAction={getSouthTileAction}
              handMode={handMode}
              interactionEnabled={handInteractionEnabled}
              player={snapshot.players[0]}
            />
          </div>
        </div>
      </section>

      <section className="command-dock">
        <div className="dock-copy">
          <p className="panel-kicker">操作</p>
          <strong>{statusText}</strong>
          {!snapshot.pendingAction && snapshot.result ? <span>{snapshot.result.title}</span> : null}
        </div>
        {snapshot.pendingAction ? (
          <ActionPanel
            actions={snapshot.pendingAction.actions}
            handMode={handMode}
            onHandModeChange={setHandMode}
            onSelect={(action) => {
              controller.dispatchHumanAction(action);
            }}
          />
        ) : (
          <div className="dock-idle">
            <span>入力が必要になるとここに選択肢を表示します。</span>
          </div>
        )}
      </section>
    </main>
  );
}
