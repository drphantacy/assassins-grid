export enum UnitType {
  Empty = 0,
  Assassin = 1,
  Guard = 2,
  Decoy = 3,
}

export enum StrikeResult {
  Miss = 0,
  HitGuard = 1,
  HitDecoy = 2,
  HitAssassin = 3,
}

export enum GameStatus {
  Setup = 'setup',
  Playing = 'playing',
  WaitingResponse = 'waiting',
  Won = 'won',
  Lost = 'lost',
}

export enum ActionType {
  Strike = 'strike',
  Scan = 'scan',
  Relocate = 'relocate',
}

export interface BoardState {
  assassinPos: number;
  guard1Pos: number;
  guard2Pos: number;
  decoy1Pos: number;
  decoy2Pos: number;
}

export interface ScanResult {
  isRow: boolean;
  index: number;
  count: number;
}

export interface StrikeAction {
  type: ActionType.Strike;
  target: number;
}

export interface ScanAction {
  type: ActionType.Scan;
  isRow: boolean;
  index: number;
}

export interface RelocateAction {
  type: ActionType.Relocate;
  unitIndex: number;
  newPosition: number;
}

export type GameAction = StrikeAction | ScanAction | RelocateAction;

export interface RevealedInfo {
  strikes: Map<number, StrikeResult>;
  scans: ScanResult[];
}

export interface GameState {
  status: GameStatus;
  playerBoard: BoardState;
  opponentBoard: BoardState | null;
  playerRevealed: RevealedInfo;
  opponentRevealed: RevealedInfo;
  isPlayerTurn: boolean;
  playerRelocatesRemaining: number;
  opponentRelocatesRemaining: number;
  turnNumber: number;
  lastAction: GameAction | null;
  lastResult: StrikeResult | number | null;
}

export const GRID_SIZE = 5;
export const TOTAL_SQUARES = 25;
export const ELIMINATED = -1;

export function posToRow(pos: number): number {
  return Math.floor(pos / GRID_SIZE);
}

export function posToCol(pos: number): number {
  return pos % GRID_SIZE;
}

export function rowColToPos(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

export function isValidPos(pos: number): boolean {
  return pos >= 0 && pos < TOTAL_SQUARES;
}
