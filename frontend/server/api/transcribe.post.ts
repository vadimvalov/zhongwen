import OpenAI from 'openai'
import { readMultipartFormData } from 'h3'

const CHINESE_TRANSCRIPTION_PROMPT =
  'This is Mandarin Chinese only. Transcribe exactly what is spoken in Chinese. Output must be Chinese characters (汉字) and/or pinyin only. Never use Korean (hangul), Japanese (kana/kanji), or any other language. If unclear, guess only in Chinese.'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.openaiApiKey as string | undefined
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: 'OpenAI API key not configured' })
  }

  const parts = await readMultipartFormData(event)
  const filePart = parts?.find((p) => p.name === 'file' || p.filename)
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file in form data' })
  }

  const openai = new OpenAI({ apiKey })
  const file = new File(
    [filePart.data as unknown as BlobPart],
    filePart.filename,
    { type: filePart.type ?? 'audio/webm' },
  )

  const result = await openai.audio.transcriptions.create({
    file,
    model: 'gpt-4o-mini-transcribe',
    language: 'zh',
    prompt: CHINESE_TRANSCRIPTION_PROMPT,
  })

  return { text: (result.text ?? '').trim() }
})
