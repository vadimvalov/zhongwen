<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import OpenAI from 'openai'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { hasElevenLabsKey, speakWithElevenLabs } from '@/shared/lib/elevenlabs'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
  baseURL: `${window.location.origin}/openai-proxy/v1`,
  dangerouslyAllowBrowser: true,
})

type Word = {
  hanzi: string
  pinyin: string
  translation: string
}

const QUEUE_SIZE = 10

function formatDictName(id: string): string {
  return id.split('_').map((p) => p.toUpperCase()).join(' ')
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(count, arr.length))
}

// ── dictionary ───────────────────────────────────────────────────────────────
const route = useRoute()
const dictId = computed(() => route.params.id as string)
const dictTitle = computed(() => formatDictName(dictId.value))

const modules = import.meta.glob('@/assets/dictionaries/*.json', {
  eager: true,
}) as Record<string, { default: Word[] }>

const allWords = computed<Word[]>(() => {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`${dictId.value}.json`))
  return entry?.[1]?.default ?? []
})

// ── state (all declared first to avoid TDZ errors) ───────────────────────────
type Result = 'correct' | 'incorrect'

const queue = ref<Word[]>([])
const currentIndex = ref(0)
const score = ref(0)
const done = ref(false)
const revealed = ref(false)
const isRecording = ref(false)
const isTranscribing = ref(false)
const isSpeaking = ref(false)
const lastResult = ref<Result | null>(null)
const transcribedText = ref('')
const apiError = ref<string | null>(null)

// ── queue ────────────────────────────────────────────────────────────────────
function initQueue() {
  queue.value = pickRandom(allWords.value, QUEUE_SIZE)
  currentIndex.value = 0
  score.value = 0
  done.value = false
  revealed.value = false
  lastResult.value = null
  transcribedText.value = ''
  apiError.value = null
}
initQueue()

const currentWord = computed(() => queue.value[currentIndex.value] ?? null)
const progress = computed(() =>
  queue.value.length ? (currentIndex.value / queue.value.length) * 100 : 0,
)

// ── helpers ──────────────────────────────────────────────────────────────────
function normalize(text: string): string {
  return text.replace(/\s/g, '').toLowerCase()
}

function isMatch(transcription: string, word: Word): boolean {
  const t = normalize(transcription)
  return t.includes(normalize(word.hanzi)) || t === normalize(word.pinyin)
}

// Pick the best supported MIME type and return it with a matching file extension
function getBestMime(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: 'audio/mp4', ext: 'm4a' },
    { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
    { mimeType: 'audio/webm', ext: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c
  }
  return { mimeType: '', ext: 'webm' }
}

// ── transcription ─────────────────────────────────────────────────────────────
async function transcribeAudio(blob: Blob, ext: string, expectedWord: Word): Promise<string> {
  const file = new File([blob], `recording.${ext}`, { type: blob.type })

  console.log('[Whisper] Sending audio, size:', blob.size, 'type:', blob.type)

  const result = await openai.audio.transcriptions.create({
    file,
    model: 'gpt-4o-mini-transcribe',
    language: 'zh',
    prompt: `Expected word: ${expectedWord.hanzi} (${expectedWord.pinyin}). Language: Chinese.`,
  })

  const text = (result.text ?? '').trim()
  console.log('[Whisper] Got transcription:', text)
  return text
}

// ── recording ─────────────────────────────────────────────────────────────────
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let recordingExt = 'webm'

async function startRecording() {
  if (isRecording.value || isTranscribing.value || !currentWord.value) return
  apiError.value = null

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    apiError.value = 'Microphone access denied'
    return
  }

  const { mimeType, ext } = getBestMime()
  recordingExt = ext
  audioChunks = []

  mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data)
  }

  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop())
    isRecording.value = false
    isTranscribing.value = true

    const word = currentWord.value // capture before any index change

    try {
      const blob = new Blob(audioChunks, { type: mimeType || 'audio/webm' })
      const text = await transcribeAudio(blob, recordingExt, word!)
      transcribedText.value = text

      if (word) {
        const correct = isMatch(text, word)
        if (correct) {
          score.value++
          lastResult.value = 'correct'
        } else {
          lastResult.value = 'incorrect'
          // Auto-play correct pronunciation on wrong answer
          if (hasElevenLabsKey()) {
            isSpeaking.value = true
            void speakWithElevenLabs(word.hanzi).then(() => {
              isSpeaking.value = false
            }).catch(() => {
              isSpeaking.value = false
            })
          }
        }
      }
    } catch (e) {
      apiError.value = e instanceof Error ? e.message : 'Unknown error'
      lastResult.value = 'incorrect'
    } finally {
      isTranscribing.value = false
      // Always advance after delay, regardless of success or error
      setTimeout(() => {
        if (currentIndex.value < queue.value.length - 1) {
          currentIndex.value++
          revealed.value = false
          lastResult.value = null
          transcribedText.value = ''
          apiError.value = null
        } else {
          done.value = true
        }
      }, 1800)
    }
  }

  mediaRecorder.start()
  isRecording.value = true
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) mediaRecorder.stop()
}

function toggleRecording() {
  if (isRecording.value) stopRecording()
  else startRecording()
}

// ── TTS ──────────────────────────────────────────────────────────────────────
async function speak() {
  if (!currentWord.value || !hasElevenLabsKey() || isSpeaking.value) return
  isSpeaking.value = true
  try {
    await speakWithElevenLabs(currentWord.value.hanzi)
  } finally {
    isSpeaking.value = false
  }
}

function reveal() {
  revealed.value = true
}
</script>

