import React from 'react';
import { GameStatus } from '../types/game';
import './GameControls.css';

interface GameControlsProps {
  status: GameStatus;
  isPlayerTurn: boolean;
  onPlayAgain?: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  status,
  isPlayerTurn,
  onPlayAgain,
}) => {
  if (status === GameStatus.Won || status === GameStatus.Lost) {
    const isWin = status === GameStatus.Won;
    return (
      <>
        <div className="game-controls">
          <div className={`turn-indicator ${isWin ? 'win' : 'lose'}`}>
            {isWin ? "Victory!" : "Defeat"}
          </div>
        </div>
        <div className="game-over-overlay">
          <div className={`game-result ${isWin ? 'win' : 'lose'}`}>
            <div className="result-title">{isWin ? "Victory!" : "Defeat"}</div>
            <div className="result-message">
              {isWin ? "You eliminated the enemy Assassin" : "Your Assassin was eliminated"}
            </div>
            {onPlayAgain && (
              <button className="play-again-btn" onClick={onPlayAgain}>
                Play Again
              </button>
            )}
          </div>
        </div>
      </>
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
        <div className="action-hint">Click a cell on opponent's board</div>
      )}
    </div>
  );
};

export default GameControls;
