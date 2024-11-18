[@ai16z/eliza v1.0.0](../index.md) / Service

# Class: `abstract` Service

## Extended by

- [`IImageDescriptionService`](../interfaces/IImageDescriptionService.md)
- [`ITranscriptionService`](../interfaces/ITranscriptionService.md)
- [`IVideoService`](../interfaces/IVideoService.md)
- [`ITextGenerationService`](../interfaces/ITextGenerationService.md)
- [`IBrowserService`](../interfaces/IBrowserService.md)
- [`ISpeechService`](../interfaces/ISpeechService.md)
- [`IPdfService`](../interfaces/IPdfService.md)

## Constructors

### new Service()

> **new Service**(): [`Service`](Service.md)

#### Returns

[`Service`](Service.md)

## Properties

### serviceType

> `static` **serviceType**: [`ServiceType`](../enumerations/ServiceType.md)

#### Defined in

[packages/core/src/types.ts:519](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L519)

## Methods

### getInstance()

> `static` **getInstance**\<`T`\>(): `T`

#### Type Parameters

• **T** _extends_ [`Service`](Service.md)

#### Returns

`T`

#### Defined in

[packages/core/src/types.ts:521](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L521)
