import { APICallError } from '@ai-sdk/provider';
import { SpeechifyError } from '@speechify/api';

// Speechify API errors are JSON of the shape {"error":{"code","message"},
// "request_id"}, but older surfaces use {"message"} or {"error": "..."}.
function extractErrorMessage(body: unknown): string | undefined {
  if (body == null || typeof body !== 'object') {
    return undefined;
  }
  const record = body as Record<string, unknown>;
  const nested = record.error;
  if (typeof nested === 'string') {
    return nested;
  }
  if (nested != null && typeof nested === 'object') {
    const message = (nested as Record<string, unknown>).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  if (typeof record.message === 'string') {
    return record.message;
  }
  return undefined;
}

/**
 * Converts errors thrown by the `@speechify/api` client into the error
 * types the AI SDK expects: user aborts are re-thrown as the original
 * `AbortError`, HTTP failures become `APICallError` (whose status code
 * drives the AI SDK retry logic).
 */
export function convertSpeechifyError(
  error: unknown,
  requestBodyValues: unknown,
): unknown {
  if (!(error instanceof SpeechifyError)) {
    return error;
  }

  // The Fern fetcher wraps user aborts; the AI SDK detects aborts by the
  // original error's name.
  if (error.cause instanceof Error && error.cause.name === 'AbortError') {
    return error.cause;
  }

  const { statusCode, body, rawResponse } = error;

  return new APICallError({
    message: extractErrorMessage(body) ?? error.message,
    url: rawResponse?.url ?? '',
    requestBodyValues,
    statusCode,
    responseHeaders:
      rawResponse != null
        ? Object.fromEntries(rawResponse.headers.entries())
        : undefined,
    responseBody: typeof body === 'string' ? body : JSON.stringify(body),
    data: body,
    cause: error,
    isRetryable:
      statusCode != null &&
      (statusCode === 408 ||
        statusCode === 409 ||
        statusCode === 429 ||
        statusCode >= 500),
  });
}
