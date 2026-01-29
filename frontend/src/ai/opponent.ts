import {
  BoardState,
  GameAction,
  ActionType,
  RevealedInfo,
  ScanResult,
  TOTAL_SQUARES,
  posToRow,
  posToCol,
} from '../types/game';
import { generateRandomBoard } from '../utils/gameLogic';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export class AIOpponent {
  private board: BoardState;
  private difficulty: AIDifficulty;
  private relocatesRemaining: number = 2;

  constructor(difficulty: AIDifficulty = 'medium') {
    this.board = generateRandomBoard();
    this.difficulty = difficulty;
  }

  getBoard(): BoardState {
    return this.board;
  }

  updateBoard(newBoard: BoardState): void {
    this.board = newBoard;
  }

  decideAction(revealed: RevealedInfo): GameAction {
    switch (this.difficulty) {
      case 'easy':
        return this.decideEasy(revealed);
      case 'medium':
        return this.decideMedium(revealed);
      case 'hard':
        return this.decideHard(revealed);
      default:
        return this.decideMedium(revealed);
    }
  }

  private decideEasy(revealed: RevealedInfo): GameAction {
    const unstruck = this.getUnstruckPositions(revealed);
    const target = unstruck[Math.floor(Math.random() * unstruck.length)];
    return { type: ActionType.Strike, target };
  }

  private decideMedium(revealed: RevealedInfo): GameAction {
    const unstruck = this.getUnstruckPositions(revealed);

    if (revealed.scans.length < 3 && Math.random() < 0.2) {
      return this.decideScan(revealed);
    }

    const prioritized = this.prioritizeByScans(unstruck, revealed.scans);
    if (prioritized.length > 0) {
      const target = prioritized[Math.floor(Math.random() * prioritized.length)];
      return { type: ActionType.Strike, target };
    }

    const target = unstruck[Math.floor(Math.random() * unstruck.length)];
    return { type: ActionType.Strike, target };
  }

  private decideHard(revealed: RevealedInfo): GameAction {
    const unstruck = this.getUnstruckPositions(revealed);

    if (revealed.scans.length < 2 && revealed.strikes.size < 5) {
      return this.decideScan(revealed);
    }

    const scores = this.scorePositions(unstruck, revealed);
    const maxScore = Math.max(...scores.values());

    if (maxScore > 0) {
      const bestTargets = unstruck.filter(pos => scores.get(pos) === maxScore);
      const target = bestTargets[Math.floor(Math.random() * bestTargets.length)];
      return { type: ActionType.Strike, target };
    }

    if (Math.random() < 0.15 && revealed.scans.length < 6) {
      return this.decideScan(revealed);
    }

    const target = unstruck[Math.floor(Math.random() * unstruck.length)];
    return { type: ActionType.Strike, target };
  }

  private getUnstruckPositions(revealed: RevealedInfo): number[] {
    const positions: number[] = [];
    for (let i = 0; i < TOTAL_SQUARES; i++) {
      if (!revealed.strikes.has(i)) {
        positions.push(i);
      }
    }
    return positions;
  }

  private decideScan(revealed: RevealedInfo): GameAction {
    const scannedRows = new Set<number>();
    const scannedCols = new Set<number>();

    revealed.scans.forEach(scan => {
      if (scan.isRow) scannedRows.add(scan.index);
      else scannedCols.add(scan.index);
    });

    const unscannedRows = [0, 1, 2, 3, 4].filter(i => !scannedRows.has(i));
    const unscannedCols = [0, 1, 2, 3, 4].filter(i => !scannedCols.has(i));

    if (unscannedRows.length > 0 && Math.random() < 0.5) {
      return {
        type: ActionType.Scan,
        isRow: true,
        index: unscannedRows[Math.floor(Math.random() * unscannedRows.length)],
      };
    }

    if (unscannedCols.length > 0) {
      return {
        type: ActionType.Scan,
        isRow: false,
        index: unscannedCols[Math.floor(Math.random() * unscannedCols.length)],
      };
    }

    return this.decideEasy(revealed);
  }

  private prioritizeByScans(positions: number[], scans: ScanResult[]): number[] {
    const hotRows = new Set<number>();
    const hotCols = new Set<number>();

    scans.forEach(scan => {
      if (scan.count > 0) {
        if (scan.isRow) hotRows.add(scan.index);
        else hotCols.add(scan.index);
      }
    });

    return positions.filter(pos => {
      const row = posToRow(pos);
      const col = posToCol(pos);
      return hotRows.has(row) || hotCols.has(col);
    });
  }

  private scorePositions(positions: number[], revealed: RevealedInfo): Map<number, number> {
    const scores = new Map<number, number>();

    positions.forEach(pos => {
      let score = 0;
      const row = posToRow(pos);
      const col = posToCol(pos);

      revealed.scans.forEach(scan => {
        if (scan.isRow && scan.index === row && scan.count > 0) {
          score += scan.count;
        }
        if (!scan.isRow && scan.index === col && scan.count > 0) {
          score += scan.count;
        }
      });

      const rowScan = revealed.scans.find(s => s.isRow && s.index === row);
      const colScan = revealed.scans.find(s => !s.isRow && s.index === col);
      if (rowScan && colScan && rowScan.count > 0 && colScan.count > 0) {
        score += 2;
      }

      scores.set(pos, score);
    });

    return scores;
  }

  getRelocatesRemaining(): number {
    return this.relocatesRemaining;
  }

  useRelocate(): void {
    if (this.relocatesRemaining > 0) {
      this.relocatesRemaining--;
    }
  }
}
