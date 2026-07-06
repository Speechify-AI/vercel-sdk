import type { Speechify } from '@speechify/api';

// 'simba-3.2' (the recommended Simba 3 model) is in the live API but not
// in the generated SDK's Model union yet, so it is added explicitly.
export type SpeechifySpeechModelId =
  | Speechify.GetSpeechRequest.Model
  | 'simba-3.2'
  | (string & {});

export type SpeechifySpeechAudioFormat = Speechify.GetSpeechRequest.AudioFormat;

// The live API also accepts codec strings (e.g. mp3_24000_128, pcm_16000)
// via `output_format`, which overrides `audio_format`. The generated SDK
// type does not include the field yet, so we extend it here.
export type SpeechifySpeechRequest = Speechify.GetSpeechRequest & {
  output_format?: string;
};
