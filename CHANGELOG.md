# @speechify/vercel

## [0.3.0](https://github.com/Speechify-AI/vercel-sdk/compare/0.2.2...0.3.0) (2026-07-07)


### Features

* default output format to mp3 ([#8](https://github.com/Speechify-AI/vercel-sdk/issues/8)) ([bc68f56](https://github.com/Speechify-AI/vercel-sdk/commit/bc68f56f30d98870e971087ae4d6e155440f21ab))

## [0.2.2](https://github.com/Speechify-AI/vercel-sdk/compare/0.2.1...0.2.2) (2026-07-07)


### Bug Fixes

* match repository.url casing to Speechify-AI for provenance validation ([#6](https://github.com/Speechify-AI/vercel-sdk/issues/6)) ([30552a2](https://github.com/Speechify-AI/vercel-sdk/commit/30552a21ec96ccb6f09e58b8f6ebfdaf7e8051b8))

## [0.2.1](https://github.com/Speechify-AI/vercel-sdk/compare/0.2.0...0.2.1) (2026-07-07)


### Bug Fixes

* append ai-sdk marker to the SDK User-Agent instead of replacing it ([#3](https://github.com/Speechify-AI/vercel-sdk/issues/3)) ([c9d1659](https://github.com/Speechify-AI/vercel-sdk/commit/c9d1659e6cb58a08f9b7fb17099fc8da1b0bfef0))

## [0.2.0](https://github.com/Speechify-AI/vercel-sdk/compare/0.1.0...0.2.0) (2026-07-06)


### Features

* @speechify/vercel — Speechify provider for the Vercel AI SDK (bridge over @speechify/api) ([#1](https://github.com/Speechify-AI/vercel-sdk/issues/1)) ([5cf64e1](https://github.com/Speechify-AI/vercel-sdk/commit/5cf64e16ad5517013e0a34e4e0fba89da57a0f0b))

## 0.1.0

- Initial release: Speechify text-to-speech provider implementing the AI SDK `SpeechModelV4` specification (`generateSpeech` support).
- Models: `simba-english`, `simba-multilingual`, `simba-3.0`.
- Speech marks and billable character counts exposed via `providerMetadata.speechify`.
