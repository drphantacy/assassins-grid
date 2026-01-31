const PROGRAM_ID = 'assassins_grid_v2.aleo';

export interface BoardState {
  assassinPos: number;
  guard1Pos: number;
  guard2Pos: number;
  decoy1Pos: number;
  decoy2Pos: number;
  salt: string;
}

export interface AleoTransition {
  program: string;
  functionName: string;
  inputs: string[];
}

export interface AleoTransaction {
  address: string;
  chainId: string;
  transitions: AleoTransition[];
  fee: number;
  feePrivate: boolean;
}

function formatBoardState(board: BoardState): string {
  return `{ assassin_pos: ${board.assassinPos}u8, guard1_pos: ${board.guard1Pos}u8, guard2_pos: ${board.guard2Pos}u8, decoy1_pos: ${board.decoy1Pos}u8, decoy2_pos: ${board.decoy2Pos}u8, salt: ${board.salt}field }`;
}

export function buildCreateGameTransaction(
  address: string,
  gameId: string,
  board: BoardState,
  opponent: string
): AleoTransaction {
  return {
    address,
    chainId: 'testnetbeta',
    transitions: [{
      program: PROGRAM_ID,
      functionName: 'create_game',
      inputs: [
        `${gameId}field`,
        formatBoardState(board),
        opponent,
      ],
    }],
    fee: 2_500,
    feePrivate: false,
  };
}

export function buildJoinGameTransaction(
  address: string,
  gameId: string,
  board: BoardState
): AleoTransaction {
  return {
    address,
    chainId: 'testnetbeta',
    transitions: [{
      program: PROGRAM_ID,
      functionName: 'join_game',
      inputs: [
        `${gameId}field`,
        formatBoardState(board),
      ],
    }],
    fee: 50_000,
    feePrivate: false,
  };
}

export function buildStrikeTransaction(
  address: string,
  target: number
): AleoTransaction {
  return {
    address,
    chainId: 'testnetbeta',
    transitions: [{
      program: PROGRAM_ID,
      functionName: 'strike',
      inputs: [`${target}u8`],
    }],
    fee: 50_000,
    feePrivate: false,
  };
}

export function buildResolveStrikeTransaction(
  address: string,
  target: number
): AleoTransaction {
  return {
    address,
    chainId: 'testnetbeta',
    transitions: [{
      program: PROGRAM_ID,
      functionName: 'resolve_strike',
      inputs: [`${target}u8`],
    }],
    fee: 50_000,
    feePrivate: false,
  };
}

export function buildScanTransaction(
  address: string,
  isRow: boolean,
  index: number
): AleoTransaction {
  return {
    address,
    chainId: 'testnetbeta',
    transitions: [{
      program: PROGRAM_ID,
      functionName: 'scan',
      inputs: [
        isRow ? 'true' : 'false',
        `${index}u8`,
      ],
    }],
    fee: 50_000,
    feePrivate: false,
  };
}

export function buildRespondScanTransaction(
  address: string,
  isRow: boolean,
  index: number
): AleoTransaction {
  return {
    address,
    chainId: 'testnetbeta',
    transitions: [{
      program: PROGRAM_ID,
      functionName: 'respond_scan',
      inputs: [
        isRow ? 'true' : 'false',
        `${index}u8`,
      ],
    }],
    fee: 50_000,
    feePrivate: false,
  };
}

export function buildRelocateTransaction(
  address: string,
  unitIndex: number,
  newPosition: number
): AleoTransaction {
  return {
    address,
    chainId: 'testnetbeta',
    transitions: [{
      program: PROGRAM_ID,
      functionName: 'relocate',
      inputs: [
        `${unitIndex}u8`,
        `${newPosition}u8`,
      ],
    }],
    fee: 50_000,
    feePrivate: false,
  };
}

export function buildForfeitTransaction(address: string): AleoTransaction {
  return {
    address,
    chainId: 'testnetbeta',
    transitions: [{
      program: PROGRAM_ID,
      functionName: 'forfeit',
      inputs: [],
    }],
    fee: 50_000,
    feePrivate: false,
  };
}

export function generateGameId(): string {
  return Math.floor(Math.random() * 1_000_000_000).toString();
}

export function generateSalt(): string {
  return Math.floor(Math.random() * 1_000_000_000).toString();
}

export { PROGRAM_ID };
