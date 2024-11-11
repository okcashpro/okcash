# Function: splitChunks()

> **splitChunks**(`runtime`, `content`, `chunkSize`, `bleed`, `modelClass`): `Promise`\<`string`[]\>

Splits content into chunks of specified size with optional overlapping bleed sections

## Parameters

• **runtime**: `any`

• **content**: `string`

The text content to split into chunks

• **chunkSize**: `number`

The maximum size of each chunk in tokens

• **bleed**: `number` = `100`

Number of characters to overlap between chunks (default: 100)

• **modelClass**: `string`

## Returns

`Promise`\<`string`[]\>

Promise resolving to array of text chunks with bleed sections

## Defined in

[packages/core/src/generation.ts:388](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L388)
