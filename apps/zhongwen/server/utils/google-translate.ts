const TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";

export function createGoogleTranslateClient(apiKey: string) {
  return {
    async translate(text: string, source: string, target: string): Promise<string> {
      const params = new URLSearchParams({ q: text, source, target, key: apiKey });
      const res = await fetch(`${TRANSLATE_URL}?${params.toString()}`, { method: "POST" });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = (err as { error?: { message?: string } })?.error?.message ?? res.statusText;
        throw new Error(message);
      }

      const data = (await res.json()) as {
        data?: { translations?: Array<{ translatedText?: string }> };
      };
      return data?.data?.translations?.[0]?.translatedText?.trim() ?? "";
    },
  };
}
