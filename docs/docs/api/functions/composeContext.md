# Function: composeContext()

> **composeContext**(`params`): `string`

Composes a context string by replacing placeholders in a template with corresponding values from the state.

This function takes a template string with placeholders in the format `{{placeholder}}` and a state object.
It replaces each placeholder with the value from the state object that matches the placeholder's name.
If a matching key is not found in the state object for a given placeholder, the placeholder is replaced with an empty string.

## Parameters

• **params**

The parameters for composing the context.

• **params.state**: [`State`](../interfaces/State.md)

The state object containing values to replace the placeholders in the template.

• **params.template**: `string`

The template string containing placeholders to be replaced with state values.

## Returns

`string`

The composed context string with placeholders replaced by corresponding state values.

## Example

```ts
// Given a state object and a template
const state = { userName: "Alice", userAge: 30 };
const template = "Hello, {{userName}}! You are {{userAge}} years old";

// Composing the context will result in:
// "Hello, Alice! You are 30 years old."
const context = composeContext({ state, template });
```

## Defined in

[packages/core/src/context.ts:24](https://github.com/ai16z/eliza/blob/7fcf54e7fb2ba027d110afcc319c0b01b3f181dc/packages/core/src/context.ts#L24)
