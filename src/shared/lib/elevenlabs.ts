const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'
const MODEL_ID = 'eleven_multilingual_v2'
const TTS_CACHE_MAX = 200

let currentAudio: HTMLAudioElement | null = null
const ttsCache = new Map<string, Blob>()

export function hasElevenLabsKey(): boolean {
  return !!API_KEY?.trim()
}

function playBlob(blob: Blob): Promise<void> {
  const objectUrl = URL.createObjectURL(blob)
  currentAudio = new Audio(objectUrl)

  return new Promise((resolve, reject) => {
    if (!currentAudio) return
    currentAudio.addEventListener('ended', () => {
      URL.revokeObjectURL(objectUrl)
      currentAudio = null
      resolve()
    })
    currentAudio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl)
      currentAudio = null
      reject(new Error('Playback error'))
    })
    currentAudio.play().catch(reject)
  })
}

export async function speakWithElevenLabs(text: string): Promise<void> {
  const key = text.trim()
  if (!key) return
  if (!API_KEY) {
    throw new Error('API key not configured. Add VITE_ELEVENLABS_API_KEY to .env')
  }

  // Stop any ongoing playback
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }

  // Check cache (LRU: re-insert to mark as recently used)
  const cachedBlob = ttsCache.get(key)
  if (cachedBlob) {
    ttsCache.delete(key)
    ttsCache.set(key, cachedBlob)
    return playBlob(cachedBlob)
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify({
      text: key,
      model_id: MODEL_ID,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.message || err.message || `API error: ${res.status}`)
  }

  const blob = await res.blob()

  // Store in cache with LRU eviction
  if (ttsCache.size >= TTS_CACHE_MAX) {
    const oldestKey = ttsCache.keys().next().value
    if (oldestKey !== undefined) ttsCache.delete(oldestKey)
  }
  ttsCache.set(key, blob)

  return playBlob(blob)
}
