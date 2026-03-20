import { d as defineEventHandler, c as createError, r as readMultipartFormData, u as useRuntimeConfig } from '../../nitro/nitro.mjs';
import OpenAI from 'openai';
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

const CHINESE_TRANSCRIPTION_PROMPT = "This is Mandarin Chinese only. Transcribe exactly what is spoken in Chinese. Output must be Chinese characters (\u6C49\u5B57) and/or pinyin only. Never use Korean (hangul), Japanese (kana/kanji), or any other language. If unclear, guess only in Chinese.";
const transcribe_post = defineEventHandler(async (event) => {
  var _a, _b;
  const config = useRuntimeConfig();
  const apiKey = config.openaiApiKey;
  if (!(apiKey == null ? void 0 : apiKey.trim())) {
    throw createError({ statusCode: 503, statusMessage: "OpenAI API key not configured" });
  }
  const parts = await readMultipartFormData(event);
  const filePart = parts == null ? void 0 : parts.find((p) => p.name === "file" || p.filename);
  if (!(filePart == null ? void 0 : filePart.data) || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: "Missing file in form data" });
  }
  const openai = new OpenAI({ apiKey });
  const file = new File(
    [filePart.data],
    filePart.filename,
    { type: (_a = filePart.type) != null ? _a : "audio/webm" }
  );
  const result = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    language: "zh",
    prompt: CHINESE_TRANSCRIPTION_PROMPT
  });
  return { text: ((_b = result.text) != null ? _b : "").trim() };
});

export { transcribe_post as default };
//# sourceMappingURL=transcribe.post.mjs.map
