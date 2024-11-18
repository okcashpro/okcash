import { ChainId, createConfig, executeRoute, getRoutes, ExtendedChain, Chain } from '@lifi/sdk'
import type { WalletProvider } from '../providers/wallet'
import type { Transaction, SwapParams, SupportedChain } from '../types'
import { CHAIN_CONFIGS } from '../providers/wallet'

export const swapTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested token swap:
- Input token symbol or address (the token being sold)
- Output token symbol or address (the token being bought)
- Amount to swap
- Chain to execute on (ethereum or base)

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "inputToken": string | null,
    "outputToken": string | null,
    "amount": string | null,
    "chain": "ethereum" | "base" | null,
    "slippage": number | null
}
\`\`\`
`

export class SwapAction {
  private config

  constructor(private walletProvider: WalletProvider) {
    this.config = createConfig({
      integrator: 'eliza',
      chains: Object.values(CHAIN_CONFIGS).map(config => ({
        id: config.chainId,
        name: config.name,
        key: config.name.toLowerCase(),
        chainType: 'EVM' as const,
        nativeToken: {
          ...config.nativeCurrency,
          chainId: config.chainId,
          address: '0x0000000000000000000000000000000000000000',
          coinKey: config.nativeCurrency.symbol,
          priceUSD: '0',
          logoURI: '',
          symbol: config.nativeCurrency.symbol,
          decimals: config.nativeCurrency.decimals,
          name: config.nativeCurrency.name
        },
        rpcUrls: {
          public: { http: [config.rpcUrl] }
        },
        blockExplorerUrls: [config.blockExplorerUrl],
        metamask: {
          chainId: `0x${config.chainId.toString(16)}`,
          chainName: config.name,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: [config.rpcUrl],
          blockExplorerUrls: [config.blockExplorerUrl]
        },
        coin: config.nativeCurrency.symbol,
        mainnet: true,
        diamondAddress: '0x0000000000000000000000000000000000000000'
      })) as ExtendedChain[],
    })
  }

  async swap(params: SwapParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient()
    const [fromAddress] = await walletClient.getAddresses()

    const routes = await getRoutes({
      fromChainId: CHAIN_CONFIGS[params.chain].chainId as ChainId,
      toChainId: CHAIN_CONFIGS[params.chain].chainId as ChainId,
      fromTokenAddress: params.fromToken,
      toTokenAddress: params.toToken,
      fromAmount: params.amount,
      fromAddress: fromAddress,
      options: {
        slippage: params.slippage || 0.5,
        order: 'RECOMMENDED'
      }
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
      data: process.data as `0x${string}`,
      chainId: CHAIN_CONFIGS[params.chain].chainId
    }
  }
}