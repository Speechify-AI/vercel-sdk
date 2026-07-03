import { NoSuchModelError } from '@ai-sdk/provider';
import type { SpeechModelV4 } from '@ai-sdk/provider';
import {
  loadApiKey,
  withUserAgentSuffix,
  withoutTrailingSlash,
  type FetchFunction,
} from '@ai-sdk/provider-utils';
import type { SpeechifySpeechModelId } from './speechify-api-types';
import { SpeechifySpeechModel } from './speechify-speech-model';
import { VERSION } from './version';

const DEFAULT_BASE_URL = 'https://api.sws.speechify.com';

export interface SpeechifyProvider {
  /**
   * Creates a speech model for Speechify text-to-speech synthesis.
   */
  (modelId?: SpeechifySpeechModelId): SpeechModelV4;

  /**
   * Creates a speech model for Speechify text-to-speech synthesis.
   */
  speech(modelId?: SpeechifySpeechModelId): SpeechModelV4;

  /**
   * Alias of `speech` matching the AI SDK provider interface.
   */
  speechModel(modelId?: SpeechifySpeechModelId): SpeechModelV4;
}

export interface SpeechifyProviderSettings {
  /**
   * Speechify API key. Defaults to the `SPEECHIFY_API_KEY` environment variable.
   */
  apiKey?: string;

  /**
   * Base URL of the Speechify API. Defaults to `https://api.sws.speechify.com`.
   */
  baseURL?: string;

  /**
   * Custom headers to include in every request.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation, e.g. for testing or middleware.
   */
  fetch?: FetchFunction;
}

export function createSpeechify(
  options: SpeechifyProviderSettings = {},
): SpeechifyProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL) ?? DEFAULT_BASE_URL;

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: 'SPEECHIFY_API_KEY',
          description: 'Speechify',
        })}`,
        ...options.headers,
      },
      `ai-sdk/speechify/${VERSION}`,
    );

  const createSpeechModel = (
    modelId: SpeechifySpeechModelId = 'simba-english',
  ) =>
    new SpeechifySpeechModel(modelId, {
      provider: 'speechify.speech',
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const provider = function (modelId?: SpeechifySpeechModelId) {
    return createSpeechModel(modelId);
  } as unknown as SpeechifyProvider;

  provider.speech = createSpeechModel;
  provider.speechModel = createSpeechModel;

  // Speechify offers TTS only — there is no language / embedding /
  // transcription model surface to expose.
  const unsupported = (
    modelType: ConstructorParameters<typeof NoSuchModelError>[0]['modelType'],
  ) =>
    ((modelId: string) => {
      throw new NoSuchModelError({ modelId, modelType });
    }) as never;

  Object.assign(provider, {
    languageModel: unsupported('languageModel'),
    embeddingModel: unsupported('embeddingModel'),
    textEmbeddingModel: unsupported('embeddingModel'),
    imageModel: unsupported('imageModel'),
    transcriptionModel: unsupported('transcriptionModel'),
  });

  return provider;
}

/**
 * Default Speechify provider instance (uses the `SPEECHIFY_API_KEY`
 * environment variable).
 */
export const speechify = createSpeechify();
