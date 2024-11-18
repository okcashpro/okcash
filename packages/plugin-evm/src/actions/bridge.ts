import { ChainId, createConfig, executeRoute, getRoutes, type Route, type Execution, ExtendedChain, Chain } from '@lifi/sdk'
import type { WalletProvider } from '../providers/wallet'
import type { Transaction, BridgeParams, SupportedChain } from '../types'
import { CHAIN_CONFIGS } from '../providers/wallet'

export const bridgeTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested token bridge:
- Token symbol or address to bridge
- Source chain (ethereum or base)
- Destination chain (ethereum or base)
- Amount to bridge
- Destination address (if specified)

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "token": string | null,
    "fromChain": "ethereum" | "base" | null,
    "toChain": "ethereum" | "base" | null,
    "amount": string | null,
    "toAddress": string | null
}
\`\`\`
`

export class BridgeAction {
  private config

  constructor(private walletProvider: WalletProvider) {
    this.config = createConfig({
      integrator: 'eliza',
      chains: Object.values(CHAIN_CONFIGS).map(config => ({
        id: config.chainId,
        name: config.name,
        key: config.name.toLowerCase(),
        chainType: 'EVM',
        nativeToken: {
          ...config.nativeCurrency,
          chainId: config.chainId,
          address: '0x0000000000000000000000000000000000000000',
          coinKey: config.nativeCurrency.symbol,
        },
        metamask: {
          chainId: `0x${config.chainId.toString(16)}`,
          chainName: config.name,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: [config.rpcUrl],
          blockExplorerUrls: [config.blockExplorerUrl]
        },
        diamondAddress: '0x0000000000000000000000000000000000000000',
        coin: config.nativeCurrency.symbol,
        mainnet: true
      })) as ExtendedChain[]
    })
  }

  async bridge(params: BridgeParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient()
    const [fromAddress] = await walletClient.getAddresses()

    const routes = await getRoutes({
      fromChainId: CHAIN_CONFIGS[params.fromChain].chainId as ChainId,
      toChainId: CHAIN_CONFIGS[params.toChain].chainId as ChainId,
      fromTokenAddress: params.fromToken,
      toTokenAddress: params.toToken,
      fromAmount: params.amount,
      fromAddress: fromAddress,
      toAddress: params.toAddress || fromAddress
    })

    if (!routes.routes.length) throw new Error('No routes found')

    const execution = await executeRoute(routes.routes[0], this.config)
    const process = execution.steps[0]?.execution?.process[0]
    
    if (!process?.status || process.status === 'FAILED') {
      throw new Error('Transaction failed')
    }

    return {
      hash: process.txHash as `0x${string}`,
      from: fromAddress,
      to: routes.routes[0].steps[0].estimate.approvalAddress as `0x${string}`,
      value: BigInt(params.amount),
      chainId: CHAIN_CONFIGS[params.fromChain].chainId
    }
  }
}