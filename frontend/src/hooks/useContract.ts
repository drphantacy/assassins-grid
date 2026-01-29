import { useCallback, useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import {
  BoardState,
  AleoTransaction,
  buildCreateGameTransaction,
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
        `https://api.explorer.provable.com/v1/testnet/program/credits.aleo/mapping/account/${address}`
      );
      const data = await response.json();
      if (data && typeof data === 'string') {
        // Parse "123456u64" format
        const match = data.match(/(\d+)u64/);
        if (match) {
          return parseInt(match[1], 10) / 1_000_000; // Convert microcredits to credits
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

  const relocate = useCallback(async (unitIndex: number, newPosition: number) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const tx = buildRelocateTransaction(publicKey, unitIndex, newPosition);
    const txId = await executeTransaction(tx);
    return { txId };
  }, [publicKey, executeTransaction]);

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
    joinGame,
    strike,
    resolveStrike,
    scan,
    respondScan,
    relocate,
    forfeit,
    getGameBoards,
  };
}
