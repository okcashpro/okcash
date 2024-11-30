[@ai16z/eliza v0.1.4-alpha.3](../index.md) / Action

# Interface: Action

Represents an action the agent can perform

## Properties

### similes

> **similes**: `string`[]

Similar action descriptions

#### Defined in

[packages/core/src/types.ts:388](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L388)

***

### description

> **description**: `string`

Detailed description

#### Defined in

[packages/core/src/types.ts:391](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L391)

***

### examples

> **examples**: [`ActionExample`](ActionExample.md)[][]

Example usages

#### Defined in

[packages/core/src/types.ts:394](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L394)

***

### handler

> **handler**: [`Handler`](../type-aliases/Handler.md)

Handler function

#### Defined in

[packages/core/src/types.ts:397](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L397)

***

### name

> **name**: `string`

Action name

#### Defined in

[packages/core/src/types.ts:400](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L400)

***

### validate

> **validate**: [`Validator`](../type-aliases/Validator.md)

Validation function

#### Defined in

[packages/core/src/types.ts:403](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L403)
