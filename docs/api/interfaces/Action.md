[@ai16z/eliza v0.1.4-alpha.3](../index.md) / Action

# Interface: Action

Represents an action the agent can perform

## Properties

### similes

> **similes**: `string`[]

Similar action descriptions

#### Defined in

[packages/core/src/types.ts:377](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L377)

***

### description

> **description**: `string`

Detailed description

#### Defined in

[packages/core/src/types.ts:380](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L380)

***

### examples

> **examples**: [`ActionExample`](ActionExample.md)[][]

Example usages

#### Defined in

[packages/core/src/types.ts:383](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L383)

***

### handler

> **handler**: [`Handler`](../type-aliases/Handler.md)

Handler function

#### Defined in

[packages/core/src/types.ts:386](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L386)

***

### name

> **name**: `string`

Action name

#### Defined in

[packages/core/src/types.ts:389](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L389)

***

### validate

> **validate**: [`Validator`](../type-aliases/Validator.md)

Validation function

#### Defined in

[packages/core/src/types.ts:392](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L392)
