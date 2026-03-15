import { createGoogleTranslateClient } from "../utils/google-translate";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const apiKey = config.googleApiKey as string | undefined;
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: "Google API key not configured" });
  }

  const body = await readBody<{ text?: string }>(event);
  const text = body?.text?.trim();
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: "Missing text" });
  }

  const translator = createGoogleTranslateClient(apiKey);
  const translation = await translator.translate(text, "zh-CN", "en").catch((err: Error) => {
    throw createError({ statusCode: 500, statusMessage: err.message });
  });

  return { translation };
});
