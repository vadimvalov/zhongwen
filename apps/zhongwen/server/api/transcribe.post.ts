import { createOpenAI } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";
import { readMultipartFormData } from "h3";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const apiKey = config.openaiApiKey as string | undefined;
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: "OpenAI API key not configured" });
  }

  const parts = await readMultipartFormData(event);
  const filePart = parts?.find((p) => p.name === "file" || p.filename);
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: "Missing file in form data" });
  }

  const openai = createOpenAI({ apiKey });

  const model = openai.transcription("gpt-4o-mini-transcribe");

  const result = await transcribe({
    model,
    audio: filePart.data,
    providerOptions: {
      openai: {
        language: "zh",
      },
    },
  });

  return { text: (result.text ?? "").trim() };
});
