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

[core/src/actions/pumpfun.ts:51](https://github.com/ai16z/eliza/blob/04630632db51d7d3c06f5bec41e6fb1423e43340/core/src/actions/pumpfun.ts#L51)
