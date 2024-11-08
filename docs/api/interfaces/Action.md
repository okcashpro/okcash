# Interface: Action

Represents an action that the agent can perform, including conditions for its use, a description, examples, a handler function, and a validation function.

## Properties

### description

> **description**: `string`

#### Defined in

[packages/core/src/core/types.ts:214](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L214)

***

### examples

> **examples**: [`ActionExample`](ActionExample.md)[][]

#### Defined in

[packages/core/src/core/types.ts:215](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L215)

***

### handler

> **handler**: [`Handler`](../type-aliases/Handler.md)

#### Defined in

[packages/core/src/core/types.ts:216](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L216)

***

### name

> **name**: `string`

#### Defined in

[packages/core/src/core/types.ts:217](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L217)

***

### similes

> **similes**: `string`[]

#### Defined in

[packages/core/src/core/types.ts:213](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L213)

***

### validate

> **validate**: [`Validator`](../type-aliases/Validator.md)

#### Defined in

[packages/core/src/core/types.ts:218](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L218)
