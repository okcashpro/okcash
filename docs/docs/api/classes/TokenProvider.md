# Class: TokenProvider

## Constructors

### new TokenProvider()

> **new TokenProvider**(`tokenAddress`): [`TokenProvider`](TokenProvider.md)

#### Parameters

• **tokenAddress**: `string`

#### Returns

[`TokenProvider`](TokenProvider.md)

#### Defined in

[core/src/providers/token.ts:38](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L38)

## Methods

### analyzeHolderDistribution()

> **analyzeHolderDistribution**(`tradeData`): `Promise`\<`string`\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`string`\>

#### Defined in

[core/src/providers/token.ts:461](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L461)

***

### checkRecentTrades()

> **checkRecentTrades**(`tradeData`): `Promise`\<`boolean`\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[core/src/providers/token.ts:631](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L631)

***

### countHighSupplyHolders()

> **countHighSupplyHolders**(`securityData`): `Promise`\<`number`\>

#### Parameters

• **securityData**: `TokenSecurityData`

#### Returns

`Promise`\<`number`\>

#### Defined in

[core/src/providers/token.ts:635](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L635)

***

### fetchDexScreenerData()

> **fetchDexScreenerData**(): `Promise`\<`DexScreenerData`\>

#### Returns

`Promise`\<`DexScreenerData`\>

#### Defined in

[core/src/providers/token.ts:420](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L420)

***

### fetchHolderList()

> **fetchHolderList**(): `Promise`\<`HolderData`[]\>

#### Returns

`Promise`\<`HolderData`[]\>

#### Defined in

[core/src/providers/token.ts:507](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L507)

***

### fetchTokenSecurity()

> **fetchTokenSecurity**(): `Promise`\<`TokenSecurityData`\>

#### Returns

`Promise`\<`TokenSecurityData`\>

#### Defined in

[core/src/providers/token.ts:155](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L155)

***

### fetchTokenTradeData()

> **fetchTokenTradeData**(): `Promise`\<`TokenTradeData`\>

#### Returns

`Promise`\<`TokenTradeData`\>

#### Defined in

[core/src/providers/token.ts:185](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L185)

***

### filterHighValueHolders()

> **filterHighValueHolders**(`tradeData`): `Promise`\<`object`[]\>

#### Parameters

• **tradeData**: `TokenTradeData`

#### Returns

`Promise`\<`object`[]\>

#### Defined in

[core/src/providers/token.ts:607](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L607)

***

### formatTokenData()

> **formatTokenData**(`data`): `string`

#### Parameters

• **data**: `ProcessedTokenData`

#### Returns

`string`

#### Defined in

[core/src/providers/token.ts:722](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L722)

***

### getFormattedTokenReport()

> **getFormattedTokenReport**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

#### Defined in

[core/src/providers/token.ts:786](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L786)

***

### getProcessedTokenData()

> **getProcessedTokenData**(): `Promise`\<`ProcessedTokenData`\>

#### Returns

`Promise`\<`ProcessedTokenData`\>

#### Defined in

[core/src/providers/token.ts:656](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/providers/token.ts#L656)
