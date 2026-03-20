import { d as defineEventHandler, c as createError, a as readBody, s as setResponseHeaders, u as useRuntimeConfig } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'rou3';
import 'srvx';

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MODEL_ID = "eleven_multilingual_v2";
const tts_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const config = useRuntimeConfig();
  const apiKey = config.elevenlabsApiKey;
  if (!(apiKey == null ? void 0 : apiKey.trim())) {
    throw createError({ statusCode: 503, statusMessage: "ElevenLabs API key not configured" });
  }
  const body = await readBody(event);
  const text = (_a = body == null ? void 0 : body.text) == null ? void 0 : _a.trim();
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: "Missing text" });
  }
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { speed: (_b = body.speed) != null ? _b : 1 }
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw createError({
      statusCode: res.status,
      statusMessage: (_d = (_c = err == null ? void 0 : err.detail) == null ? void 0 : _c.message) != null ? _d : res.statusText
    });
  }
  const blob = await res.arrayBuffer();
  setResponseHeaders(event, {
    "Content-Type": "audio/mpeg"
  });
  return blob;
});

export { tts_post as default };
//# sourceMappingURL=tts.post.mjs.map
