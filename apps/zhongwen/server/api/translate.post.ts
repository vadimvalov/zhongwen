import { createGoogleTranslateClient } from "../utils/google-translate";

const ALLOWED_LANGS = new Set(["zh-CN", "ru", "kk", "en"]);
const MAX_TEXT_LENGTH = 500;
const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour

type IpEntry = {
  requests: { time: number; chars: number }[];
  blockedUntil: number;
};
const ipMap = new Map<string, IpEntry>();

function checkAnomaly(ip: string, chars: number): true | "blocked" {
  const now = Date.now();
  let entry = ipMap.get(ip);
  if (!entry) {
    entry = { requests: [], blockedUntil: 0 };
    ipMap.set(ip, entry);
  }
  if (now < entry.blockedUntil) {
    return "blocked";
  }

  entry.requests = entry.requests.filter((r) => now - r.time < 60_000);
  entry.requests.push({ time: now, chars });

  const last30s = entry.requests.filter((r) => now - r.time < 30_000);
  const totalChars60s = entry.requests.reduce((sum, r) => sum + r.chars, 0);

  if (last30s.length > 10 || totalChars60s > 3000) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    return "blocked";
  }
  return true;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const apiKey = config.googleApiKey as string | undefined;
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: "Google API key not configured" });
  }

  const body = await readBody<{ text?: string; sourceLang?: string; targetLang?: string }>(event);
  const text = body?.text?.trim();
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: "Missing text" });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Text exceeds ${MAX_TEXT_LENGTH} characters`,
    });
  }

  const sourceLang = body?.sourceLang;
  const targetLang = body?.targetLang;
  if (!sourceLang || !targetLang) {
    throw createError({ statusCode: 400, statusMessage: "Missing sourceLang or targetLang" });
  }
  if (!ALLOWED_LANGS.has(sourceLang) || !ALLOWED_LANGS.has(targetLang)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid language" });
  }
  if (sourceLang !== "zh-CN" && targetLang !== "zh-CN") {
    throw createError({ statusCode: 400, statusMessage: "One language must be zh-CN" });
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  const anomaly = checkAnomaly(ip, text.length);
  if (anomaly === "blocked") {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests. Your IP has been temporarily blocked.",
    });
  }

  const translator = createGoogleTranslateClient(apiKey);
  const translation = await translator
    .translate(text, sourceLang, targetLang)
    .catch((err: Error) => {
      throw createError({ statusCode: 500, statusMessage: err.message });
    });

  return { translation };
});
