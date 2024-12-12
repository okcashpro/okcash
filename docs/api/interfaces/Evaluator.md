[@ai16z/eliza v0.1.5-alpha.3](../index.md) / Evaluator

# Interface: Evaluator

Evaluator for assessing agent responses

## Properties

### alwaysRun?

> `optional` **alwaysRun**: `boolean`

Whether to always run

#### Defined in

[packages/core/src/types.ts:433](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L433)

***

### description

> **description**: `string`

Detailed description

#### Defined in

[packages/core/src/types.ts:436](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L436)

***

### similes

> **similes**: `string`[]

Similar evaluator descriptions

#### Defined in

[packages/core/src/types.ts:439](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L439)

***

### examples

> **examples**: [`EvaluationExample`](EvaluationExample.md)[]

Example evaluations

#### Defined in

[packages/core/src/types.ts:442](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L442)

***

### handler

> **handler**: [`Handler`](../type-aliases/Handler.md)

Handler function

#### Defined in

[packages/core/src/types.ts:445](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L445)

***

### name

> **name**: `string`

Evaluator name

#### Defined in

[packages/core/src/types.ts:448](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L448)

***

### validate

> **validate**: [`Validator`](../type-aliases/Validator.md)

Validation function

#### Defined in

[packages/core/src/types.ts:451](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L451)
