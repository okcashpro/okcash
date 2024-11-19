import { Address, formatUnits } from 'viem'
import type { TokenProvider } from './token'
import type { WalletBalance, SupportedChain, TokenWithBalance } from '../types'
import type { Token } from '@lifi/types'
import { ChainId, getTokenBalances, getTokens } from '@lifi/sdk';
import { CHAIN_CONFIGS } from './wallet';

const PROVIDER_CONFIG = {
  PRICE_API: 'https://li.quest/v1',
  NATIVE_TOKEN: {
    ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    base: '0x4200000000000000000000000000000000000006'
  }
} as const

export class BalancesProvider {
  constructor(
    private tokenProvider: TokenProvider,
    private walletAddress: Address
  ) {}

  private async getTokenPrice(chain: SupportedChain, tokenAddress: Address): Promise<string> {
    try {
      const response = await fetch(
        `${PROVIDER_CONFIG.PRICE_API}/token?chain=${chain}&token=${tokenAddress}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data.priceUSD || '0'
    } catch (error) {
      console.error(`Failed to fetch price for ${tokenAddress} on ${chain}:`, error)
      return '0'
    }
  }

  async getWalletBalances(chains: SupportedChain[]): Promise<WalletBalance[]> {
    return Promise.all(
      chains.map(async (chain): Promise<WalletBalance> => {
        const tokens = await getTokens({
          chains: [CHAIN_CONFIGS[chain].chainId]
        })
        
        const balancePromises = tokens.tokens[CHAIN_CONFIGS[chain].chainId].map(async (token): Promise<TokenWithBalance> => { // TODO: Consider destructuring token for readability
          const { address, symbol, decimals, name, logoURI } = token
          const [balance, price] = await Promise.all([
            getTokenBalances(this.walletAddress, [{
              address,
              symbol,
              decimals,
              name,
              chainId: CHAIN_CONFIGS[chain].chainId,
              priceUSD: '0',
              logoURI: logoURI || ''
            }]),
            this.getTokenPrice(chain, address as Address)
          ])

          return {
            token: {
              symbol: token.symbol,
              decimals: token.decimals,
              address: token.address as Address,
              name: token.name,
              priceUSD: price,
              logoURI: token.logoURI || '',
              chainId: CHAIN_CONFIGS[chain].chainId,
            },
            balance: balance[token.address],
            formattedBalance: formatUnits(balance[token.address], token.decimals),
            priceUSD: price,
            valueUSD: (Number(formatUnits(balance[token.address], token.decimals)) * Number(price)).toString()
          }
        })

        const nonZeroBalances = (await Promise.all(balancePromises)).filter(t => t.balance > 0n)
        
        const totalValueUSD = nonZeroBalances
          .reduce((sum, t) => sum + Number(t.valueUSD || 0), 0)
          .toFixed(2)

        return {
          chain,
          address: this.walletAddress,
          totalValueUSD,
          tokens: nonZeroBalances as unknown as TokenWithBalance[]
        }
      })
    )
  }
}
