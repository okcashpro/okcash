[@ai16z/eliza v1.0.0](../index.md) / Goal

# Interface: Goal

Represents a goal, which is a higher-level aim composed of one or more objectives. Goals are tracked to measure progress or achievements within the conversation or system.

## Properties

### id?

> `optional` **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:66](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L66)

---

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:67](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L67)

---

### userId

> **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:68](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L68)

---

### name

> **name**: `string`

#### Defined in

[packages/core/src/types.ts:69](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L69)

---

### status

> **status**: [`GoalStatus`](../enumerations/GoalStatus.md)

#### Defined in

[packages/core/src/types.ts:70](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L70)

---

### objectives

> **objectives**: [`Objective`](Objective.md)[]

#### Defined in

[packages/core/src/types.ts:71](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L71)
