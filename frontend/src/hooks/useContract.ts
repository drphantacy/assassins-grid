import { useCallback, useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import {
  BoardState,
  AleoTransaction,
  buildCreateGameTransaction,
  buildCreateSoloGameTransaction,
  buildJoinGameTransaction,
  buildStrikeTransaction,
  buildResolveStrikeTransaction,
  buildScanTransaction,
  buildRespondScanTransaction,
  buildRelocateTransaction,
  buildForfeitTransaction,
  generateGameId,
  generateSalt,
  PROGRAM_ID,
} from '../services/contract';
import { EXPLORER_API_BASE, MICROCREDITS_PER_CREDIT } from '../constants/game';

export function useContract() {
  const { publicKey, requestTransaction, requestRecords } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  // Fetch balance when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchBalance(publicKey).then(setBalance).catch(() => setBalance(null));
    } else {
      setBalance(null);
    }
  }, [publicKey]);

  const fetchBalance = async (address: string): Promise<number> => {
    try {
      const response = await fetch(
        `${EXPLORER_API_BASE}/program/credits.aleo/mapping/account/${address}`
      );
      const data = await response.json();
      if (data && typeof data === 'string') {
        const match = data.match(/(\d+)u64/);
        if (match) {
          return parseInt(match[1], 10) / MICROCREDITS_PER_CREDIT;
        }
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const executeTransaction = useCallback(async (tx: AleoTransaction): Promise<string> => {
    if (!requestTransaction) {
      throw new Error('Wallet not connected');
    }

    console.log('Sending transaction:', JSON.stringify(tx, null, 2));

    const response = await requestTransaction(tx as Parameters<typeof requestTransaction>[0]);

    console.log('Wallet response:', response);
    console.log('Response type:', typeof response);

    // Handle different response formats from wallet adapters
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object') {
      // Leo Wallet / Puzzle Wallet format
      const txId = (response as { transactionId?: string }).transactionId
        || (response as { transaction_id?: string }).transaction_id
        || (response as { txId?: string }).txId
        || (response as { id?: string }).id;
      if (txId) return txId;

      // Log all keys to help debug
      console.log('Response keys:', Object.keys(response));
    }

    throw new Error('Could not extract transaction ID from wallet response');
  }, [requestTransaction]);

  const createGame = useCallback(async (
    board: Omit<BoardState, 'salt'>,
    opponent: string
  ) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const gameId = generateGameId();
    const salt = generateSalt();
    const fullBoard: BoardState = { ...board, salt };

    const tx = buildCreateGameTransaction(publicKey, gameId, fullBoard, opponent);
    const txId = await executeTransaction(tx);
    return { gameId, txId, board: fullBoard };
  }, [publicKey, executeTransaction]);

  const createSoloGame = useCallback(async (
    board: Omit<BoardState, 'salt'>
  ) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const gameId = generateGameId();
    const salt = generateSalt();
    const fullBoard: BoardState = { ...board, salt };

    const tx = buildCreateSoloGameTransaction(publicKey, gameId, fullBoard);
    const txId = await executeTransaction(tx);
    return { gameId, txId, board: fullBoard };
  }, [publicKey, executeTransaction]);

  const joinGame = useCallback(async (
    gameId: string,
    board: Omit<BoardState, 'salt'>
  ) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const salt = generateSalt();
    const fullBoard: BoardState = { ...board, salt };

    const tx = buildJoinGameTransaction(publicKey, gameId, fullBoard);
    const txId = await executeTransaction(tx);
    return { txId, board: fullBoard };
  }, [publicKey, executeTransaction]);

  const strike = useCallback(async (target: number) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const tx = buildStrikeTransaction(publicKey, target);
    const txId = await executeTransaction(tx);
    return { txId };
  }, [publicKey, executeTransaction]);

  const resolveStrike = useCallback(async (target: number) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const tx = buildResolveStrikeTransaction(publicKey, target);
    const txId = await executeTransaction(tx);
    return { txId };
  }, [publicKey, executeTransaction]);

  const scan = useCallback(async (isRow: boolean, index: number) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const tx = buildScanTransaction(publicKey, isRow, index);
    const txId = await executeTransaction(tx);
    return { txId };
  }, [publicKey, executeTransaction]);

  const respondScan = useCallback(async (isRow: boolean, index: number) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const tx = buildRespondScanTransaction(publicKey, isRow, index);
    const txId = await executeTransaction(tx);
    return { txId };
  }, [publicKey, executeTransaction]);

  const relocate = useCallback(async (gameBoardRecord: any, unitIndex: number, newPosition: number) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const tx = buildRelocateTransaction(publicKey, gameBoardRecord, unitIndex, newPosition);
    const txId = await executeTransaction(tx);
    return { txId };
  }, [publicKey, executeTransaction]);

  const fetchGameBoardRecord = useCallback(async (gameId: string): Promise<any | null> => {
    if (!requestRecords) {
      throw new Error('Wallet not connected');
    }

    const records = await requestRecords(PROGRAM_ID);

    if (!records || !Array.isArray(records)) {
      return null;
    }

    // Find unspent GameBoard records
    const gameBoards = records.filter((r: any) =>
      r.recordName === 'GameBoard' && r.spent === false
    );

    for (const record of gameBoards) {
      // Check plaintext for game_id
      if (record.plaintext?.includes(gameId)) {
        return record.plaintext;
      }

      // Check data object for game_id
      if (record.data?.game_id?.includes(gameId)) {
        return record.plaintext || record.ciphertext;
      }
    }

    // If no match found but we have records, use the most recent one
    if (gameBoards.length > 0) {
      return gameBoards[0];
    }

    return null;
  }, [requestRecords]);

  const forfeit = useCallback(async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const tx = buildForfeitTransaction(publicKey);
    const txId = await executeTransaction(tx);
    return { txId };
  }, [publicKey, executeTransaction]);

  const getGameBoards = useCallback(async () => {
    if (!requestRecords) {
      throw new Error('Wallet not connected');
    }

    const records = await requestRecords(PROGRAM_ID);
    return records;
  }, [requestRecords]);

  const refreshBalance = useCallback(async () => {
    if (publicKey) {
      const bal = await fetchBalance(publicKey);
      setBalance(bal);
    }
  }, [publicKey]);

  return {
    connected: !!publicKey,
    address: publicKey,
    balance,
    refreshBalance,
    createGame,
    createSoloGame,
    joinGame,
    strike,
    resolveStrike,
    scan,
    respondScan,
    relocate,
    forfeit,
    getGameBoards,
    fetchGameBoardRecord,
  };
}
