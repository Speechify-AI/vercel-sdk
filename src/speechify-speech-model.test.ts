import { describe, expect, it, vi } from 'vitest';
import { APICallError } from '@ai-sdk/provider';
import { createSpeechify } from './speechify-provider';

const AUDIO_BYTES = new Uint8Array([73, 68, 51, 4, 0]); // "ID3" mp3 header
const AUDIO_BASE64 = Buffer.from(AUDIO_BYTES).toString('base64');

const SPEECH_RESPONSE = {
  audio_data: AUDIO_BASE64,
  audio_format: 'mp3',
  billable_characters_count: 17,
  speech_marks: {
    type: 'sentence',
    value: 'Hello from tests.',
    start: 0,
    end: 17,
    start_time: 0,
    end_time: 1042,
    chunks: [
      { type: 'word', value: 'Hello', start: 0, end: 5, start_time: 0, end_time: 320 },
    ],
  },
};

function createMockFetch(
  response: unknown = SPEECH_RESPONSE,
  { status = 200 }: { status?: number } = {},
) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(response), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  });
  return { fetchMock, calls, body: () => JSON.parse(String(calls[0].init.body)) };
}

function createModel(
  mock: ReturnType<typeof createMockFetch>,
  modelId?: string,
) {
  return createSpeechify({ apiKey: 'test-key', fetch: fetchMock(mock) }).speech(
    modelId,
  );
}

const fetchMock = (m: ReturnType<typeof createMockFetch>) =>
  m.fetchMock as unknown as typeof fetch;

