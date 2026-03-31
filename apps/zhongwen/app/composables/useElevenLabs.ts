const TTS_CACHE_MAX = 200;

let currentAudio: HTMLAudioElement | null = null;
const ttsCache = new Map<string, Blob>();

// counter for playback of the same text to slow down if played multiple times
const playCounts = new Map<string, number>();

export function useHasElevenLabs() {
  return true;
}

function playBlob(blob: Blob, playCount: number) {
  const objectUrl = URL.createObjectURL(blob);
  currentAudio = new Audio(objectUrl);

  // slowing down playback if the same text is played multiple times
  if (playCount > 1) {
    currentAudio.playbackRate = 0.6;
  }

  currentAudio.volume = 0.35;

  return new Promise<void>((resolve, reject) => {
    if (!currentAudio) {
      return;
    }
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

export async function speakWithElevenLabs(text: string, slug?: string) {
  const key = slug ? `${slug}:${text.trim()}` : text.trim();
  if (!text.trim()) {
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }

  const count = (playCounts.get(key) || 0) + 1;
  playCounts.set(key, count);

  const cachedBlob = ttsCache.get(key);
  if (cachedBlob) {
    ttsCache.delete(key);
    ttsCache.set(key, cachedBlob);
    return await playBlob(cachedBlob, count);
  }

  const blob = await $fetch<Blob>("/api/tts", {
    method: "POST",
    body: { text: text.trim(), slug },
    responseType: "blob",
  });

  if (ttsCache.size >= TTS_CACHE_MAX) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey !== undefined) {
      ttsCache.delete(oldestKey);
      playCounts.delete(oldestKey);
    }
  }
  ttsCache.set(key, blob);

  return await playBlob(blob, count);
}
