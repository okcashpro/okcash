export * from './types'
export * from './providers/wallet'
export * from './providers/token'
export * from './providers/balances'
export * from './actions/transfer'
export * from './actions/bridge'
export * from './actions/swap'

import type { IAgentRuntime, Memory, Plugin, State } from '@ai16z/eliza'
import { WalletProvider, evmWalletProvider } from './providers/wallet'
import { TokenProvider } from './providers/token'
import { BalancesProvider } from './providers/balances'
import { TransferAction, transferTemplate } from './actions/transfer'
import { BridgeAction, bridgeTemplate } from './actions/bridge'
import { SwapAction, swapTemplate } from './actions/swap'

const transferAction = {
  name: 'transfer',
  description: 'Transfer tokens between addresses on the same chain',
  handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: any, callback?: any) => {
    const walletProvider = new WalletProvider(runtime)
    const action = new TransferAction(walletProvider)
    return action.transfer(options)
  },
  template: transferTemplate,
  validate: async () => true,
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Transfer 1 ETH to 0x123...",
          action: "SEND_TOKENS"
        }
      }
    ]
  ],
  similes: ['SEND_TOKENS', 'TOKEN_TRANSFER', 'MOVE_TOKENS']
}

const bridgeAction = {
  name: 'bridge',
  description: 'Bridge tokens between different chains',
  handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: any, callback?: any) => {
    const walletProvider = new WalletProvider(runtime)
    const action = new BridgeAction(walletProvider)
    return action.bridge(options)
  },
  template: bridgeTemplate,
  validate: async () => true,
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Bridge 1 ETH from Ethereum to Base",
          action: "CROSS_CHAIN_TRANSFER"
        }
      }
    ]
  ],
  similes: ['CROSS_CHAIN_TRANSFER', 'CHAIN_BRIDGE', 'MOVE_CROSS_CHAIN']
}

const swapAction = {
  name: 'swap',
  description: 'Swap tokens on the same chain',
  handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: any, callback?: any) => {
    try {
      const walletProvider = new WalletProvider(runtime)
      const action = new SwapAction(walletProvider)
      return await action.swap({
        chain: 'base',
        fromToken: '0x4200000000000000000000000000000000000006',
        toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '1',
        slippage: 0.5
      })
    } catch (error) {
      console.error('Error in swap handler:', error)
      if (callback) {
        callback({ text: `Error: ${error.message}` })
      }
      return false
    }
  },
  template: swapTemplate,
  validate: async () => true,
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Swap 1 ETH for USDC on Base",
          action: "TOKEN_SWAP"
        }
      }
    ]
  ],
  similes: ['TOKEN_SWAP', 'EXCHANGE_TOKENS', 'TRADE_TOKENS']
}

export const evmPlugin: Plugin = {
  name: 'evm',
  description: 'EVM blockchain integration plugin',
  providers: [evmWalletProvider],
  evaluators: [],
  services: [],
  actions: [transferAction, bridgeAction, swapAction]
}

export default evmPlugin