[@ai16z/eliza v0.1.5-alpha.5](../index.md) / Evaluator

# Interface: Evaluator

Evaluator for assessing agent responses

## Properties

### alwaysRun?

> `optional` **alwaysRun**: `boolean`

Whether to always run

#### Defined in

[packages/core/src/types.ts:437](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L437)

***

### description

> **description**: `string`

Detailed description

#### Defined in

[packages/core/src/types.ts:440](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L440)

***

### similes

> **similes**: `string`[]

Similar evaluator descriptions

#### Defined in

[packages/core/src/types.ts:443](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L443)

***

### examples

> **examples**: [`EvaluationExample`](EvaluationExample.md)[]

Example evaluations

#### Defined in

[packages/core/src/types.ts:446](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L446)

***

### handler

> **handler**: [`Handler`](../type-aliases/Handler.md)

Handler function

#### Defined in

[packages/core/src/types.ts:449](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L449)

***

### name

> **name**: `string`

Evaluator name

#### Defined in

[packages/core/src/types.ts:452](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L452)

***

### validate

> **validate**: [`Validator`](../type-aliases/Validator.md)

Validation function

#### Defined in

[packages/core/src/types.ts:455](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L455)
