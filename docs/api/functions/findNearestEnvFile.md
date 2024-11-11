# Function: findNearestEnvFile()

> **findNearestEnvFile**(`startDir`?): `any`

Recursively searches for a .env file starting from the current directory
and moving up through parent directories

## Parameters

• **startDir?**: `string` = `...`

Starting directory for the search

## Returns

`any`

Path to the nearest .env file or null if not found

## Defined in

[packages/core/src/settings.ts:11](https://github.com/ai16z/eliza/blob/main/packages/core/src/settings.ts#L11)
