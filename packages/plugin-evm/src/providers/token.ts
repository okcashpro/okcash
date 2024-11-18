import { formatUnits } from 'viem'
import { getTokens, getTokenBalances, ChainId } from '@lifi/sdk'
import type { WalletProvider } from './wallet'
import { CHAIN_CONFIGS } from './wallet'
import type { TokenWithBalance, SupportedChain } from '../types'

const PROVIDER_CONFIG = {
  PRICE_API: 'https://li.quest/v1',
  NATIVE_TOKEN: {
    ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    base: '0x4200000000000000000000000000000000000006'
  }
}

export class TokenProvider {
  constructor(private walletProvider: WalletProvider) {}

  async getTokenBalances(chain: SupportedChain): Promise<TokenWithBalance[]> {
    const walletAddress = await this.walletProvider.getAddress()
    const balances = await getTokenBalances(
      walletAddress,
      [] // Empty array fetches all tokens
    )

    const tokens = await getTokens({
      chains: [CHAIN_CONFIGS[chain].chainId]
    })

    return balances.map(balance => {
      const token = tokens.tokens[CHAIN_CONFIGS[chain].chainId].find(t => t.address.toLowerCase() === balance.address.toLowerCase())
      if (!token) return null

      return {
        token,
        balance: BigInt(balance.amount),
        formattedBalance: formatUnits(BigInt(balance.amount), token.decimals),
        priceUSD: balance.priceUSD,
        valueUSD: (Number(formatUnits(BigInt(balance.amount), token.decimals)) * Number(balance.priceUSD)).toString()
      }
    }).filter(Boolean) as TokenWithBalance[]
  }

  async getPrices(tokens: string[], chain: SupportedChain): Promise<Record<string, string>> {
    const response = await fetch(`${PROVIDER_CONFIG.PRICE_API}/prices?chainId=${CHAIN_CONFIGS[chain].chainId}&tokenAddresses=${tokens.join(',')}`)
    if (!response.ok) throw new Error('Failed to fetch token prices')
    const data = await response.json()
    return data.prices
  }
}
