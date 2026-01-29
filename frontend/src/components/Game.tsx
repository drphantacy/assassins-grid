import React, { useState, useRef, useEffect } from 'react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { ActionType, GameStatus, BoardState } from '../types/game';
import { useGame } from '../hooks/useGame';
import { useContract } from '../hooks/useContract';
import { AIDifficulty } from '../ai/opponent';
import GameBoard from './GameBoard';
import GameControls from './GameControls';
import GameLog from './GameLog';
import './Game.css';

type GameMode = 'ai' | 'online';

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

  const { connected, createGame } = useContract();

  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [placingUnit, setPlacingUnit] = useState<number | null>(0);
  const [setupBoard, setSetupBoard] = useState<BoardState | null>(null);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty | null>(null);
  const [opponentAddress, setOpponentAddress] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Watch for wallet disconnect - return to menu
  useEffect(() => {
    if (!connected && gameMode === 'online' && (gameState || setupBoard)) {
      resetGame();
      handleBackToMenu();
    }
  }, [connected]);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/audio/background-music.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startMusic = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleStartGame = () => {
    startMusic();
    if (gameMode === 'ai' && selectedDifficulty) {
      setIsTransitioning(true);
      setTimeout(() => {
        startGame(selectedDifficulty);
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
    } else if (gameMode === 'online') {
      setIsTransitioning(true);
      setTimeout(() => {
        setSetupBoard({
          assassinPos: -1,
          guard1Pos: -1,
          guard2Pos: -1,
          decoy1Pos: -1,
          decoy2Pos: -1,
        });
        setPlacingUnit(0);
        setIsTransitioning(false);
      }, 600);
    }
  };

  const handleConfirmPlacement = () => {
    if (setupBoard) {
      placeUnits(setupBoard);
      setSetupBoard(null);
    }
  };

  const handlePlaceUnit = (pos: number, fromPos?: number) => {
    if (!setupBoard) return;

    const occupied = [
      setupBoard.assassinPos,
      setupBoard.guard1Pos,
      setupBoard.guard2Pos,
      setupBoard.decoy1Pos,
      setupBoard.decoy2Pos,
    ].filter(p => p !== -1);

    // If relocating from board, find which unit is at fromPos
    if (fromPos !== undefined) {
      const unitIndex = [
        setupBoard.assassinPos,
        setupBoard.guard1Pos,
        setupBoard.guard2Pos,
        setupBoard.decoy1Pos,
        setupBoard.decoy2Pos,
      ].indexOf(fromPos);

      if (unitIndex === -1) return;

      // Can't drop on another unit (unless it's the same position)
      if (pos !== fromPos && occupied.includes(pos)) return;

      const newBoard = { ...setupBoard };
      switch (unitIndex) {
        case 0: newBoard.assassinPos = pos; break;
        case 1: newBoard.guard1Pos = pos; break;
        case 2: newBoard.guard2Pos = pos; break;
        case 3: newBoard.decoy1Pos = pos; break;
        case 4: newBoard.decoy2Pos = pos; break;
      }
      setSetupBoard(newBoard);
      return;
    }

    // Placing from tray
    if (placingUnit === null) return;
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

  const renderSoundToggle = () => (
    <button
      className={`sound-toggle ${isMuted ? 'muted' : ''}`}
      onClick={toggleMute}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );

  const handleCreateOnlineGame = async () => {
    if (!setupBoard || !opponentAddress) return;

    setIsCreatingGame(true);
    try {
      const result = await createGame(
        {
          assassinPos: setupBoard.assassinPos,
          guard1Pos: setupBoard.guard1Pos,
          guard2Pos: setupBoard.guard2Pos,
          decoy1Pos: setupBoard.decoy1Pos,
          decoy2Pos: setupBoard.decoy2Pos,
        },
        opponentAddress
      );
      setCreatedGameId(result.gameId);
      setTxId(result.txId as string);
    } catch (err) {
      console.error('Failed to create game:', err);
      alert('Failed to create game: ' + (err as Error).message);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleBackToMenu = () => {
    setGameMode(null);
    setSelectedDifficulty(null);
    setSetupBoard(null);
    setCreatedGameId(null);
    setTxId(null);
    setOpponentAddress('');
  };

  if (!gameState && !setupBoard) {
    return (
      <div className={`game-container menu-screen ${isTransitioning ? 'transitioning' : ''}`}>
        {/* Floating decorative board */}
        <div className="menu-board-container">
          <div className="menu-board">
            {Array.from({ length: 25 }, (_, i) => (
              <div
                key={i}
                className={`menu-cell ${[0, 6, 12, 18, 24].includes(i) ? 'accent' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
          <div className="menu-board-glow" />
        </div>

        {/* Header */}
        <div className="menu-header">
          <h1 className="menu-title">Assassins Grid</h1>
          <p className="menu-subtitle">A ZK Hidden Information Strategy Game</p>
        </div>

        {/* Controls overlay */}
        <div className="menu-controls">
          {!connected ? (
            <div className="connect-prompt">
              <p className="connect-hint">Connect your wallet to play</p>
              <div className="menu-wallet">
                <WalletMultiButton />
              </div>
            </div>
          ) : (
            <>
              <div className="menu-wallet connected">
                <WalletMultiButton />
              </div>

              <div className="mode-select">
                <div className="mode-buttons">
                  <button
                    className={gameMode === 'ai' ? 'selected' : ''}
                    onClick={() => { setGameMode('ai'); setSelectedDifficulty(null); }}
                  >
                    Play vs AI
                  </button>
                  <button
                    className="coming-soon"
                    disabled
                  >
                    <span className="btn-text">Play Online</span>
                    <span className="btn-hover-text">Coming Soon</span>
                  </button>
                </div>
              </div>

              {gameMode === 'ai' && (
                <div className="difficulty-select">
                  <div className="difficulty-buttons">
                    <button
                      className={selectedDifficulty === 'easy' ? 'selected' : ''}
                      onClick={() => setSelectedDifficulty('easy')}
                    >
                      Easy
                    </button>
                    <button
                      className={selectedDifficulty === 'medium' ? 'selected' : ''}
                      onClick={() => setSelectedDifficulty('medium')}
                    >
                      Medium
                    </button>
                    <button
                      className={selectedDifficulty === 'hard' ? 'selected' : ''}
                      onClick={() => setSelectedDifficulty('hard')}
                    >
                      Hard
                    </button>
                  </div>
                </div>
              )}

              {gameMode === 'online' && (
                <div className="opponent-section">
                  <input
                    type="text"
                    placeholder="Enter opponent address (aleo1...)"
                    value={opponentAddress}
                    onChange={(e) => setOpponentAddress(e.target.value)}
                  />
                </div>
              )}

              <div className="start-btn-container">
                <button
                  className={`start-btn ${((gameMode === 'ai' && selectedDifficulty) || (gameMode === 'online' && opponentAddress)) ? 'visible' : ''}`}
                  onClick={handleStartGame}
                  disabled={!((gameMode === 'ai' && selectedDifficulty) || (gameMode === 'online' && opponentAddress))}
                >
                  Start Game
                </button>
              </div>
            </>
          )}
        </div>

        {renderBadge()}
        {renderSoundToggle()}
      </div>
    );
  }

  if (gameMode === 'online' && setupBoard && !createdGameId) {
    return (
      <div className="game-container">
        <div className="setup-screen">
          <h2>Place Your Units</h2>
          <p>Drag or click to place pieces</p>
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
              <button
                className="start-btn tray-start-btn"
                onClick={handleCreateOnlineGame}
                disabled={!isAllPlaced() || isCreatingGame}
              >
                {isCreatingGame ? 'Creating...' : 'Create Game'}
              </button>
              <button className="back-btn tray-back-btn" onClick={handleBackToMenu}>
                Back
              </button>
            </div>
            <GameBoard
              board={setupBoard}
              isOwn={true}
              revealed={{ strikes: new Map(), scans: [] }}
              onCellClick={(pos) => handlePlaceUnit(pos)}
              onCellDrop={(pos, fromPos) => handlePlaceUnit(pos, fromPos)}
              disabled={false}
              allowRelocate={true}
            />
          </div>
        </div>
        {renderBadge()}
        {renderSoundToggle()}
      </div>
    );
  }

  if (gameMode === 'online' && createdGameId) {
    return (
      <div className="game-container">
        <div className="setup-screen">
          <h2>Game Created!</h2>
          <p>Share the Game ID with your opponent:</p>
          <div className="game-id-display">
            <code>{createdGameId}</code>
          </div>
          {txId && (
            <p className="tx-info">
              Transaction: <code>{txId.slice(0, 20)}...</code>
            </p>
          )}
          <p>Waiting for opponent to join...</p>
          <button className="back-btn" onClick={handleBackToMenu}>
            Back to Menu
          </button>
        </div>
        {renderBadge()}
        {renderSoundToggle()}
      </div>
    );
  }

  if (!gameState) {
    return null;
  }

  if (gameState.status === GameStatus.Setup && setupBoard) {
    return (
      <div className="game-container">
        <div className="setup-screen">
          <h2>Place Your Units</h2>
          <p>Drag or click to place pieces</p>
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
              <button
                className="start-btn tray-start-btn"
                onClick={handleConfirmPlacement}
                disabled={!isAllPlaced()}
              >
                Start Game
              </button>
            </div>
            <GameBoard
              board={setupBoard}
              isOwn={true}
              revealed={{ strikes: new Map(), scans: [] }}
              onCellClick={(pos) => handlePlaceUnit(pos)}
              onCellDrop={(pos, fromPos) => handlePlaceUnit(pos, fromPos)}
              disabled={false}
              allowRelocate={true}
            />
          </div>
        </div>
        {renderBadge()}
        {renderSoundToggle()}
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
        <div className="header-wallet">
          <WalletMultiButton />
        </div>
      </div>

      <div className="game-area">
        <div className="board-stage">
          <div className={`board-wrapper ${gameState.isPlayerTurn ? 'active' : 'inactive'}`}>
            <GameBoard
              board={null}
              revealed={gameState.playerRevealed}
              isOwn={false}
              onCellClick={handleOpponentCellClick}
              disabled={!gameState.isPlayerTurn || selectedAction !== ActionType.Strike}
            />
          </div>
          <div className={`board-wrapper ${gameState.isPlayerTurn ? 'inactive' : 'active'} ${gameState.aiThinking ? 'thinking' : ''}`}>
            <GameBoard
              board={gameState.playerBoard}
              revealed={gameState.opponentRevealed}
              isOwn={true}
              onCellClick={handlePlayerCellClick}
              selectedCell={getSelectedPlayerCell()}
              highlightedCells={getHighlightedCells()}
              disabled={!gameState.isPlayerTurn || selectedAction !== ActionType.Relocate}
            />
            <div className="ai-thinking-overlay">
              <div className="ai-thinking-content">
                <div className="ai-thinking-text">Opponent Thinking</div>
                <div className="ai-thinking-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
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
            actionLog={gameState.actionLog}
            scans={gameState.playerRevealed.scans}
          />
        </div>
      </div>
      {renderBadge()}
      {renderSoundToggle()}
    </div>
  );
};

export default Game;
