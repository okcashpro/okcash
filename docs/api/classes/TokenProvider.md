# Class: TokenProvider

## Constructors

### new TokenProvider()

> **new TokenProvider**(`tokenAddress`): [`TokenProvider`](TokenProvider.md)

#### Parameters

• **tokenAddress**: `string`

#### Returns

[`TokenProvider`](TokenProvider.md)

#### Defined in

[packages/core/src/providers/token.ts:38](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L38)

## Methods

### analyzeHolderDistribution()

> **analyzeHolderDistribution**(`tradeData`): `Promise`\<`string`\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/providers/token.ts:472](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L472)

***

### checkRecentTrades()

> **checkRecentTrades**(`tradeData`): `Promise`\<`boolean`\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[packages/core/src/providers/token.ts:642](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L642)

***

### countHighSupplyHolders()

> **countHighSupplyHolders**(`securityData`): `Promise`\<`number`\>

#### Parameters

• **securityData**: `TokenSecurityData`

#### Returns

`Promise`\<`number`\>

#### Defined in

[packages/core/src/providers/token.ts:646](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L646)

***

### fetchDexScreenerData()

> **fetchDexScreenerData**(): `Promise`\<`DexScreenerData`\>

#### Returns

`Promise`\<`DexScreenerData`\>

#### Defined in

[packages/core/src/providers/token.ts:431](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L431)

***

### fetchHolderList()

> **fetchHolderList**(): `Promise`\<`HolderData`[]\>

#### Returns

`Promise`\<`HolderData`[]\>

#### Defined in

[packages/core/src/providers/token.ts:518](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L518)

***

### fetchTokenSecurity()

> **fetchTokenSecurity**(): `Promise`\<`TokenSecurityData`\>

#### Returns

`Promise`\<`TokenSecurityData`\>

#### Defined in

[packages/core/src/providers/token.ts:166](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L166)

***

### fetchTokenTradeData()

> **fetchTokenTradeData**(): `Promise`\<`TokenTradeData`\>

#### Returns

`Promise`\<`TokenTradeData`\>

#### Defined in

[packages/core/src/providers/token.ts:196](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L196)

***

### filterHighValueHolders()

> **filterHighValueHolders**(`tradeData`): `Promise`\<`object`[]\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`object`[]\>

#### Defined in

[packages/core/src/providers/token.ts:618](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L618)

***

### formatTokenData()

> **formatTokenData**(`data`): `string`

#### Parameters

• **data**: `ProcessedTokenData`

#### Returns

`string`

#### Defined in

[packages/core/src/providers/token.ts:733](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L733)

***

### getFormattedTokenReport()

> **getFormattedTokenReport**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/providers/token.ts:797](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L797)

***

### getProcessedTokenData()

> **getProcessedTokenData**(): `Promise`\<`ProcessedTokenData`\>

#### Returns

`Promise`\<`ProcessedTokenData`\>

#### Defined in

[packages/core/src/providers/token.ts:667](https://github.com/ai16z/eliza/blob/main/packages/core/src/providers/token.ts#L667)
