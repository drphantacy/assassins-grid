import React from 'react';
import {
  BoardState,
  UnitType,
  StrikeResult,
  RevealedInfo,
  GRID_SIZE,
  rowColToPos,
} from '../types/game';
import { getUnitAt } from '../utils/gameLogic';
import './GameBoard.css';

interface GameBoardProps {
  board: BoardState | null;
  revealed?: RevealedInfo;
  isOwn: boolean;
  onCellClick?: (pos: number) => void;
  onCellDrop?: (pos: number) => void;
  selectedCell?: number | null;
  highlightedCells?: number[];
  disabled?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  revealed,
  isOwn,
  onCellClick,
  onCellDrop,
  selectedCell,
  highlightedCells = [],
  disabled = false,
}) => {
  const [dragOverCell, setDragOverCell] = React.useState<number | null>(null);
  const renderCell = (row: number, col: number) => {
    const pos = rowColToPos(row, col);
    const isHighlighted = highlightedCells.includes(pos);
    const isSelected = selectedCell === pos;

    let cellContent: React.ReactNode = null;
    let cellClass = 'cell';

    if (isOwn && board) {
      const unit = getUnitAt(board, pos);
      if (unit !== UnitType.Empty) {
        cellContent = getUnitEmoji(unit);
        cellClass += ` unit-${UnitType[unit].toLowerCase()}`;
      }

      if (revealed?.strikes.has(pos)) {
        cellClass += ' struck';
      }
    } else if (revealed) {
      if (revealed.strikes.has(pos)) {
        const result = revealed.strikes.get(pos)!;
        cellContent = getResultEmoji(result);
        cellClass += ` result-${StrikeResult[result].toLowerCase()}`;
      }
    }

    if (isHighlighted) cellClass += ' highlighted';
    if (isSelected) cellClass += ' selected';
    if (disabled && !onCellDrop) cellClass += ' disabled';
    if (dragOverCell === pos) cellClass += ' drag-over';

    return (
      <div
        key={pos}
        className={cellClass}
        onClick={() => !disabled && onCellClick?.(pos)}
        onDragOver={(e) => {
          if (onCellDrop) {
            e.preventDefault();
            setDragOverCell(pos);
          }
        }}
        onDragLeave={() => setDragOverCell(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverCell(null);
          onCellDrop?.(pos);
        }}
      >
        {cellContent}
        <span className="cell-pos">{pos}</span>
      </div>
    );
  };

  const renderRowLabel = (row: number) => (
    <div key={`row-${row}`} className="row-label">
      {row}
    </div>
  );

  const renderColLabels = () => (
    <div className="col-labels">
      <div className="corner-label"></div>
      {[0, 1, 2, 3, 4].map(col => (
        <div key={`col-${col}`} className="col-label">
          {col}
        </div>
      ))}
    </div>
  );

  return (
    <div className="game-board">
      <div className="board-title">{isOwn ? 'Your Board' : "Opponent's Board"}</div>
      {renderColLabels()}
      <div className="board-grid">
        {Array.from({ length: GRID_SIZE }, (_, row) => (
          <div key={row} className="board-row">
            {renderRowLabel(row)}
            {Array.from({ length: GRID_SIZE }, (_, col) => renderCell(row, col))}
          </div>
        ))}
      </div>
    </div>
  );
};

function getUnitEmoji(unit: UnitType): string {
  switch (unit) {
    case UnitType.Assassin: return '🗡️';
    case UnitType.Guard: return '🛡️';
    case UnitType.Decoy: return '👤';
    default: return '';
  }
}

function getResultEmoji(result: StrikeResult): string {
  switch (result) {
    case StrikeResult.Miss: return '💨';
    case StrikeResult.HitGuard: return '🛡️';
    case StrikeResult.HitDecoy: return '👤';
    case StrikeResult.HitAssassin: return '💀';
    default: return '';
  }
}

export default GameBoard;
