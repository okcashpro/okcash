# Class: TokenProvider

## Constructors

### new TokenProvider()

> **new TokenProvider**(`tokenAddress`): [`TokenProvider`](TokenProvider.md)

#### Parameters

• **tokenAddress**: `string`

#### Returns

[`TokenProvider`](TokenProvider.md)

#### Defined in

[core/src/providers/token.ts:38](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L38)

## Methods

### analyzeHolderDistribution()

> **analyzeHolderDistribution**(`tradeData`): `Promise`\<`string`\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`string`\>

#### Defined in

[core/src/providers/token.ts:461](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L461)

***

### checkRecentTrades()

> **checkRecentTrades**(`tradeData`): `Promise`\<`boolean`\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[core/src/providers/token.ts:629](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L629)

***

### countHighSupplyHolders()

> **countHighSupplyHolders**(`securityData`): `Promise`\<`number`\>

#### Parameters

• **securityData**: `TokenSecurityData`

#### Returns

`Promise`\<`number`\>

#### Defined in

[core/src/providers/token.ts:633](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L633)

***

### fetchDexScreenerData()

> **fetchDexScreenerData**(): `Promise`\<`DexScreenerData`\>

#### Returns

`Promise`\<`DexScreenerData`\>

#### Defined in

[core/src/providers/token.ts:420](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L420)

***

### fetchHolderList()

> **fetchHolderList**(): `Promise`\<`HolderData`[]\>

#### Returns

`Promise`\<`HolderData`[]\>

#### Defined in

[core/src/providers/token.ts:507](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L507)

***

### fetchTokenSecurity()

> **fetchTokenSecurity**(): `Promise`\<`TokenSecurityData`\>

#### Returns

`Promise`\<`TokenSecurityData`\>

#### Defined in

[core/src/providers/token.ts:155](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L155)

***

### fetchTokenTradeData()

> **fetchTokenTradeData**(): `Promise`\<`TokenTradeData`\>

#### Returns

`Promise`\<`TokenTradeData`\>

#### Defined in

[core/src/providers/token.ts:185](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L185)

***

### filterHighValueHolders()

> **filterHighValueHolders**(`tradeData`): `Promise`\<`object`[]\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`object`[]\>

#### Defined in

[core/src/providers/token.ts:607](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L607)

***

### formatTokenData()

> **formatTokenData**(`data`): `string`

#### Parameters

• **data**: `ProcessedTokenData`

#### Returns

`string`

#### Defined in

[core/src/providers/token.ts:720](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L720)

***

### getFormattedTokenReport()

> **getFormattedTokenReport**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

#### Defined in

[core/src/providers/token.ts:784](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L784)

***

### getProcessedTokenData()

> **getProcessedTokenData**(): `Promise`\<`ProcessedTokenData`\>

#### Returns

`Promise`\<`ProcessedTokenData`\>

#### Defined in

[core/src/providers/token.ts:654](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/providers/token.ts#L654)
