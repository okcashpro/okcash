# Function: createAndBuyToken()

> **createAndBuyToken**(`__namedParameters`): `Promise`\<`void`\>

## Parameters

• **\_\_namedParameters**

• **\_\_namedParameters.allowOffCurve**: `boolean`

• **\_\_namedParameters.buyAmountSol**: `bigint`

• **\_\_namedParameters.commitment?**: `"processed"` \| `"confirmed"` \| `"finalized"` \| `"recent"` \| `"single"` \| `"singleGossip"` \| `"root"` \| `"max"` = `"finalized"`

• **\_\_namedParameters.connection**: `Connection`

• **\_\_namedParameters.deployer**: `Keypair`

• **\_\_namedParameters.mint**: `Keypair`

• **\_\_namedParameters.priorityFee**: `PriorityFee`

• **\_\_namedParameters.sdk**: `PumpFunSDK`

• **\_\_namedParameters.slippage**: `string`

• **\_\_namedParameters.tokenMetadata**: `CreateTokenMetadata`

## Returns

`Promise`\<`void`\>

## Defined in

[packages/core/src/actions/pumpfun.ts:51](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/actions/pumpfun.ts#L51)
