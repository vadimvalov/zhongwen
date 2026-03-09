export async function transcribeChineseSpeech(blob: Blob, ext: string): Promise<string> {
  const file = new File([blob], `recording.${ext}`, { type: blob.type })
  const formData = new FormData()
  formData.append('file', file)

  const { text } = await $fetch<{ text: string }>('/api/transcribe', {
    method: 'POST',
    body: formData,
  })
  return text
}
