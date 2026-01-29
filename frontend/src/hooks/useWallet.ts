import { useState, useCallback, useEffect } from 'react';

interface WalletState {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  error: string | null;
}

interface LeoWallet {
  publicKey: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  requestRecords(programId: string): Promise<unknown[]>;
  requestTransaction(transaction: unknown): Promise<string>;
  requestExecution(execution: unknown): Promise<string>;
  requestBulkTransactions(transactions: unknown[]): Promise<string[]>;
  requestDeploy(deployment: unknown): Promise<string>;
  transactionStatus(transactionId: string): Promise<string>;
  getExecution(transactionId: string): Promise<unknown>;
  requestRecordPlaintexts(programId: string): Promise<unknown[]>;
  requestTransactionHistory(programId: string): Promise<unknown[]>;
  on(event: string, callback: (data: unknown) => void): void;
  off(event: string, callback: (data: unknown) => void): void;
}

declare global {
  interface Window {
    leoWallet?: LeoWallet;
    puzzle?: {
      connect(): Promise<{ address: string }>;
      disconnect(): Promise<void>;
      getSelectedAccount(): Promise<{ address: string } | null>;
    };
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    connecting: false,
    error: null,
  });

  const detectWallet = useCallback((): 'leo' | 'puzzle' | null => {
    if (typeof window !== 'undefined') {
      if (window.leoWallet) return 'leo';
      if (window.puzzle) return 'puzzle';
    }
    return null;
  }, []);

  const connect = useCallback(async () => {
    const walletType = detectWallet();

    if (!walletType) {
      setState(prev => ({
        ...prev,
        error: 'No wallet detected. Please install Leo Wallet or Puzzle Wallet.',
      }));
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      if (walletType === 'leo' && window.leoWallet) {
        await window.leoWallet.connect();
        const address = window.leoWallet.publicKey;
        setState({
          connected: true,
          address,
          connecting: false,
          error: null,
        });
      } else if (walletType === 'puzzle' && window.puzzle) {
        const result = await window.puzzle.connect();
        setState({
          connected: true,
          address: result.address,
          connecting: false,
          error: null,
        });
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        connecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet',
      }));
    }
  }, [detectWallet]);

  const disconnect = useCallback(async () => {
    const walletType = detectWallet();

    try {
      if (walletType === 'leo' && window.leoWallet) {
        await window.leoWallet.disconnect();
      } else if (walletType === 'puzzle' && window.puzzle) {
        await window.puzzle.disconnect();
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }

    setState({
      connected: false,
      address: null,
      connecting: false,
      error: null,
    });
  }, [detectWallet]);

  useEffect(() => {
    const checkConnection = async () => {
      const walletType = detectWallet();

      if (walletType === 'leo' && window.leoWallet?.publicKey) {
        setState({
          connected: true,
          address: window.leoWallet.publicKey,
          connecting: false,
          error: null,
        });
      } else if (walletType === 'puzzle' && window.puzzle) {
        try {
          const account = await window.puzzle.getSelectedAccount();
          if (account) {
            setState({
              connected: true,
              address: account.address,
              connecting: false,
              error: null,
            });
          }
        } catch {
          // Not connected
        }
      }
    };

    const timer = setTimeout(checkConnection, 500);
    return () => clearTimeout(timer);
  }, [detectWallet]);

  return {
    ...state,
    connect,
    disconnect,
    walletType: detectWallet(),
  };
}
