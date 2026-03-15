import { createS3Client } from "../utils/s3";

type TtsBody = {
  slug?: string;
  text?: string;
};

function getObjectKey(text: string, slug?: string): string {
  if (slug) return `${slug}.mp3`;
  return `${text.trim().slice(0, 80)}.mp3`;
}

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MODEL_ID = "eleven_multilingual_v2";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const apiKey = config.elevenlabsApiKey as string | undefined;
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: "ElevenLabs API key not configured" });
  }

  const body = await readBody<TtsBody>(event);
  const text = body?.text?.trim();
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: "Missing text" });
  }

  const key = getObjectKey(text, body.slug);
  const s3 =
    config.s3Endpoint && config.s3AccessKey && config.s3SecretKey && config.s3Bucket
      ? createS3Client({
          endpoint: config.s3Endpoint,
          accessKey: config.s3AccessKey,
          secretKey: config.s3SecretKey,
          bucket: config.s3Bucket,
        })
      : null;

  try {
    const cached = s3 ? await s3.get(key) : null;
    if (cached) {
      console.log("[TTS] cache hit:", key);
      setHeader(event, "Content-Type", "audio/mpeg");
      return cached;
    }
    if (s3) console.log("[TTS] cache miss, generating...");
  } catch (err) {
    console.warn("[TTS] S3 read error:", err);
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { speed: 1 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw createError({
      statusCode: res.status,
      statusMessage: (err as { detail?: { message?: string } })?.detail?.message ?? res.statusText,
    });
  }

  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  if (s3) {
    void s3
      .put(key, audioBuffer, "audio/mpeg")
      .then(() => console.log("[TTS] saved to S3:", key))
      .catch((err) => console.warn("[TTS] S3 write error:", err));
  }

  setHeader(event, "Content-Type", "audio/mpeg");
  return audioBuffer;
});
