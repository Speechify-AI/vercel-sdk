import type { FetchFunction } from '@ai-sdk/provider-utils';

export type SpeechifyConfig = {
  provider: string;
  url: (options: { path: string }) => string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  _internal?: {
    currentDate?: () => Date;
  };
};
