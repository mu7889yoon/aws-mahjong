import { useEffect, useState } from 'react';
import { GameController } from './game/GameController';
import { expandMeldTiles } from './game/tiles';
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

const controller = new GameController();

type SeatPosition = 'south' | 'west' | 'north' | 'east';

const seatOrder: Array<{ index: number; position: SeatPosition }> = [
  { index: 0, position: 'south' },
  { index: 3, position: 'west' },
  { index: 2, position: 'north' },
  { index: 1, position: 'east' }
];

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
  mini = false
}: {
  tile: string;
  hidden?: boolean;
  compact?: boolean;
  mini?: boolean;
}) {
  const art = hidden ? null : getTileArt(tile);
  const sizeClass = mini ? ' mini' : compact ? ' compact' : '';

  return (
    <span className={`tile${hidden ? ' hidden' : ''}${sizeClass}`}>
      {art ? <img alt={art.label} className="tile-image" src={art.imageUrl} title={art.label} /> : null}
      {!art && !hidden ? <span className="tile-fallback">{tile}</span> : null}
    </span>
  );
}

function MeldView({ meld, compact = false, mini = false }: { meld: UiMeld; compact?: boolean; mini?: boolean }) {
  return (
    <span className="meld">
      {meld.tiles.map((tile, index) => (
        <Tile key={`${meld.meld}-${tile}-${index}`} tile={tile} compact={compact} mini={mini} />
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
          <Tile tile={discard.tile} compact />
        </span>
      ))}
    </div>
  );
}

function HiddenRack({ count, vertical = false }: { count: number; vertical?: boolean }) {
  return (
    <div className={`hidden-rack${vertical ? ' vertical' : ''}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Tile key={`hidden-${vertical ? 'v' : 'h'}-${index}`} tile="_" hidden compact={vertical} />
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

function CenterDisplay({ snapshot }: { snapshot: UiSnapshot }) {
  return (
    <section className="center-display">
      <div className="center-machine">
        {seatOrder.map(({ index, position }) => (
          <ScorePlaque key={position} player={snapshot.players[index]} position={position} />
        ))}

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

        {snapshot.result ? (
          <div className={`result-overlay ${snapshot.result.type}`}>
            <strong>{snapshot.result.title}</strong>
            {snapshot.result.detailLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SouthSeat({ player }: { player: UiPlayerState }) {
  return (
    <section className={`seat-area seat-south${player.isTurn ? ' active' : ''}`}>
      <div className="south-discards">
        <DiscardGrid discards={player.discards} />
      </div>

      <div className="south-hand-band">
        {player.melds.length > 0 ? (
          <div className="south-melds">
            {player.melds.map((meld) => (
              <MeldView key={meld.meld} meld={meld} />
            ))}
          </div>
        ) : null}

        <div className="south-hand">
          {player.concealedTiles.map((tile, index) => (
            <Tile key={`${tile}-${index}`} tile={tile} />
          ))}
          {player.drawnTile ? <Tile tile={player.drawnTile} /> : null}
        </div>
      </div>
    </section>
  );
}

function NorthSeat({ player }: { player: UiPlayerState }) {
  return (
    <section className={`seat-area seat-north${player.isTurn ? ' active' : ''}`}>
      <HiddenRack count={player.concealedCount} />
      {player.melds.length > 0 ? (
        <div className="north-melds">
          {player.melds.map((meld) => (
            <MeldView key={meld.meld} meld={meld} compact />
          ))}
        </div>
      ) : null}
      <DiscardGrid discards={player.discards} />
    </section>
  );
}

function SideSeat({ player, position }: { player: UiPlayerState; position: 'west' | 'east' }) {
  return (
    <section className={`seat-area seat-${position}${player.isTurn ? ' active' : ''}`}>
      <div className="side-seat">
        <HiddenRack count={player.concealedCount} vertical />
        <div className="side-center">
          {player.melds.length > 0 ? (
            <div className="side-melds">
              {player.melds.map((meld) => (
                <MeldView key={meld.meld} meld={meld} compact />
              ))}
            </div>
          ) : null}
          <DiscardGrid discards={player.discards} vertical />
        </div>
      </div>
    </section>
  );
}

function WallDecoration({
  position,
  count
}: {
  position: 'top' | 'left' | 'right';
  count: number;
}) {
  return (
    <div className={`wall wall-${position}`}>
      {Array.from({ length: count }).map((_, index) => (
        <span className="wall-brick" key={`${position}-${index}`} />
      ))}
    </div>
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
  onSelect
}: {
  actions: LegalAction[];
  onSelect: (action: ActionSelection) => void;
}) {
  return (
    <div className="actions">
      {actions.map((action, index) => {
        if (action.type === 'discard') {
          return (
            <div className="action-group" key={`discard-${index}`}>
              <span className="action-title">打牌</span>
              <div className="option-grid">
                {action.options.map((option) => (
                  <ActionButton
                    key={`discard-${option.tile}-${option.tsumogiri ? 'tsumo' : 'hand'}`}
                    onClick={() => onSelect({ type: 'discard', tile: option.tsumogiri ? `${option.tile}_` : option.tile })}
                  >
                    <Tile tile={option.tile} compact />
                    <span>{option.tsumogiri ? 'ツモ切り' : option.tile}</span>
                  </ActionButton>
                ))}
              </div>
            </div>
          );
        }

        if (action.type === 'riichi') {
          return (
            <div className="action-group" key={`riichi-${index}`}>
              <span className="action-title">リーチ</span>
              <div className="option-grid">
                {action.options.map((option) => (
                  <ActionButton
                    key={`riichi-${option.tile}`}
                    tone="primary"
                    onClick={() => onSelect({ type: 'riichi', tile: option.tile })}
                  >
                    <Tile tile={option.tile} compact />
                    <span>{option.tile}</span>
                  </ActionButton>
                ))}
              </div>
            </div>
          );
        }

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
      <span>本場 {snapshot.honba}</span>
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
            ? '入力'
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

            <WallDecoration position="top" count={14} />
            <WallDecoration position="left" count={8} />
            <WallDecoration position="right" count={8} />

            <NorthSeat player={snapshot.players[2]} />
            <SideSeat player={snapshot.players[3]} position="west" />
            <SideSeat player={snapshot.players[1]} position="east" />
            <SouthSeat player={snapshot.players[0]} />

            <CenterDisplay snapshot={snapshot} />
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
