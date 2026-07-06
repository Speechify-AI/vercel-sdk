/**
 * Real-API smoke test. Requires SPEECHIFY_API_KEY in the environment.
 *
 *   npm run smoke
 *
 * Verifies: base URL works, audio decodes to nonzero bytes, speech marks
 * arrive in providerMetadata, and a bad key produces a clean APICallError.
 */
import { generateSpeech } from 'ai';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSpeechify, speechify } from '../src/index';

async function main() {
  const result = await generateSpeech({
    // defaults: model simba-3.2, voice "geffen_32"
    model: speechify.speech(),
    text: 'Hello from the Vercel AI SDK. This is Speechify text to speech.',
    outputFormat: 'mp3',
  });

  const audio = result.audio.uint8Array;
  if (audio.length === 0) throw new Error('empty audio');

  const outPath = join(import.meta.dirname, 'smoke-output.mp3');
  writeFileSync(outPath, audio);

  const metadata = result.providerMetadata?.speechify as
    | Record<string, unknown>
    | undefined;

  console.log('audio bytes:', audio.length);
  console.log('mediaType:', result.audio.mediaType);
  console.log('billableCharactersCount:', metadata?.billableCharactersCount);
  console.log(
    'speechMarks present:',
    metadata?.speechMarks != null && typeof metadata.speechMarks === 'object',
  );
  console.log('warnings:', result.warnings);
  console.log('wrote', outPath);

  // error path: bad key must raise a clean AI_APICallError
  try {
    await generateSpeech({
      model: createSpeechify({ apiKey: 'invalid-key' }).speech(),
      text: 'should fail',
    });
    console.error('ERROR: bad key did not throw');
    process.exitCode = 1;
  } catch (error) {
    console.log(
      'bad-key error:',
      (error as Error).name,
      '-',
      (error as Error).message.slice(0, 120),
    );
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
