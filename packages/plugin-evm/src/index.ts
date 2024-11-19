export * from './types'
export * from './providers/wallet'
export * from './providers/token'
export * from './providers/balances'
export * from './actions/transfer'
export * from './actions/bridge'
export * from './actions/swap'

import type { Plugin } from '@ai16z/eliza'
import { evmWalletProvider } from './providers/wallet'
import { transferAction } from './actions/transfer'
import { bridgeAction } from './actions/bridge'
import { swapAction } from './actions/swap'

export const evmPlugin: Plugin = {
  name: 'evm',
  description: 'EVM blockchain integration plugin',
  providers: [evmWalletProvider],
  evaluators: [],
  services: [],
  actions: [transferAction, bridgeAction, swapAction]
}

export default evmPlugin