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

[core/src/actions/pumpfun.ts:51](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/actions/pumpfun.ts#L51)
