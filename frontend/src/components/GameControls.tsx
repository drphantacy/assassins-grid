import React from 'react';
import { ActionType, GameStatus } from '../types/game';
import './GameControls.css';

interface GameControlsProps {
  status: GameStatus;
  isPlayerTurn: boolean;
  selectedAction: ActionType | null;
  onSelectAction: (action: ActionType | null) => void;
  relocatesRemaining: number;
  onScanRow: (index: number) => void;
  onScanCol: (index: number) => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  status,
  isPlayerTurn,
  selectedAction,
  onSelectAction,
  relocatesRemaining,
  onScanRow,
  onScanCol,
}) => {
  if (status === GameStatus.Won) {
    return (
      <div className="game-controls">
        <div className="game-result win">You eliminated the Assassin!</div>
      </div>
    );
  }

  if (status === GameStatus.Lost) {
    return (
      <div className="game-controls">
        <div className="game-result lose">Your Assassin was eliminated!</div>
      </div>
    );
  }

  if (status !== GameStatus.Playing) {
    return null;
  }

  return (
    <div className="game-controls">
      <div className={`turn-indicator ${!isPlayerTurn ? 'waiting' : ''}`}>
        {isPlayerTurn ? "Your Turn" : "Opponent's Turn..."}
      </div>

      {isPlayerTurn && (
        <>
          <div className="action-buttons">
            <button
              className={`action-btn ${selectedAction === ActionType.Strike ? 'active' : ''}`}
              onClick={() => onSelectAction(selectedAction === ActionType.Strike ? null : ActionType.Strike)}
            >
              Strike
            </button>
            <button
              className={`action-btn scan-btn-action ${selectedAction === ActionType.Scan ? 'active' : ''}`}
              onClick={() => onSelectAction(selectedAction === ActionType.Scan ? null : ActionType.Scan)}
            >
              Scan
            </button>
            <button
              className={`action-btn relocate-btn ${selectedAction === ActionType.Relocate ? 'active' : ''}`}
              onClick={() => onSelectAction(selectedAction === ActionType.Relocate ? null : ActionType.Relocate)}
              disabled={relocatesRemaining <= 0}
            >
              Relocate ({relocatesRemaining})
            </button>
          </div>

          {selectedAction === ActionType.Strike && (
            <div className="action-hint">Click a cell on opponent's board to strike</div>
          )}

          {selectedAction === ActionType.Scan && (
            <div className="scan-controls">
              <div className="scan-section">
                <span>Scan Row:</span>
                {[0, 1, 2, 3, 4].map(i => (
                  <button key={`row-${i}`} className="scan-btn" onClick={() => onScanRow(i)}>
                    {i}
                  </button>
                ))}
              </div>
              <div className="scan-section">
                <span>Scan Col:</span>
                {[0, 1, 2, 3, 4].map(i => (
                  <button key={`col-${i}`} className="scan-btn" onClick={() => onScanCol(i)}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedAction === ActionType.Relocate && (
            <div className="action-hint">Click one of your units, then click an empty cell</div>
          )}
        </>
      )}
    </div>
  );
};

export default GameControls;
