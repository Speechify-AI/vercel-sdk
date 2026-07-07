import { NoSuchModelError } from '@ai-sdk/provider';
import type { SpeechModelV4 } from '@ai-sdk/provider';
import {
  loadApiKey,
  withoutTrailingSlash,
  type FetchFunction,
} from '@ai-sdk/provider-utils';
import { SpeechifyClient } from '@speechify/api';
import type { SpeechifySpeechModelId } from './speechify-api-types';
import { SpeechifySpeechModel } from './speechify-speech-model';
import { VERSION } from './version';

const USER_AGENT_SUFFIX = `ai-sdk/speechify/${VERSION}`;

// Appends our marker to the User-Agent the @speechify/api client sets
// (e.g. "@speechify/api/2.0.0 ai-sdk/speechify/0.2.0"). Passing the
// suffix as a client header would *replace* the SDK's User-Agent and
// make this traffic unattributable as SDK-derived, so it is appended
// at the fetch layer instead.
function withUserAgentSuffixFetch(
  baseFetch: FetchFunction | undefined,
): FetchFunction {
  const fetchImpl = (baseFetch ?? globalThis.fetch) as typeof fetch;
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    const existing = headers.get('user-agent');
    headers.set(
      'user-agent',
      existing != null && !existing.includes(USER_AGENT_SUFFIX)
        ? `${existing} ${USER_AGENT_SUFFIX}`
        : (existing ?? USER_AGENT_SUFFIX),
    );
    return fetchImpl(input, { ...init, headers });
  };
}

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
   * Base URL of the Speechify API. Defaults to the `@speechify/api`
   * client's default environment (`https://api.speechify.ai`).
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
  const baseURL = withoutTrailingSlash(options.baseURL);

  // The bridge delegates transport to the official @speechify/api client.
  // maxRetries is 0 because the AI SDK applies its own retry policy on
  // top of `doGenerate`.
  const client = new SpeechifyClient({
    apiKey: () =>
      loadApiKey({
        apiKey: options.apiKey,
        environmentVariableName: 'SPEECHIFY_API_KEY',
        description: 'Speechify',
      }),
    ...(baseURL != null && { baseUrl: baseURL }),
    headers: { ...options.headers },
    fetch: withUserAgentSuffixFetch(options.fetch) as typeof fetch,
    maxRetries: 0,
  });

  const createSpeechModel = (
    modelId: SpeechifySpeechModelId = 'simba-3.2',
  ) =>
    new SpeechifySpeechModel(modelId, {
      provider: 'speechify.speech',
      client,
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
