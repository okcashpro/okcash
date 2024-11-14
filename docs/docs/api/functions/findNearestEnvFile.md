# Function: findNearestEnvFile()

> **findNearestEnvFile**(`startDir`?): `string`

Recursively searches for a .env file starting from the current directory
and moving up through parent directories

## Parameters

• **startDir?**: `string` = `...`

Starting directory for the search

## Returns

`string`

Path to the nearest .env file or null if not found

## Defined in

[packages/core/src/settings.ts:11](https://github.com/ai16z/eliza/blob/7fcf54e7fb2ba027d110afcc319c0b01b3f181dc/packages/core/src/settings.ts#L11)
