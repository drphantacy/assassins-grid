import React from 'react';
import { GameAction, ActionType, StrikeResult, ScanResult } from '../types/game';
import { getStrikeResultDescription } from '../utils/gameLogic';
import './GameLog.css';

interface GameLogProps {
  lastAction: GameAction | null;
  lastResult: StrikeResult | number | null;
  scans: ScanResult[];
  isPlayerAction: boolean;
}

const GameLog: React.FC<GameLogProps> = ({
  lastAction,
  lastResult,
  scans,
  isPlayerAction,
}) => {
  const actor = isPlayerAction ? 'You' : 'Opponent';

  return (
    <div className="game-log">
      <div className="log-title">Game Log</div>

      {lastAction && (
        <div className="log-entry latest">
          {lastAction.type === ActionType.Strike && (
            <span>
              {actor} struck position {lastAction.target}.{' '}
              {typeof lastResult === 'number' && getStrikeResultDescription(lastResult as StrikeResult)}
            </span>
          )}
          {lastAction.type === ActionType.Scan && (
            <span>
              {actor} scanned {lastAction.isRow ? 'row' : 'column'} {lastAction.index}.{' '}
              Found {lastResult} unit{lastResult !== 1 ? 's' : ''}.
            </span>
          )}
          {lastAction.type === ActionType.Relocate && (
            <span>
              {actor} relocated a unit to position {lastAction.newPosition}.
            </span>
          )}
        </div>
      )}

      {scans.length > 0 && (
        <div className="scan-summary">
          <div className="scan-title">Your Scan History</div>
          {scans.map((scan, i) => (
            <div key={i} className="scan-entry">
              {scan.isRow ? 'Row' : 'Col'} {scan.index}: {scan.count} unit{scan.count !== 1 ? 's' : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameLog;
