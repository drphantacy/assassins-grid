import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react'
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui'
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo'
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base'
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css'
import './index.css'
import App from './App.tsx'

function Root() {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'Assassins Grid',
      }),
    ],
    []
  )

  return (
    <WalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect
    >
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
