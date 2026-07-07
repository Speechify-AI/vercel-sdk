import type {
  JSONValue,
  SharedV4Warning,
  SpeechModelV4,
  SpeechModelV4CallOptions,
} from '@ai-sdk/provider';
import {
  convertBase64ToUint8Array,
  parseProviderOptions,
} from '@ai-sdk/provider-utils';
import type { Speechify, SpeechifyClient } from '@speechify/api';
import { convertSpeechifyError } from './speechify-error';
import type {
  SpeechifySpeechAudioFormat,
  SpeechifySpeechModelId,
  SpeechifySpeechRequest,
} from './speechify-api-types';
import { speechifySpeechProviderOptionsSchema } from './speechify-speech-options';

export type SpeechifySpeechModelConfig = {
  provider: string;
  client: SpeechifyClient;
  _internal?: {
    currentDate?: () => Date;
  };
};

// Speechify requires a voice_id on every request; "geffen_32" is a shared
// en-US voice in the simba-3.2 curated set, so one-line `generateSpeech`
// calls work with the default model.
const DEFAULT_VOICE_ID = 'geffen_32';

const SIMPLE_AUDIO_FORMATS: ReadonlySet<string> = new Set([
  'wav',
  'mp3',
  'ogg',
  'aac',
  'pcm',
]);

// codec_sampleRate[_bitrate] strings, e.g. mp3_24000_128, pcm_16000, ulaw_8000
const CODEC_OUTPUT_FORMAT_REGEX = /^(mp3|pcm|ogg|aac|ulaw|wav)_\d+(_\d+)?$/;

export class SpeechifySpeechModel implements SpeechModelV4 {
  readonly specificationVersion = 'v4';

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: SpeechifySpeechModelId,
    private readonly config: SpeechifySpeechModelConfig,
  ) {}

  private async getArgs({
    text,
    voice,
    outputFormat,
    instructions,
    speed,
    language,
    providerOptions,
  }: SpeechModelV4CallOptions): Promise<{
    body: SpeechifySpeechRequest;
    warnings: SharedV4Warning[];
  }> {
    const warnings: SharedV4Warning[] = [];

    const speechifyOptions = await parseProviderOptions({
      provider: 'speechify',
      providerOptions,
      schema: speechifySpeechProviderOptionsSchema,
    });

    const isSsmlInput =
      speechifyOptions?.ssml === true || text.trimStart().startsWith('<speak');

    let input = text;
    if (speed != null) {
      if (isSsmlInput) {
        warnings.push({
          type: 'unsupported',
          feature: 'speed',
          details:
            'The speed option is ignored when the input is already SSML. ' +
            'Set the rate via <prosody rate="..."> in your SSML instead.',
        });
      } else {
        // Speechify has no speed parameter; prosody is controlled via SSML.
        input = `<speak><prosody rate="${Math.round(speed * 100)}%">${text}</prosody></speak>`;
      }
    }

    if (instructions != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'instructions',
        details:
          'Speechify does not support natural-language voice instructions. ' +
          'Use SSML in the input text to control emotion, pitch, and speed.',
      });
    }

    const body: SpeechifySpeechRequest = {
      input,
      voice_id: voice ?? DEFAULT_VOICE_ID,
      model: this.modelId as Speechify.GetSpeechRequest.Model,
    };

    if (language != null) {
      body.language = language;
    }

    // providerOptions.speechify.outputFormat (codec string) takes precedence,
    // mirroring the API where output_format overrides audio_format.
    if (speechifyOptions?.outputFormat != null) {
      body.output_format = speechifyOptions.outputFormat;
    } else if (outputFormat != null) {
      if (CODEC_OUTPUT_FORMAT_REGEX.test(outputFormat)) {
        body.output_format = outputFormat;
      } else if (SIMPLE_AUDIO_FORMATS.has(outputFormat)) {
        body.audio_format = outputFormat as SpeechifySpeechAudioFormat;
      } else {
        warnings.push({
          type: 'unsupported',
          feature: `outputFormat: ${outputFormat}`,
          details:
            'Supported formats: wav, mp3, ogg, aac, pcm, or a Speechify codec ' +
            'string such as mp3_24000_128, pcm_16000, ulaw_8000.',
        });
      }
    }

    // Default to mp3 rather than the server default (currently wav, ~9x
    // larger, and documented as subject to change).
    if (body.output_format == null && body.audio_format == null) {
      body.audio_format = 'mp3';
    }

    if (
      speechifyOptions?.loudnessNormalization != null ||
      speechifyOptions?.textNormalization != null
    ) {
      body.options = {
        ...(speechifyOptions.loudnessNormalization != null && {
          loudness_normalization: speechifyOptions.loudnessNormalization,
        }),
        ...(speechifyOptions.textNormalization != null && {
          text_normalization: speechifyOptions.textNormalization,
        }),
      };
    }

    return { body, warnings };
  }

  async doGenerate(options: SpeechModelV4CallOptions) {
    const currentDate =
      this.config._internal?.currentDate?.() ?? new Date();

    const { body, warnings } = await this.getArgs(options);

    let response: Speechify.GetSpeechResponse;
    let responseHeaders: Record<string, string> | undefined;
    try {
      const { data, rawResponse } = await this.config.client.audio
        .speech(body, {
          abortSignal: options.abortSignal,
          headers: options.headers,
        })
        .withRawResponse();
      response = data;
      responseHeaders = Object.fromEntries(rawResponse.headers.entries());
    } catch (error) {
      throw convertSpeechifyError(error, body);
    }

    return {
      audio: convertBase64ToUint8Array(response.audio_data),
      warnings,
      request: {
        body: JSON.stringify(body),
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
        body: response as unknown as JSONValue,
      },
      providerMetadata: {
        speechify: {
          audioFormat: response.audio_format ?? null,
          billableCharactersCount:
            response.billable_characters_count ?? null,
          speechMarks: (response.speech_marks ?? null) as unknown as JSONValue,
        },
      },
    };
  }
}
