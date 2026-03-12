const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'
const MODEL_ID = 'eleven_multilingual_v2'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.elevenlabsApiKey as string | undefined
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: 'ElevenLabs API key not configured' })
  }

  const body = (await readBody(event)) as { text?: string; speed?: number }
  const text = body?.text?.trim()
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'Missing text' })
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey as string,
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { speed: body.speed ?? 1 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw createError({
      statusCode: res.status,
      statusMessage: (err as { detail?: { message?: string } })?.detail?.message ?? res.statusText,
    })
  }

  const blob = await res.arrayBuffer()
  setResponseHeaders(event, {
    'Content-Type': 'audio/mpeg',
  })
  return blob
})
