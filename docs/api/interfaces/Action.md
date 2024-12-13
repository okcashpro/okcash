[@ai16z/eliza v0.1.5-alpha.5](../index.md) / Action

# Interface: Action

Represents an action the agent can perform

## Properties

### similes

> **similes**: `string`[]

Similar action descriptions

#### Defined in

[packages/core/src/types.ts:400](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L400)

***

### description

> **description**: `string`

Detailed description

#### Defined in

[packages/core/src/types.ts:403](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L403)

***

### examples

> **examples**: [`ActionExample`](ActionExample.md)[][]

Example usages

#### Defined in

[packages/core/src/types.ts:406](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L406)

***

### handler

> **handler**: [`Handler`](../type-aliases/Handler.md)

Handler function

#### Defined in

[packages/core/src/types.ts:409](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L409)

***

### name

> **name**: `string`

Action name

#### Defined in

[packages/core/src/types.ts:412](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L412)

***

### validate

> **validate**: [`Validator`](../type-aliases/Validator.md)

Validation function

#### Defined in

[packages/core/src/types.ts:415](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L415)
