import React, { useState, useRef, useEffect } from 'react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { GameStatus, BoardState, ChainEvent } from '../types/game';
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
    resetGame,
  } = useGame();

  const { connected, createGame, balance } = useContract();

  const [popoverCell, setPopoverCell] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [placingUnit, setPlacingUnit] = useState<number | null>(0);
  const [setupBoard, setSetupBoard] = useState<BoardState | null>(null);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [opponentAddress, setOpponentAddress] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [chainEvents, setChainEvents] = useState<ChainEvent[]>([]);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!connected && (gameState || setupBoard || gameMode)) {
      resetGame();
      setGameMode(null);
      setSetupBoard(null);
      setCreatedGameId(null);
      setTxId(null);
      setOpponentAddress('');
      setChainEvents([]);
      setCurrentGameId(null);
    }
  }, [connected]);

  useEffect(() => {
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

  const handleStartGame = (difficulty: AIDifficulty = 'medium') => {
    startMusic();
    setGameMode('ai');
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
      setIsTransitioning(false);
    }, 600);
  };

  const [txError, setTxError] = useState<string | null>(null);

  const TEST_MODE = import.meta.env.VITE_TEST_MODE === 'true';

  const handleConfirmPlacement = async () => {
    if (!setupBoard) return;

    setIsStartingGame(true);
    setTxError(null);

    if (TEST_MODE) {
      const mockGameId = `test-${Date.now()}`;
      setCurrentGameId(mockGameId);
      setChainEvents([
        {
          type: 'game_created',
          txId: 'test-mode',
          gameId: mockGameId,
          timestamp: Date.now(),
          description: 'Game created (test mode)',
        },
      ]);
      placeUnits(setupBoard);
      setSetupBoard(null);
      setIsStartingGame(false);
      return;
    }

    try {
      const AI_ADDRESS = 'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc';
      const result = await createGame(
        {
          assassinPos: setupBoard.assassinPos,
          guard1Pos: setupBoard.guard1Pos,
          guard2Pos: setupBoard.guard2Pos,
          decoy1Pos: setupBoard.decoy1Pos,
          decoy2Pos: setupBoard.decoy2Pos,
        },
        AI_ADDRESS
      );

      console.log('Game created:', result);

      setCurrentGameId(result.gameId);
      setChainEvents([
        {
          type: 'game_created',
          txId: result.txId,
          gameId: result.gameId,
          timestamp: Date.now(),
          description: 'Game created on-chain',
        },
      ]);

      placeUnits(setupBoard);
      setSetupBoard(null);
    } catch (err) {
      console.error('Failed to create on-chain game:', err);
      setTxError((err as Error).message || 'Transaction failed');
    } finally {
      setIsStartingGame(false);
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

    if (fromPos !== undefined) {
      const unitIndex = [
        setupBoard.assassinPos,
        setupBoard.guard1Pos,
        setupBoard.guard2Pos,
        setupBoard.decoy1Pos,
        setupBoard.decoy2Pos,
      ].indexOf(fromPos);

      if (unitIndex === -1) return;

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
    if (gameState.playerRevealed.strikes.has(pos)) return;
    setPopoverCell(popoverCell === pos ? null : pos);
  };

  const handleStrike = (pos: number) => {
    if (!gameState || !gameState.isPlayerTurn) return;
    performStrike(pos);
    setPopoverCell(null);
  };

  const closePopover = () => {
    setPopoverCell(null);
  };

  const handlePlayerCellClick = (_pos: number) => {
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
    setSetupBoard(null);
    setCreatedGameId(null);
    setTxId(null);
    setOpponentAddress('');
    setChainEvents([]);
    setCurrentGameId(null);
  };

  const handlePlayAgain = () => {
    resetGame();
    setChainEvents([]);
    setCurrentGameId(null);
    setPopoverCell(null);
    setShowLog(false);
    setSetupBoard({
      assassinPos: -1,
      guard1Pos: -1,
      guard2Pos: -1,
      decoy1Pos: -1,
      decoy2Pos: -1,
    });
    setPlacingUnit(0);
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
              <div className="wallet-card">
                <div className="menu-wallet connected">
                  <WalletMultiButton />
                </div>
                {balance !== null && (
                  <div className="wallet-balance">
                    <span className="balance-label">Balance</span>
                    <span className="balance-value">{balance.toFixed(4)}</span>
                    <span className="balance-unit">credits</span>
                  </div>
                )}
              </div>

              <div className="mode-select">
                <div className="mode-buttons">
                  <button
                    className="solo-btn"
                    onClick={() => handleStartGame('medium')}
                  >
                    Solo
                  </button>
                  <button
                    className="coming-soon"
                    disabled
                  >
                    <span className="btn-text">Play Versus</span>
                    <span className="btn-hover-text">Coming Soon</span>
                  </button>
                </div>
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

  if (!gameState && setupBoard) {
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
                className={`start-btn tray-start-btn ${isStartingGame ? 'loading' : ''}`}
                onClick={handleConfirmPlacement}
                disabled={!isAllPlaced() || isStartingGame}
              >
                {isStartingGame ? 'Starting...' : 'Start Game'}
              </button>
              {txError && (
                <div className="tx-error">
                  Transaction failed. Please try again.
                </div>
              )}
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
                className={`start-btn tray-start-btn ${isStartingGame ? 'loading' : ''}`}
                onClick={handleConfirmPlacement}
                disabled={!isAllPlaced() || isStartingGame}
              >
                {isStartingGame ? 'Starting...' : 'Start Game'}
              </button>
              {txError && (
                <div className="tx-error">
                  Transaction failed. Please try again.
                </div>
              )}
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

  return (
    <div className="game-container">
      <div className="game-header">
        <div className="header-left"></div>
        <div className="header-center">
          <h1 className="game-header-title">Assassins Grid</h1>
          <GameControls
            status={gameState.status}
            isPlayerTurn={gameState.isPlayerTurn}
            onPlayAgain={handlePlayAgain}
          />
        </div>
        <div className="header-right">
          <button
            className={`log-toggle ${showLog ? 'active' : ''}`}
            onClick={() => setShowLog(!showLog)}
            title="Game Log"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>
          <div className="header-wallet">
            <WalletMultiButton />
          </div>
        </div>
      </div>

      <div className="game-area">
        <div className={`floating-log ${showLog ? 'visible' : ''}`}>
          <GameLog
            actionLog={gameState.actionLog}
            scans={gameState.playerRevealed.scans}
            chainEvents={chainEvents}
            gameId={currentGameId}
          />
        </div>

        <div className="board-stage">
          <div className={`board-wrapper ${gameState.isPlayerTurn ? 'active' : 'inactive'}`}>
            {popoverCell !== null && (
              <div className="action-box">
                <div className="action-box-header">
                  <span className="action-box-title">Cell {popoverCell}</span>
                  <button className="action-box-close" onClick={closePopover}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="action-box-buttons">
                  <button className="action-box-btn strike" onClick={() => handleStrike(popoverCell)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Strike
                  </button>
                  <button className="action-box-btn powerups" disabled>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Power Ups
                  </button>
                </div>
              </div>
            )}
            <GameBoard
              board={null}
              revealed={gameState.playerRevealed}
              isOwn={false}
              onCellClick={handleOpponentCellClick}
              disabled={!gameState.isPlayerTurn}
              popoverCell={popoverCell}
            />
          </div>
          <div className={`board-wrapper ${gameState.isPlayerTurn ? 'inactive' : 'active'} ${gameState.aiThinking ? 'thinking' : ''}`}>
            <GameBoard
              board={gameState.playerBoard}
              revealed={gameState.opponentRevealed}
              isOwn={true}
              onCellClick={handlePlayerCellClick}
              disabled={true}
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
      </div>


      {renderBadge()}
      {renderSoundToggle()}
    </div>
  );
};

export default Game;
