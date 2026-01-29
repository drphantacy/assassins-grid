import React, { useState } from 'react';
import { ActionType, GameStatus, BoardState } from '../types/game';
import { useGame } from '../hooks/useGame';
import { AIDifficulty } from '../ai/opponent';
import GameBoard from './GameBoard';
import GameControls from './GameControls';
import GameLog from './GameLog';
import './Game.css';

const Game: React.FC = () => {
  const {
    gameState,
    startGame,
    placeUnits,
    performStrike,
    performScan,
    performRelocate,
    resetGame,
  } = useGame();

  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [placingUnit, setPlacingUnit] = useState<number | null>(0);
  const [setupBoard, setSetupBoard] = useState<BoardState | null>(null);

  const handleStartGame = (difficulty: AIDifficulty) => {
    setIsTransitioning(true);
    setTimeout(() => {
      startGame(difficulty);
      setSetupBoard({
        assassinPos: -1,
        guard1Pos: -1,
        guard2Pos: -1,
        decoy1Pos: -1,
        decoy2Pos: -1,
      });
      setPlacingUnit(0);
      setSelectedAction(null);
      setSelectedUnit(null);
      setIsTransitioning(false);
    }, 600);
  };

  const handleConfirmPlacement = () => {
    if (setupBoard) {
      placeUnits(setupBoard);
      setSetupBoard(null);
    }
  };

  const handlePlaceUnit = (pos: number) => {
    if (!setupBoard || placingUnit === null) return;

    const occupied = [
      setupBoard.assassinPos,
      setupBoard.guard1Pos,
      setupBoard.guard2Pos,
      setupBoard.decoy1Pos,
      setupBoard.decoy2Pos,
    ].filter(p => p !== -1);

    if (occupied.includes(pos)) return;

    const newBoard = { ...setupBoard };
    switch (placingUnit) {
      case 0: newBoard.assassinPos = pos; break;
      case 1: newBoard.guard1Pos = pos; break;
      case 2: newBoard.guard2Pos = pos; break;
      case 3: newBoard.decoy1Pos = pos; break;
      case 4: newBoard.decoy2Pos = pos; break;
    }

    setSetupBoard(newBoard);

    const nextUnplaced = [
      newBoard.assassinPos,
      newBoard.guard1Pos,
      newBoard.guard2Pos,
      newBoard.decoy1Pos,
      newBoard.decoy2Pos,
    ].findIndex((p, i) => p === -1 && i > placingUnit);

    if (nextUnplaced !== -1) {
      setPlacingUnit(nextUnplaced);
    } else {
      const anyUnplaced = [
        newBoard.assassinPos,
        newBoard.guard1Pos,
        newBoard.guard2Pos,
        newBoard.decoy1Pos,
        newBoard.decoy2Pos,
      ].findIndex(p => p === -1);
      setPlacingUnit(anyUnplaced !== -1 ? anyUnplaced : null);
    }
  };

  const isAllPlaced = () => {
    if (!setupBoard) return false;
    return setupBoard.assassinPos !== -1 &&
           setupBoard.guard1Pos !== -1 &&
           setupBoard.guard2Pos !== -1 &&
           setupBoard.decoy1Pos !== -1 &&
           setupBoard.decoy2Pos !== -1;
  };

  const getUnitName = (index: number) => {
    switch (index) {
      case 0: return 'Assassin';
      case 1: return 'Guard 1';
      case 2: return 'Guard 2';
      case 3: return 'Decoy 1';
      case 4: return 'Decoy 2';
      default: return '';
    }
  };

  const getUnitPlaced = (index: number) => {
    if (!setupBoard) return false;
    const positions = [
      setupBoard.assassinPos,
      setupBoard.guard1Pos,
      setupBoard.guard2Pos,
      setupBoard.decoy1Pos,
      setupBoard.decoy2Pos,
    ];
    return positions[index] !== -1;
  };

  const handleOpponentCellClick = (pos: number) => {
    if (!gameState || !gameState.isPlayerTurn) return;

    if (selectedAction === ActionType.Strike) {
      if (!gameState.playerRevealed.strikes.has(pos)) {
        performStrike(pos);
      }
    }
  };

  const handlePlayerCellClick = (pos: number) => {
    if (!gameState || !gameState.isPlayerTurn) return;

    if (selectedAction === ActionType.Relocate) {
      const board = gameState.playerBoard;
      const unitPositions = [
        board.assassinPos,
        board.guard1Pos,
        board.guard2Pos,
        board.decoy1Pos,
        board.decoy2Pos,
      ];

      const unitIndex = unitPositions.indexOf(pos);
      if (unitIndex !== -1 && unitPositions[unitIndex] !== -1) {
        setSelectedUnit(unitIndex);
      } else if (selectedUnit !== null && !unitPositions.includes(pos)) {
        performRelocate(selectedUnit, pos);
        setSelectedUnit(null);
        setSelectedAction(null);
      }
    }
  };

  const handleScanRow = (index: number) => {
    performScan(true, index);
    setSelectedAction(null);
  };

  const handleScanCol = (index: number) => {
    performScan(false, index);
    setSelectedAction(null);
  };

  const getHighlightedCells = (): number[] => {
    if (!gameState || selectedAction !== ActionType.Relocate || selectedUnit === null) {
      return [];
    }
    const board = gameState.playerBoard;
    const occupied = [
      board.assassinPos,
      board.guard1Pos,
      board.guard2Pos,
      board.decoy1Pos,
      board.decoy2Pos,
    ].filter(p => p !== -1);

    const available: number[] = [];
    for (let i = 0; i < 25; i++) {
      if (!occupied.includes(i)) {
        available.push(i);
      }
    }
    return available;
  };

  const getSelectedPlayerCell = (): number | null => {
    if (!gameState || selectedUnit === null) return null;
    const board = gameState.playerBoard;
    const positions = [
      board.assassinPos,
      board.guard1Pos,
      board.guard2Pos,
      board.decoy1Pos,
      board.decoy2Pos,
    ];
    return positions[selectedUnit];
  };

  const renderBadge = () => (
    <a
      href="https://aleo.org"
      target="_blank"
      rel="noopener noreferrer"
      className="built-with-badge"
    >
      <img src="/images/built-with-aleo-badge-dark.png" alt="Built with Aleo" />
    </a>
  );

  if (!gameState) {
    return (
      <div className="game-container menu-screen">
        <div className="menu">
          <div className="menu-top">
            <h1 className="menu-title">Assassins Grid</h1>
            <p className="menu-subtitle">A ZK Hidden Information Strategy Game</p>
          </div>
          <div className={`menu-bottom ${isTransitioning ? 'expanding' : ''}`}>
            <div className="difficulty-select">
              <h3>Select Difficulty</h3>
              <button onClick={() => handleStartGame('easy')}>Easy</button>
              <button onClick={() => handleStartGame('medium')}>Medium</button>
              <button onClick={() => handleStartGame('hard')}>Hard</button>
            </div>
          </div>
        </div>
        {renderBadge()}
      </div>
    );
  }

  if (gameState.status === GameStatus.Setup && setupBoard) {
    return (
      <div className="game-container">
        <div className="setup-screen">
          <h2>Place Your Units</h2>
          <p>Drag pieces onto the board</p>
          <div className="setup-layout">
            <div className="unit-tray">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`unit-piece ${getUnitPlaced(i) ? 'placed' : ''} ${placingUnit === i ? 'selected' : ''}`}
                  draggable={!getUnitPlaced(i)}
                  onDragStart={(e) => {
                    setPlacingUnit(i);
                    e.dataTransfer.setData('text/plain', String(i));
                  }}
                  onClick={() => !getUnitPlaced(i) && setPlacingUnit(i)}
                >
                  <span className="unit-icon">
                    {i === 0 ? '🗡️' : i <= 2 ? '🛡️' : '👤'}
                  </span>
                  <span className="unit-label">{getUnitName(i)}</span>
                </div>
              ))}
            </div>
            <GameBoard
              board={setupBoard}
              isOwn={true}
              revealed={{ strikes: new Map(), scans: [] }}
              onCellClick={handlePlaceUnit}
              onCellDrop={(pos) => handlePlaceUnit(pos)}
              disabled={false}
            />
          </div>
          <button
            className="start-btn"
            onClick={handleConfirmPlacement}
            disabled={!isAllPlaced()}
          >
            Start Game
          </button>
        </div>
        {renderBadge()}
      </div>
    );
  }

  const isGameOver = gameState.status === GameStatus.Won || gameState.status === GameStatus.Lost;

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-header-title">Assassins Grid</h1>
        <span className="turn-count">Turn {gameState.turnNumber}</span>
        {isGameOver && (
          <button className="reset-btn" onClick={resetGame}>
            Play Again
          </button>
        )}
      </div>

      <div className="game-area">
        <div className="boards">
          <GameBoard
            board={null}
            revealed={gameState.playerRevealed}
            isOwn={false}
            onCellClick={handleOpponentCellClick}
            disabled={!gameState.isPlayerTurn || selectedAction !== ActionType.Strike}
          />
          <GameBoard
            board={gameState.playerBoard}
            revealed={gameState.opponentRevealed}
            isOwn={true}
            onCellClick={handlePlayerCellClick}
            selectedCell={getSelectedPlayerCell()}
            highlightedCells={getHighlightedCells()}
            disabled={!gameState.isPlayerTurn || selectedAction !== ActionType.Relocate}
          />
        </div>

        <div className="side-panel">
          <GameControls
            status={gameState.status}
            isPlayerTurn={gameState.isPlayerTurn}
            selectedAction={selectedAction}
            onSelectAction={setSelectedAction}
            relocatesRemaining={gameState.playerRelocatesRemaining}
            onScanRow={handleScanRow}
            onScanCol={handleScanCol}
          />
          <GameLog
            lastAction={gameState.lastAction}
            lastResult={gameState.lastResult}
            scans={gameState.playerRevealed.scans}
            isPlayerAction={!gameState.isPlayerTurn}
          />
        </div>
      </div>
      {renderBadge()}
    </div>
  );
};

export default Game;