<template>
  <div class="min-h-screen py-4 px-3 sm:py-8 sm:px-4 flex flex-col items-center">
    <div class="w-full max-w-md flex flex-col gap-4">

      <!-- Header -->
      <div class="flex items-center gap-2 sm:gap-3">
        <Link to="/speaking/words" :hover="true" class="shrink-0">
          <Button class="px-2 py-1 text-xs sm:text-sm">&larr;</Button>
        </Link>
        <h1 class="text-xl sm:text-2xl font-semibold text-foreground">{{ dictTitle }}</h1>
        <span class="ml-auto text-sm font-medium text-muted-foreground tabular-nums">
          {{ done ? queue.length : currentIndex + 1 }} / {{ queue.length }}
        </span>
      </div>

      <!-- Progress bar -->
      <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full bg-accent transition-all duration-300"
          :style="{ width: done ? '100%' : `${progress}%` }"
        />
      </div>

      <!-- ── Done screen ───────────────────────────────────────────────────── -->
      <div
        v-if="done"
        class="flex flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card p-10 text-center"
      >
        <Icon
          :icon="score === queue.length ? 'lucide:star' : 'lucide:check-circle-2'"
          class="h-14 w-14 text-accent"
        />
        <p class="text-2xl font-semibold text-foreground">练习完成！</p>
        <p class="text-4xl font-bold text-foreground tabular-nums">
          {{ score }}
          <span class="text-2xl text-muted-foreground">/ {{ queue.length }}</span>
        </p>
        <p class="text-sm text-muted-foreground">
          {{ score === queue.length
            ? '完美！Perfect score 🎉'
            : `${Math.round((score / queue.length) * 100)}% correct` }}
        </p>
        <Button class="px-6 py-2 mt-2" @click="initQueue">Try again</Button>
      </div>

      <!-- ── Flashcard ─────────────────────────────────────────────────────── -->
      <template v-else-if="currentWord">
        <div
          class="relative flex flex-col items-center gap-5 rounded-2xl border bg-card px-8 py-10 text-center shadow-sm transition-colors duration-300"
          :class="{
            'border-green-500/60 bg-green-500/5': lastResult === 'correct',
            'border-red-500/60 bg-red-500/5': lastResult === 'incorrect',
            'border-border': lastResult === null,
          }"
        >
          <!-- Result badge -->
          <div
            v-if="lastResult"
            class="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="{
              'bg-green-500/20 text-green-400': lastResult === 'correct',
              'bg-red-500/20 text-red-400': lastResult === 'incorrect',
            }"
          >
            <Icon :icon="lastResult === 'correct' ? 'lucide:check' : 'lucide:x'" class="h-3 w-3" />
            {{ lastResult === 'correct' ? 'Correct' : 'Incorrect' }}
          </div>

          <!-- Score badge -->
          <div class="absolute top-3 left-3 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            ✓ {{ score }}
          </div>

          <!-- Hanzi -->
          <p class="text-7xl sm:text-8xl font-bold text-foreground tracking-wider leading-none mt-4">
            {{ currentWord.hanzi }}
          </p>

          <!-- Pinyin -->
          <p class="text-xl sm:text-2xl text-accent font-medium tracking-widest">
            {{ currentWord.pinyin }}
          </p>

          <!-- Translation reveal -->
          <div class="min-h-[1.5rem] w-full">
            <p v-if="revealed" class="text-base text-muted-foreground">
              {{ currentWord.translation }}
            </p>
            <button
              v-else
              type="button"
              class="text-sm text-muted-foreground hover:underline underline-offset-2"
              @click="reveal"
            >
              Show translation
            </button>
          </div>

          <!-- Heard / error feedback -->
          <p v-if="transcribedText && lastResult" class="text-xs text-muted-foreground italic">
            Heard: "{{ transcribedText }}"
          </p>
          <p v-else-if="apiError" class="text-xs text-red-400">{{ apiError }}</p>

          <!-- Buttons -->
          <div class="flex items-center gap-6 mt-2">
            <!-- TTS listen button -->
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground hover:bg-muted/70 transition-colors disabled:opacity-40"
              :disabled="!hasElevenLabsKey() || isSpeaking"
              aria-label="Play pronunciation"
              @click="speak"
            >
              <Icon v-if="isSpeaking" icon="mdi:loading" class="h-5 w-5 animate-spin" />
              <Icon v-else icon="lucide:volume-2" class="h-5 w-5" />
            </button>

            <!-- Mic button — hidden after result, visible only when idle/recording/transcribing -->
            <button
              v-if="!lastResult"
              type="button"
              class="flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-40"
              :class="{
                'border-red-500 bg-red-500/20 text-red-400 scale-110': isRecording,
                'border-accent bg-accent/10 text-accent hover:bg-accent/20': !isRecording && !isTranscribing,
                'border-muted bg-muted text-muted-foreground': isTranscribing,
              }"
              :disabled="isTranscribing"
              :aria-label="isRecording ? 'Stop recording' : 'Start recording'"
              @click="toggleRecording"
            >
              <Icon v-if="isTranscribing" icon="mdi:loading" class="h-7 w-7 animate-spin" />
              <Icon v-else-if="isRecording" icon="lucide:square" class="h-6 w-6" />
              <Icon v-else icon="lucide:mic" class="h-7 w-7" />
            </button>
          </div>

          <!-- Hint text -->
          <p class="text-xs text-muted-foreground -mt-1">
            <template v-if="isRecording">Tap ■ to stop</template>
            <template v-else-if="isTranscribing">Checking…</template>
            <template v-else-if="lastResult">Moving to next word…</template>
            <template v-else>Tap 🎤 and say the word</template>
          </p>
        </div>
      </template>

    </div>
  </div>
</template>