describe('doGenerate', () => {
  it('returns decoded audio bytes and provider metadata', async () => {
    const mock = createMockFetch();
    const result = await createModel(mock).doGenerate({ text: 'Hello from tests.' });

    expect(result.audio).toEqual(AUDIO_BYTES);
    expect(result.warnings).toEqual([]);
    expect(result.providerMetadata?.speechify).toMatchObject({
      audioFormat: 'mp3',
      billableCharactersCount: 17,
    });
    expect(
      (result.providerMetadata?.speechify as { speechMarks: { chunks: unknown[] } })
        .speechMarks.chunks,
    ).toHaveLength(1);
    expect(result.response.modelId).toBe('simba-3.2');
  });

  it('posts to /v1/audio/speech with bearer auth and user agent', async () => {
    const mock = createMockFetch();
    await createModel(mock).doGenerate({ text: 'hi' });

    expect(mock.calls[0].url).toBe(
      'https://api.speechify.ai/v1/audio/speech',
    );
    const headers = new Headers(mock.calls[0].init.headers as HeadersInit);
    expect(headers.get('authorization')).toBe('Bearer test-key');
    expect(headers.get('user-agent')).toContain('ai-sdk/speechify/');
  });

  it('maps text, voice, model, and language', async () => {
    const mock = createMockFetch();
    await createModel(mock, 'simba-multilingual').doGenerate({
      text: 'Bonjour',
      voice: 'scott',
      language: 'fr-FR',
    });

    expect(mock.body()).toMatchObject({
      input: 'Bonjour',
      voice_id: 'scott',
      model: 'simba-multilingual',
      language: 'fr-FR',
    });
  });

  it('defaults voice_id and model when omitted', async () => {
    const mock = createMockFetch();
    await createModel(mock).doGenerate({ text: 'hi' });

    expect(mock.body()).toMatchObject({
      voice_id: 'geffen_32',
      model: 'simba-3.2',
    });
  });

  it('maps simple outputFormat names to audio_format', async () => {
    const mock = createMockFetch();
    await createModel(mock).doGenerate({ text: 'hi', outputFormat: 'wav' });

    expect(mock.body().audio_format).toBe('wav');
    expect(mock.body().output_format).toBeUndefined();
  });

  it('maps codec strings to output_format', async () => {
    const mock = createMockFetch();
    await createModel(mock).doGenerate({
      text: 'hi',
      outputFormat: 'pcm_16000',
    });

    expect(mock.body().output_format).toBe('pcm_16000');
    expect(mock.body().audio_format).toBeUndefined();
  });

  it('warns on unknown outputFormat and omits it', async () => {
    const mock = createMockFetch();
    const result = await createModel(mock).doGenerate({
      text: 'hi',
      outputFormat: 'flac',
    });

    expect(mock.body().audio_format).toBeUndefined();
    expect(mock.body().output_format).toBeUndefined();
    expect(result.warnings).toEqual([
      expect.objectContaining({ type: 'unsupported', feature: 'outputFormat: flac' }),
    ]);
  });

  it('wraps input in SSML prosody when speed is set', async () => {
    const mock = createMockFetch();
    await createModel(mock).doGenerate({ text: 'hi there', speed: 1.25 });

    expect(mock.body().input).toBe(
      '<speak><prosody rate="125%">hi there</prosody></speak>',
    );
  });

  it('skips prosody wrap and warns when input is already SSML', async () => {
    const mock = createMockFetch();
    const ssml = '<speak>hi <emphasis>there</emphasis></speak>';
    const result = await createModel(mock).doGenerate({ text: ssml, speed: 2 });

    expect(mock.body().input).toBe(ssml);
    expect(result.warnings).toEqual([
      expect.objectContaining({ type: 'unsupported', feature: 'speed' }),
    ]);
  });

  it('respects the providerOptions ssml flag', async () => {
    const mock = createMockFetch();
    const result = await createModel(mock).doGenerate({
      text: 'plain but treated as ssml',
      speed: 1.5,
      providerOptions: { speechify: { ssml: true } },
    });

    expect(mock.body().input).toBe('plain but treated as ssml');
    expect(result.warnings).toHaveLength(1);
  });

  it('warns on instructions', async () => {
    const mock = createMockFetch();
    const result = await createModel(mock).doGenerate({
      text: 'hi',
      instructions: 'speak slowly',
    });

    expect(result.warnings).toEqual([
      expect.objectContaining({ type: 'unsupported', feature: 'instructions' }),
    ]);
  });

  it('maps providerOptions to options and output_format override', async () => {
    const mock = createMockFetch();
    await createModel(mock).doGenerate({
      text: 'hi',
      outputFormat: 'mp3',
      providerOptions: {
        speechify: {
          outputFormat: 'mp3_24000_128',
          loudnessNormalization: true,
          textNormalization: false,
        },
      },
    });

    expect(mock.body()).toMatchObject({
      output_format: 'mp3_24000_128',
      options: { loudness_normalization: true, text_normalization: false },
    });
    expect(mock.body().audio_format).toBeUndefined();
  });

  it('throws APICallError with server message on failure', async () => {
    const mock = createMockFetch(
      { message: 'Invalid voice_id' },
      { status: 400 },
    );

    await expect(
      createModel(mock).doGenerate({ text: 'hi', voice: 'nope' }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        APICallError.isInstance(error) &&
        error.message === 'Invalid voice_id',
    );
  });

  it('does not retry inside the SDK client (the AI SDK owns retries)', async () => {
    const mock = createMockFetch(
      { error: { code: 'internal', message: 'boom' } },
      { status: 500 },
    );

    await expect(
      createModel(mock).doGenerate({ text: 'hi' }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        APICallError.isInstance(error) &&
        error.message === 'boom' &&
        error.isRetryable === true,
    );
    expect(mock.calls).toHaveLength(1);
  });

  it('passes through custom request headers', async () => {
    const mock = createMockFetch();
    await createModel(mock).doGenerate({
      text: 'hi',
      headers: { 'X-Custom': 'yes' },
    });

    const headers = new Headers(mock.calls[0].init.headers as HeadersInit);
    expect(headers.get('x-custom')).toBe('yes');
  });
});
