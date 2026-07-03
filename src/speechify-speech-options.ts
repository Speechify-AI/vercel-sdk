import { z } from 'zod';

export const speechifySpeechProviderOptionsSchema = z.object({
  /**
   * Set to true when `text` is already SSML (`<speak>…</speak>`).
   * Disables the automatic SSML prosody wrapping used to implement `speed`.
   */
  ssml: z.boolean().nullish(),

  /**
   * Speechify codec output format string, e.g. `mp3_24000_128`, `pcm_16000`,
   * `ulaw_8000`. Takes precedence over the standard `outputFormat` call option.
   */
  outputFormat: z.string().nullish(),

  /**
   * Whether to apply loudness normalization to the generated audio.
   */
  loudnessNormalization: z.boolean().nullish(),

  /**
   * Whether to apply text normalization (numbers, dates, …) before synthesis.
   */
  textNormalization: z.boolean().nullish(),
});

export type SpeechifySpeechProviderOptions = z.infer<
  typeof speechifySpeechProviderOptionsSchema
>;
