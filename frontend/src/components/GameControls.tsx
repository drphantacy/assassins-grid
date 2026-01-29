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

      <div className="action-buttons">
        <button
          className={`action-btn ${selectedAction === ActionType.Strike ? 'active' : ''}`}
          onClick={() => onSelectAction(ActionType.Strike)}
          disabled={!isPlayerTurn}
        >
          Strike
        </button>
      </div>

      <div className="powerups-section">
        <div className="powerups-label">Power Ups (coming soon)</div>
        <div className="powerups-buttons">
          <button
            className={`action-btn scan-btn-action`}
            disabled
          >
            Scan
          </button>
          <button
            className={`action-btn relocate-btn`}
            disabled
          >
            Relocate ({relocatesRemaining})
          </button>
        </div>
      </div>

      {selectedAction === ActionType.Strike && isPlayerTurn && (
        <div className="action-hint">Click a cell on opponent's board to strike</div>
      )}
    </div>
  );
};

export default GameControls;
