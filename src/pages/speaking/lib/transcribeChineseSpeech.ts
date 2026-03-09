import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
  baseURL: `${window.location.origin}/openai-proxy/v1`,
  dangerouslyAllowBrowser: true,
})

const CHINESE_TRANSCRIPTION_PROMPT =
  'This is Mandarin Chinese only. Transcribe exactly what is spoken in Chinese. Output must be Chinese characters (汉字) and/or pinyin only. Never use Korean (hangul), Japanese (kana/kanji), or any other language. If unclear, guess only in Chinese.'

export async function transcribeChineseSpeech(blob: Blob, ext: string): Promise<string> {
  const file = new File([blob], `recording.${ext}`, { type: blob.type })
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'gpt-4o-mini-transcribe',
    language: 'zh',
    prompt: CHINESE_TRANSCRIPTION_PROMPT,
  })

  return (result.text ?? '').trim()
}
