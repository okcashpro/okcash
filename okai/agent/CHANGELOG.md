# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.7-alpha.1](https://github.com/okcashpro/okai/compare/v0.1.7-alpha.0...v0.1.7-alpha.1) (2024-12-18)

**Note:** Version bump only for package @okcashpro/agent





## [0.1.7-alpha.0](https://github.com/okcashpro/okai/compare/v0.1.5-alpha.10...v0.1.7-alpha.0) (2024-12-18)


### Bug Fixes

* fetch log level to debug ([29ce2f9](https://github.com/okcashpro/okai/commit/29ce2f946f7c34bc54de3abad9c530334a33bae5))
* fix swap ([f5f74c2](https://github.com/okcashpro/okai/commit/f5f74c21a256862bad4ab8a73db5116d0c167cb0))
* package.json missing near ([4aebba2](https://github.com/okcashpro/okai/commit/4aebba2ebc85c8d4ac6fd99584e4c5ee113cb266))
* print commands to start the client and remove unused --non-iteractive in dockerfile ([5eb5514](https://github.com/okcashpro/okai/commit/5eb551409e14787876be43c652663e4d3fb95882))


### Features

* Add plugin-nft-generation: support for creating Solana NFT collections. ([3ff0677](https://github.com/okcashpro/okai/commit/3ff0677f3534f11bdc9e29843f1c936662e3d299))
* add plugin-ton ([08fc29d](https://github.com/okcashpro/okai/commit/08fc29db8e32340367b0e96c705852a1a6dba19d))
* make NodePlugin and GoatPlugin creation conditional ([ca49c0e](https://github.com/okcashpro/okai/commit/ca49c0e68cc5df2b62eaeef8950de5786441cf67))
* Make revisions according to review comments. ([edcf0fa](https://github.com/okcashpro/okai/commit/edcf0fadccc645f36ffcd8850059d430bc65f610)), closes [/github.com/ai16z/eliza/pull/1011#discussion_r1883158466](https://github.com//github.com/ai16z/eliza/pull/1011/issues/discussion_r1883158466) [/github.com/ai16z/eliza/pull/1011#discussion_r1883142951](https://github.com//github.com/ai16z/eliza/pull/1011/issues/discussion_r1883142951) [/github.com/ai16z/eliza/pull/1011#discussion_r1883145780](https://github.com//github.com/ai16z/eliza/pull/1011/issues/discussion_r1883145780)
* ref swap, wallet connection, ref env variables ([913651d](https://github.com/okcashpro/okai/commit/913651d029f4edb722e0e6eba4849d2859d9036f))
* **slack:** Complete Slack client implementation with core improvements ([a97266f](https://github.com/okcashpro/okai/commit/a97266f20d9aed13fc216851001c12c36fba9f9b))





## [0.1.5-alpha.10](https://github.com/okcashpro/okai/compare/v0.1.5-alpha.9...v0.1.5-alpha.10) (2024-12-11)

**Note:** Version bump only for package @okcashpro/agent





## [0.1.5-alpha.9](https://github.com/okcashpro/okai/compare/v0.1.5-alpha.8...v0.1.5-alpha.9) (2024-12-11)

**Note:** Version bump only for package @okcashpro/agent





## [0.1.5-alpha.8](https://github.com/okcashpro/okai/compare/v0.1.5-alpha.7...v0.1.5-alpha.8) (2024-12-11)


### Reverts

* Revert "v0.1.5-alpha.7" ([6ae2e65](https://github.com/okcashpro/okai/commit/6ae2e65b31a23c7f2fed9965db8b4384292ef576))





## 0.1.5-alpha.7 (2024-12-08)


### Bug Fixes

*  running character file ([15635c1](https://github.com/okcashpro/okai/commit/15635c1c6001f9f48569ed77189cc49d7a0a3dc8))
* char ([4cfe830](https://github.com/okcashpro/okai/commit/4cfe83027e3331b6fd4a9fbde91040bff628914c))
* **deps:** pin dependencies ([308732a](https://github.com/okcashpro/okai/commit/308732a8906881a0c7a023765bbd4c5590c565e6))
* directclient is not a type ([274f821](https://github.com/okcashpro/okai/commit/274f82122f3d2140455c3ba9f13893ce02800e3d))
* fix loadCharacters resolver ([6e9ade9](https://github.com/okcashpro/okai/commit/6e9ade9a448a3658bb3e6cf1ea6bffdec84a4b9a))
* Fix the issue where running the program throws an error when the plugins field in the .character.json file is configured with plugin names. ([ee4f4c8](https://github.com/okcashpro/okai/commit/ee4f4c8a685a24ab821217c5600351d5ca0d590e))
* merge ([b905ca1](https://github.com/okcashpro/okai/commit/b905ca1adf0a911671a183a995517706f3eb7fbd))
* remove default salt to remove launch agent errors & add tee plugin back into agent startup file ([fa89b3b](https://github.com/okcashpro/okai/commit/fa89b3b1ec9e80cdbd065c485d1589c7a3160a56))
* revert ([f14e9e0](https://github.com/okcashpro/okai/commit/f14e9e0fd6568e1c83e6720d8896f2acd000a174))
* revert ([a9d8417](https://github.com/okcashpro/okai/commit/a9d8417e19e29389cff6fc322347c89c8754a49b))
* voice ([19e9d1b](https://github.com/okcashpro/okai/commit/19e9d1b3d3f870bbeaa12181491a1e9abfc85554))


### Features

* add class to remote attestation and derive key to call provider functions ([147adde](https://github.com/okcashpro/okai/commit/147adde8d6a7596d831064dc0be2ca0872c42a7c))
* add coinbase  ERC20, ERC721, and ERC1155 tokenContract deployment / invokement plugins ([a460c04](https://github.com/okcashpro/okai/commit/a460c04b4e7aa28f591515947d8ae98c7339b7ac))
* add flow plugin to agent ([85d85b1](https://github.com/okcashpro/okai/commit/85d85b184858e4debb983a895aefd2ecdea809a9))
* add new provider with eternal ai ([1a59f15](https://github.com/okcashpro/okai/commit/1a59f159f5e0125556bb770e9099261925ea1a4c))
* add wallet provider to use derived key to generate wallet ([66637cd](https://github.com/okcashpro/okai/commit/66637cd244b7e820114783f9547227f00c019740))
* implement coinbase mass payments across base/sol/eth/pol/arb ([436a83d](https://github.com/okcashpro/okai/commit/436a83dbd2c3d6c800a06c9cefe7ba393503e9f6))
* improve embeddings, models and connectivity ([638eac6](https://github.com/okcashpro/okai/commit/638eac67a83bd3346bb48ae5d5921857f44cf980)), closes [#604](https://github.com/okcashpro/okai/issues/604)
* initial pluggin ([ec73d19](https://github.com/okcashpro/okai/commit/ec73d1956b1130acf3e470953b8ff87822c226a0))
* transfer on Conflux (conflux-plugin) ([886dd7f](https://github.com/okcashpro/okai/commit/886dd7fef84a6b7290ca009819dacaae98f7e1d4))
* working farcaster client with neynar ([469e266](https://github.com/okcashpro/okai/commit/469e2666a74cdaa350257a670035c3f190061dbc))
