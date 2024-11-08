# Class: TwitterSearchClient

## Extends

- `ClientBase`

## Constructors

### new TwitterSearchClient()

> **new TwitterSearchClient**(`runtime`): [`TwitterSearchClient`](TwitterSearchClient.md)

#### Parameters

• **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

#### Returns

[`TwitterSearchClient`](TwitterSearchClient.md)

#### Overrides

`ClientBase.constructor`

#### Defined in

[packages/core/src/clients/twitter/search.ts:53](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/search.ts#L53)

## Properties

### callback()

> **callback**: (`self`) => `any` = `null`

#### Parameters

• **self**: `ClientBase`

#### Returns

`any`

#### Inherited from

`ClientBase.callback`

#### Defined in

[packages/core/src/clients/twitter/base.ts:150](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L150)

***

### directions

> **directions**: `string`

#### Inherited from

`ClientBase.directions`

#### Defined in

[packages/core/src/clients/twitter/base.ts:89](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L89)

***

### imageDescriptionService

> **imageDescriptionService**: `ImageDescriptionService`

#### Inherited from

`ClientBase.imageDescriptionService`

#### Defined in

[packages/core/src/clients/twitter/base.ts:92](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L92)

***

### lastCheckedTweetId

> **lastCheckedTweetId**: `number` = `null`

#### Inherited from

`ClientBase.lastCheckedTweetId`

#### Defined in

[packages/core/src/clients/twitter/base.ts:90](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L90)

***

### requestQueue

> **requestQueue**: `RequestQueue`

#### Inherited from

`ClientBase.requestQueue`

#### Defined in

[packages/core/src/clients/twitter/base.ts:96](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L96)

***

### runtime

> **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

#### Inherited from

`ClientBase.runtime`

#### Defined in

[packages/core/src/clients/twitter/base.ts:88](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L88)

***

### temperature

> **temperature**: `number` = `0.5`

#### Inherited from

`ClientBase.temperature`

#### Defined in

[packages/core/src/clients/twitter/base.ts:93](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L93)

***

### tweetCacheFilePath

> **tweetCacheFilePath**: `string` = `"tweetcache/latest_checked_tweet_id.txt"`

#### Inherited from

`ClientBase.tweetCacheFilePath`

#### Defined in

[packages/core/src/clients/twitter/base.ts:91](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L91)

***

### twitterClient

> **twitterClient**: `Scraper`

#### Inherited from

`ClientBase.twitterClient`

#### Defined in

[packages/core/src/clients/twitter/base.ts:87](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L87)

***

### twitterUserId

> **twitterUserId**: `string`

#### Inherited from

`ClientBase.twitterUserId`

#### Defined in

[packages/core/src/clients/twitter/base.ts:97](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L97)

***

### \_twitterClient

> `static` **\_twitterClient**: `Scraper`

#### Inherited from

`ClientBase._twitterClient`

#### Defined in

[packages/core/src/clients/twitter/base.ts:86](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L86)

## Methods

### cacheTweet()

> **cacheTweet**(`tweet`): `Promise`\<`void`\>

#### Parameters

• **tweet**: `Tweet`

#### Returns

`Promise`\<`void`\>

#### Inherited from

`ClientBase.cacheTweet`

#### Defined in

[packages/core/src/clients/twitter/base.ts:99](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L99)

***

### fetchHomeTimeline()

> **fetchHomeTimeline**(`count`): `Promise`\<`Tweet`[]\>

#### Parameters

• **count**: `number`

#### Returns

`Promise`\<`Tweet`[]\>

#### Inherited from

`ClientBase.fetchHomeTimeline`

#### Defined in

[packages/core/src/clients/twitter/base.ts:278](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L278)

***

### fetchSearchTweets()

> **fetchSearchTweets**(`query`, `maxTweets`, `searchMode`, `cursor`?): `Promise`\<`QueryTweetsResponse`\>

#### Parameters

• **query**: `string`

• **maxTweets**: `number`

• **searchMode**: `SearchMode`

• **cursor?**: `string`

#### Returns

`Promise`\<`QueryTweetsResponse`\>

#### Inherited from

`ClientBase.fetchSearchTweets`

#### Defined in

[packages/core/src/clients/twitter/base.ts:330](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L330)

***

### getCachedTweet()

> **getCachedTweet**(`tweetId`): `Promise`\<`Tweet`\>

#### Parameters

• **tweetId**: `string`

#### Returns

`Promise`\<`Tweet`\>

#### Inherited from

`ClientBase.getCachedTweet`

#### Defined in

[packages/core/src/clients/twitter/base.ts:115](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L115)

***

### getTweet()

> **getTweet**(`tweetId`): `Promise`\<`Tweet`\>

#### Parameters

• **tweetId**: `string`

#### Returns

`Promise`\<`Tweet`\>

#### Inherited from

`ClientBase.getTweet`

#### Defined in

[packages/core/src/clients/twitter/base.ts:137](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L137)

***

### onReady()

> **onReady**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`ClientBase.onReady`

#### Defined in

[packages/core/src/clients/twitter/search.ts:60](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/search.ts#L60)

***

### saveRequestMessage()

> **saveRequestMessage**(`message`, `state`): `Promise`\<`void`\>

#### Parameters

• **message**: [`Memory`](../interfaces/Memory.md)

• **state**: [`State`](../interfaces/State.md)

#### Returns

`Promise`\<`void`\>

#### Inherited from

`ClientBase.saveRequestMessage`

#### Defined in

[packages/core/src/clients/twitter/base.ts:572](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L572)

***

### setCookiesFromArray()

> **setCookiesFromArray**(`cookiesArray`): `Promise`\<`void`\>

#### Parameters

• **cookiesArray**: `any`[]

#### Returns

`Promise`\<`void`\>

#### Inherited from

`ClientBase.setCookiesFromArray`

#### Defined in

[packages/core/src/clients/twitter/base.ts:560](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/twitter/base.ts#L560)
