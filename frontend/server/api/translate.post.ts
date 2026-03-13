const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'

async function readJsonBody(event: any): Promise<{ text?: string }> {
  const req = event.node?.req ?? event.req
  if (!req) return {}

  return await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: any) => {
      data += chunk
    })
    req.on('end', () => {
      if (!data) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
    req.on('error', (err: any) => {
      reject(err)
    })
  })
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.googleApiKey as string | undefined
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: 'Google API key not configured' })
  }

  const body = await readJsonBody(event)
  const text = body?.text?.trim()
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'Missing text' })
  }

  const params = new URLSearchParams({
    q: text,
    target: 'en',
    source: 'zh-CN',
    key: apiKey,
  })

  const res = await fetch(`${GOOGLE_TRANSLATE_URL}?${params.toString()}`, {
    method: 'POST',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const message = (err as { error?: { message?: string } })?.error?.message ?? res.statusText
    throw createError({ statusCode: res.status, statusMessage: message })
  }

  const data = (await res.json()) as {
    data?: { translations?: Array<{ translatedText?: string }> }
  }
  const translatedText =
    data?.data?.translations?.[0]?.translatedText?.trim() ?? ''

  return { translation: translatedText }
})
