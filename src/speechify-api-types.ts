import { z } from 'zod';

export type SpeechifySpeechModelId =
  | 'simba-english'
  | 'simba-multilingual'
  | 'simba-3.0'
  | (string & {});

export type SpeechifySpeechAudioFormat = 'wav' | 'mp3' | 'ogg' | 'aac' | 'pcm';

export type SpeechifySpeechRequest = {
  input: string;
  voice_id: string;
  model?: string;
  language?: string;
  audio_format?: SpeechifySpeechAudioFormat;
  output_format?: string;
  options?: {
    loudness_normalization?: boolean;
    text_normalization?: boolean;
  };
};

const speechMarkChunkSchema = z
  .object({
    type: z.string().nullish(),
    value: z.string().nullish(),
    start: z.number().nullish(),
    end: z.number().nullish(),
    start_time: z.number().nullish(),
    end_time: z.number().nullish(),
  })
  .loose();

export const speechifySpeechResponseSchema = z
  .object({
    audio_data: z.string(),
    audio_format: z.string().nullish(),
    billable_characters_count: z.number().nullish(),
    speech_marks: speechMarkChunkSchema
      .extend({ chunks: z.array(speechMarkChunkSchema).nullish() })
      .nullish(),
  })
  .loose();

export type SpeechifySpeechResponse = z.infer<
  typeof speechifySpeechResponseSchema
>;
