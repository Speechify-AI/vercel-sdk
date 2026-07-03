import { createJsonErrorResponseHandler } from '@ai-sdk/provider-utils';
import { z } from 'zod';

// Speechify API errors are JSON; the exact shape varies by endpoint, so the
// schema is intentionally loose and falls back to the raw message field.
export const speechifyErrorDataSchema = z
  .object({
    message: z.string().nullish(),
    error: z
      .union([z.string(), z.object({ message: z.string().nullish() }).loose()])
      .nullish(),
  })
  .loose();

export type SpeechifyErrorData = z.infer<typeof speechifyErrorDataSchema>;

export const speechifyFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: speechifyErrorDataSchema,
  errorToMessage: data => {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (data.error && typeof data.error === 'object' && data.error.message) {
      return data.error.message;
    }
    return 'Unknown Speechify API error';
  },
});
