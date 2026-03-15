import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export function createElevenLabsClient(apiKey: string) {
  const client = new ElevenLabsClient({ apiKey });

  return {
    async textToSpeech(
      voiceId: string,
      text: string,
      modelId: string,
      outputFormat: string,
    ): Promise<Buffer> {
      const stream = await client.textToSpeech.convert(voiceId, {
        text,
        modelId,
        outputFormat: outputFormat as "mp3_44100_128",
        voiceSettings: { speed: 1, stability: 0.5, similarityBoost: 0.75 },
      });
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    },
  };
}
