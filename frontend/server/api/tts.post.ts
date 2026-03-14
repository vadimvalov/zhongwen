import * as Minio from 'minio'

function getMinioClient() {
  return new Minio.Client({
    endPoint: process.env.NUXT_MINIO_ENDPOINT!,
    port: 443,
    useSSL: true,
    accessKey: process.env.NUXT_MINIO_ACCESS_KEY!,
    secretKey: process.env.NUXT_MINIO_SECRET_KEY!,
  })
}

function getObjectKey(text: string, slug?: string): string {
  if (slug) return `${slug}.mp3`
  return `${text.trim().slice(0, 80)}.mp3`
}

async function getFromMinio(
  client: Minio.Client,
  bucket: string,
  key: string,
): Promise<Buffer | null> {
  try {
    const stream = await client.getObject(bucket, key)
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'NoSuchKey'
    ) {
      return null
    }
    throw err
  }
}

async function saveToMinio(
  client: Minio.Client,
  bucket: string,
  key: string,
  data: Buffer,
): Promise<void> {
  await client.putObject(bucket, key, data, data.length, {
    'Content-Type': 'audio/mpeg',
  })
}

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'
const MODEL_ID = 'eleven_multilingual_v2'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.elevenlabsApiKey as string | undefined
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: 'ElevenLabs API key not configured' })
  }

  const raw = await new Promise<string>((resolve, reject) => {
    let data = ''
    event.node.req.on('data', (chunk: Buffer) => (data += chunk.toString()))
    event.node.req.on('end', () => resolve(data))
    event.node.req.on('error', reject)
  })
  const body = JSON.parse(raw || '{}') as { text?: string; slug?: string }
  const text = body?.text?.trim()
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'Missing text' })
  }

  const bucket = process.env.NUXT_MINIO_BUCKET || 'audio'
  const key = getObjectKey(text, body.slug)

  try {
    const minio = getMinioClient()
    const cached = await getFromMinio(minio, bucket, key)
    if (cached) {
      console.log('[TTS] cache hit:', key)
      event.node?.res?.setHeader('Content-Type', 'audio/mpeg')
      return cached
    }
    console.log('[TTS] cache miss, generating...')
  } catch (err) {
    console.warn('[TTS] MinIO read error:', err)
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { speed: 1 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw createError({
      statusCode: res.status,
      statusMessage: (err as { detail?: { message?: string } })?.detail?.message ?? res.statusText,
    })
  }

  const arrayBuffer = await res.arrayBuffer()
  const audioBuffer = Buffer.from(arrayBuffer)

  const minio = getMinioClient()
  saveToMinio(minio, bucket, key, audioBuffer)
    .then(() => console.log('[TTS] saved to MinIO:', key))
    .catch((err) => console.warn('[TTS] MinIO write error:', err))

  event.node?.res?.setHeader('Content-Type', 'audio/mpeg')
  return audioBuffer
})
