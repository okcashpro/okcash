[@ai16z/eliza v0.1.4-alpha.3](../index.md) / Action

# Interface: Action

Represents an action the agent can perform

## Properties

### similes

> **similes**: `string`[]

Similar action descriptions

#### Defined in

[packages/core/src/types.ts:384](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L384)

***

### description

> **description**: `string`

Detailed description

#### Defined in

[packages/core/src/types.ts:387](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L387)

***

### examples

> **examples**: [`ActionExample`](ActionExample.md)[][]

Example usages

#### Defined in

[packages/core/src/types.ts:390](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L390)

***

### handler

> **handler**: [`Handler`](../type-aliases/Handler.md)

Handler function

#### Defined in

[packages/core/src/types.ts:393](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L393)

***

### name

> **name**: `string`

Action name

#### Defined in

[packages/core/src/types.ts:396](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L396)

***

### validate

> **validate**: [`Validator`](../type-aliases/Validator.md)

Validation function

#### Defined in

[packages/core/src/types.ts:399](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L399)
