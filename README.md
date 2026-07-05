# Speechify provider for the Vercel AI SDK

The **[Speechify](https://speechify.ai)** provider for the [Vercel AI SDK](https://ai-sdk.dev) adds Speechify's text-to-speech models to the AI SDK's unified speech interface — switch from OpenAI, ElevenLabs, or Deepgram to Speechify with a one-line model swap. It is a thin bridge over the official [`@speechify/api`](https://www.npmjs.com/package/@speechify/api) client.

## Setup

```bash
npm install @speechify/vercel ai
```

Get an API key from the [Speechify Console](https://console.sws.speechify.com) and set it as `SPEECHIFY_API_KEY`.

## Usage

```ts
import { speechify } from '@speechify/vercel';
import { generateSpeech } from 'ai';

const { audio } = await generateSpeech({
  model: speechify.speech('simba-english'),
  text: 'Hello from Speechify!',
  voice: 'george',
});
```

To customize the API key, base URL, or headers, create your own provider instance:

```ts
import { createSpeechify } from '@speechify/vercel';

const speechify = createSpeechify({
  apiKey: process.env.MY_SPEECHIFY_KEY,
});
```

## Models

| Model ID | Description |
| --- | --- |
| `simba-english` | English-optimized TTS (default) |
| `simba-multilingual` | Multilingual TTS |
| `simba-3.0` | Latest-generation model |

## Voices

The `voice` option takes a Speechify voice ID (e.g. `george`, `scott`), including your own cloned voices. Defaults to `george` when omitted. List available voices with `GET /v1/voices` ([docs](https://docs.speechify.ai/tts/api-reference/v1/voices/get)).

## Output formats

The standard `outputFormat` option accepts either a simple format name — `mp3`, `wav`, `ogg`, `aac`, `pcm` — or a Speechify codec string with sample rate and bitrate, e.g. `mp3_24000_128`, `pcm_16000`, `ulaw_8000` (useful for telephony).

## Speed, emotion, and SSML

Speechify controls prosody through [SSML](https://docs.speechify.ai/docs/ssml). The standard `speed` option is implemented by wrapping your text in `<speak><prosody rate="...">`:

```ts
await generateSpeech({
  model: speechify.speech(),
  text: 'A bit faster please.',
  speed: 1.25,
});
```

If your `text` is already SSML (starts with `<speak`), it is sent unchanged — set rate, pitch, and emotion directly in your markup. The `instructions` option is not supported and produces a warning.

## Provider options

```ts
await generateSpeech({
  model: speechify.speech(),
  text: 'Hello!',
  providerOptions: {
    speechify: {
      ssml: true,                    // treat text as SSML, disable speed wrapping
      outputFormat: 'mp3_24000_128', // codec string, overrides outputFormat
      loudnessNormalization: true,
      textNormalization: true,
    },
  },
});
```

## Speech marks (word timing)

Speechify returns word- and sentence-level timing data with every generation, available via provider metadata:

```ts
const result = await generateSpeech({
  model: speechify.speech(),
  text: 'Timed speech.',
});

const { speechMarks, billableCharactersCount } =
  result.providerMetadata.speechify;
```

## Limitations

- Text-to-speech only — Speechify has no transcription API, so there is no transcription model.
- The AI SDK speech interface is request/response; Speechify's streaming endpoint (`/v1/audio/stream`) is not yet exposed through this provider.
