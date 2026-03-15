const TTS_CACHE_MAX = 200;

let currentAudio: HTMLAudioElement | null = null;
const ttsCache = new Map<string, Blob>();

/** Use in components: const hasTts = useHasElevenLabs() */
export function useHasElevenLabs(): boolean {
  return !!useRuntimeConfig().public.hasElevenLabs;
}

function playBlob(blob: Blob): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  currentAudio = new Audio(objectUrl);

  return new Promise((resolve, reject) => {
    if (!currentAudio) return;
    currentAudio.addEventListener("ended", () => {
      URL.revokeObjectURL(objectUrl);
      currentAudio = null;
      resolve();
    });
    currentAudio.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      currentAudio = null;
      reject(new Error("Playback error"));
    });
    currentAudio.play().catch(reject);
  });
}

export async function speakWithElevenLabs(text: string, slug?: string): Promise<void> {
  const key = slug ? `${slug}:${text.trim()}` : text.trim();
  if (!text.trim()) return;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }

  const cachedBlob = ttsCache.get(key);
  if (cachedBlob) {
    ttsCache.delete(key);
    ttsCache.set(key, cachedBlob);
    return playBlob(cachedBlob);
  }

  const blob = await $fetch<Blob>("/api/tts", {
    method: "POST",
    body: { text: text.trim(), slug },
    responseType: "blob",
  });

  if (ttsCache.size >= TTS_CACHE_MAX) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey !== undefined) ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, blob);

  return playBlob(blob);
}
