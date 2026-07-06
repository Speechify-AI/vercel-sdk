import { afterEach, describe, expect, it, vi } from 'vitest';
import { NoSuchModelError } from '@ai-sdk/provider';
import { createSpeechify } from './speechify-provider';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createSpeechify', () => {
  it('creates speech models via call, .speech, and .speechModel', () => {
    const provider = createSpeechify({ apiKey: 'k' });

    for (const model of [
      provider('simba-multilingual'),
      provider.speech('simba-multilingual'),
      provider.speechModel('simba-multilingual'),
    ]) {
      expect(model.specificationVersion).toBe('v4');
      expect(model.provider).toBe('speechify.speech');
      expect(model.modelId).toBe('simba-multilingual');
    }
  });

  it('defaults modelId to simba-3.2', () => {
    expect(createSpeechify({ apiKey: 'k' }).speech().modelId).toBe(
      'simba-3.2',
    );
  });

  it('throws NoSuchModelError for non-speech model types', () => {
    const provider = createSpeechify({ apiKey: 'k' }) as unknown as Record<
      string,
      (id: string) => unknown
    >;

    for (const modelType of [
      'languageModel',
      'embeddingModel',
      'textEmbeddingModel',
      'imageModel',
      'transcriptionModel',
    ]) {
      expect(() => provider[modelType]('some-model')).toThrowError(
        NoSuchModelError,
      );
    }
  });

  it('loads the API key from SPEECHIFY_API_KEY', async () => {
    vi.stubEnv('SPEECHIFY_API_KEY', 'env-key');
    const calls: RequestInit[] = [];
    const fetchMock = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response(JSON.stringify({ audio_data: '' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await createSpeechify({ fetch: fetchMock })
      .speech()
      .doGenerate({ text: 'hi' });

    const headers = new Headers(calls[0].headers as HeadersInit);
    expect(headers.get('authorization')).toBe('Bearer env-key');
  });

  it('respects a custom baseURL', async () => {
    const urls: string[] = [];
    const fetchMock = (async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ audio_data: '' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await createSpeechify({
      apiKey: 'k',
      baseURL: 'https://api.speechify.ai/',
      fetch: fetchMock,
    })
      .speech()
      .doGenerate({ text: 'hi' });

    expect(urls[0]).toBe('https://api.speechify.ai/v1/audio/speech');
  });
});
