import React from 'react';
import { ActionType, StrikeResult, ScanResult, ActionLogEntry, ChainEvent } from '../types/game';
import { getStrikeResultDescription } from '../utils/gameLogic';
import { PROGRAM_EXPLORER_URL } from '../constants/game';
import './GameLog.css';

interface GameLogProps {
  actionLog: ActionLogEntry[];
  scans: ScanResult[];
  chainEvents?: ChainEvent[];
  gameId?: string | null;
}

const ProgramLink: React.FC = () => (
  <a
    href={PROGRAM_EXPLORER_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="program-link"
    title="View program on Explorer"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  </a>
);

const GameLog: React.FC<GameLogProps> = ({
  actionLog,
  scans,
  chainEvents = [],
  gameId,
}) => {
  const formatEntry = (entry: ActionLogEntry) => {
    const actor = entry.byPlayer ? 'You' : 'Opponent';
    const { action, result } = entry;

    if (action.type === ActionType.Strike) {
      return (
        <span>
          <strong>{actor}</strong> struck position {action.target}.{' '}
          {typeof result === 'number' && getStrikeResultDescription(result as StrikeResult)}
        </span>
      );
    }
    if (action.type === ActionType.Scan) {
      return (
        <span>
          <strong>{actor}</strong> scanned {action.isRow ? 'row' : 'column'} {action.index}.{' '}
          Found {result} unit{result !== 1 ? 's' : ''}.
        </span>
      );
    }
    if (action.type === ActionType.Relocate) {
      return (
        <span>
          <strong>{actor}</strong> relocated a unit.
        </span>
      );
    }
    return null;
  };

  const formatChainEvent = (event: ChainEvent) => {
    return (
      <div className="chain-event-content">
        <span className="chain-event-text">{event.description}</span>
      </div>
    );
  };

  const recentLogs = actionLog.slice(-10).reverse();

  return (
    <div className="game-log">
      <div className="log-title">
        Game Log
        <ProgramLink />
      </div>

      {gameId && (
        <div className="game-id-section">
          <span className="game-id-label">Game ID:</span>
          <code className="game-id-value" title={gameId}>
            {gameId.slice(0, 16)}...
          </code>
        </div>
      )}

      {chainEvents.length > 0 && (
        <div className="chain-events">
          <div className="chain-events-title">On-Chain Activity</div>
          {chainEvents.map((event, i) => (
            <div key={i} className={`chain-event chain-event-${event.type}`}>
              {formatChainEvent(event)}
            </div>
          ))}
        </div>
      )}

      <div className="log-entries">
        {recentLogs.length === 0 ? (
          <div className="log-entry empty">No actions yet</div>
        ) : (
          recentLogs.map((entry, i) => (
            <div
              key={actionLog.length - 1 - i}
              className={`log-entry ${entry.byPlayer ? 'player' : 'opponent'} ${i === 0 ? 'latest' : ''}`}
            >
              {formatEntry(entry)}
            </div>
          ))
        )}
      </div>

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
