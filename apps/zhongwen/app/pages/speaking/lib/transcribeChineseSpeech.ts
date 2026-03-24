export async function transcribeChineseSpeech(blob: Blob, ext: string): Promise<string> {
  const file = new File([blob], `recording.${ext}`, { type: blob.type });
  const formData = new FormData();
  formData.append("file", file);

  // switched routing to speaking-python/main.py
  const { text } = await $fetch("http://localhost:8000/transcribe", {
    method: "POST",
    body: formData,
  });
  return text;
}
