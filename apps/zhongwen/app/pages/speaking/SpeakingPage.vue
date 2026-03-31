<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, ref, watch, onUnmounted, nextTick } from "vue";

import { Card } from "~/components/ui/card";
import { Link } from "~/components/ui/link";
import { useDictionaryModules } from "~/composables/useDictionaries";
import { useHasElevenLabs, speakWithElevenLabs } from "~/composables/useElevenLabs";
import { getCardStyle } from "~/lib/cardStyles";
import { formatDictName } from "~/lib/formatters";
import type { Result, Word } from "~/lib/types";

import { transcribeChineseSpeech } from "./lib/transcribeChineseSpeech";

const QUEUE_SIZE = 10;

function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(count, arr.length));
}

// ── route & view ─────────────────────────────────────────────────────────────
const route = useRoute();
const hasElevenLabs = useHasElevenLabs();
const dictId = computed(() => ((route.params.slug ?? route.params.id) as string) ?? "");
const isModeSelect = computed(() => route.path === "/speaking");
const isDictList = computed(() => route.path === "/speaking/words" && !dictId.value);
const isPractice = computed(() => Boolean(dictId.value));
const isSentences = computed(() => route.path === "/speaking/sentences");

// ── mode select ─────────────────────────────────────────────────────────────
const modes = [
  {
    title: "Words",
    description: "Practise pronunciation word by word",
    to: "/speaking/words",
    ...getCardStyle(0, "main"),
  },
  {
    title: "AI Interview",
    description: "Practise dialogue with AI Professor",
    to: "/speaking/sentences",
    ...getCardStyle(1, "main"),
  },
];

const modules = useDictionaryModules();

const dictionaries = computed(() => {
  return Object.entries(modules).map(([path], index) => {
    const filename = path.split("/").pop() || "";
    const id = filename.replace(".json", "");
    const { icon, tone } = getCardStyle(index, "vocabulary");
    return { id, title: formatDictName(id), icon, tone };
  });
});

const allWords = computed<Word[]>(() => {
  if (!dictId.value) {
    return [];
  }
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`${dictId.value}.json`));
  return entry?.[1] ?? [];
});

const dictTitle = computed(() => formatDictName(dictId.value));

function getBestMime(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: "audio/mp4", ext: "m4a" },
    { mimeType: "audio/webm;codecs=opus", ext: "webm" },
    { mimeType: "audio/webm", ext: "webm" },
    { mimeType: "audio/ogg;codecs=opus", ext: "ogg" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: "", ext: "webm" };
}

// ── 1. Words Mode State & Logic ─────────────────────────────────────────────
const queue = ref<Word[]>([]);
const currentIndex = ref(0);
const score = ref(0);
const done = ref(false);
const revealed = ref(false);
const isRecording = ref(false);
const isTranscribing = ref(false);
const isSpeaking = ref(false);
const lastResult = ref<Result | null>(null);
const transcribedText = ref("");
const apiError = ref<string | null>(null);
const userAudioUrl = ref<string | null>(null);

const currentWord = computed(() => queue.value[currentIndex.value] ?? null);
const progress = computed(() =>
  queue.value.length ? (currentIndex.value / queue.value.length) * 100 : 0,
);

function initQueue() {
  queue.value = pickRandom(allWords.value, QUEUE_SIZE);
  currentIndex.value = 0;
  score.value = 0;
  done.value = false;
  revealed.value = false;
  lastResult.value = null;
  transcribedText.value = "";
  apiError.value = null;
  clearUserAudio();
}

watch(
  () => dictId.value,
  (id) => {
    if (id) {
      initQueue();
    }
  },
  { immediate: true },
);

function normalize(text: string): string {
  return text.replace(/[\s.,!?。，！？]/g, "").toLowerCase();
}

function isMatch(transcription: string, word: Word): boolean {
  const t = normalize(transcription);
  return t.includes(normalize(word.hanzi)) || t === normalize(word.pinyin);
}

function clearUserAudio() {
  if (userAudioUrl.value) {
    URL.revokeObjectURL(userAudioUrl.value);
    userAudioUrl.value = null;
  }
}

function playUserAudio() {
  if (userAudioUrl.value) {
    new Audio(userAudioUrl.value).play();
  }
}

// НОВАЯ ФУНКЦИЯ: Ручной переход к следующему слову
function nextWord() {
  if (currentIndex.value < queue.value.length - 1) {
    currentIndex.value++;
    revealed.value = false;
    lastResult.value = null;
    transcribedText.value = "";
    apiError.value = null;
    clearUserAudio();
  } else {
    done.value = true;
  }
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingExt = "webm";

async function startRecording() {
  if (isRecording.value || isTranscribing.value || !currentWord.value) {
    return;
  }
  apiError.value = null;
  clearUserAudio();

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    apiError.value = "Microphone access denied";
    return;
  }

  const { mimeType, ext } = getBestMime();
  recordingExt = ext;
  audioChunks = [];
  mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      audioChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    isRecording.value = false;
    isTranscribing.value = true;
    const word = currentWord.value;

    try {
      const blob = new Blob(audioChunks, { type: mimeType || "audio/webm" });
      userAudioUrl.value = URL.createObjectURL(blob);

      const text = await transcribeChineseSpeech(blob, recordingExt);
      transcribedText.value = text;

      if (word) {
        revealed.value = true; // АВТОМАТИЧЕСКИ ПОКАЗЫВАЕМ ПЕРЕВОД
        const correct = isMatch(text, word);
        if (correct) {
          score.value++;
          lastResult.value = "correct";
        } else {
          lastResult.value = "incorrect";
          if (hasElevenLabs) {
            isSpeaking.value = true;
            await speakWithElevenLabs(word.hanzi).finally(() => {
              isSpeaking.value = false;
            });
          }
        }
      }
    } catch (e) {
      apiError.value = e instanceof Error ? e.message : "Unknown error";
      lastResult.value = "incorrect";
    } finally {
      isTranscribing.value = false;
      // ТАЙМЕР УДАЛЕН. Переход теперь только по кнопке Next.
    }
  };
  mediaRecorder.start();
  isRecording.value = true;
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop();
  }
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function speak() {
  if (!currentWord.value || !hasElevenLabs || isSpeaking.value) {
    return;
  }
  isSpeaking.value = true;
  try {
    await speakWithElevenLabs(currentWord.value.hanzi);
  } finally {
    isSpeaking.value = false;
  }
}

function reveal() {
  revealed.value = true;
}

// ── 2. Sentences (AI Interview) Mode State & Logic ──────────────────────────
type ChatMessage = { role: string; parts: string; pinyin?: string; translation?: string };
const chatHistory = ref<ChatMessage[]>([]);
const isChatRecording = ref(false);
const isChatLoading = ref(false);
const chatApiError = ref<string | null>(null);
const chatContainer = ref<HTMLElement | null>(null);

let chatMediaRecorder: MediaRecorder | null = null;
let chatAudioChunks: Blob[] = [];

async function toggleChatRecording() {
  if (isChatLoading.value || isSpeaking.value) {
    return;
  }

  if (isChatRecording.value && chatMediaRecorder) {
    chatMediaRecorder.stop();
    return;
  }

  chatApiError.value = null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const { mimeType } = getBestMime();

    chatMediaRecorder = new MediaRecorder(stream, { mimeType: mimeType || undefined });
    chatAudioChunks = [];

    chatMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chatAudioChunks.push(e.data);
      }
    };

    chatMediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      isChatRecording.value = false;
      isChatLoading.value = true;

      const audioBlob = new Blob(chatAudioChunks, { type: mimeType || "audio/webm" });
      await sendChatToPython(audioBlob);
    };

    chatMediaRecorder.start();
    isChatRecording.value = true;
  } catch (err) {
    chatApiError.value = "Microphone access denied";
  }
}

async function sendChatToPython(blob: Blob) {
  try {
    const formData = new FormData();
    formData.append("file", blob, "voice.webm");

    const cleanHistory = chatHistory.value.map((m) => ({ role: m.role, parts: m.parts }));
    formData.append("history", JSON.stringify(cleanHistory));

    const response = await $fetch<{
      user_text: string;
      hanzi: string;
      pinyin: string;
      translation: string;
    }>("http://localhost:8000/chat", {
      method: "POST",
      body: formData,
    });

    if (response.user_text) {
      chatHistory.value.push({ role: "user", parts: response.user_text });

      chatHistory.value.push({
        role: "model",
        parts: response.hanzi,
        pinyin: response.pinyin,
        translation: response.translation,
      });

      scrollToBottom();

      if (hasElevenLabs && response.hanzi) {
        isSpeaking.value = true;
        await speakWithElevenLabs(response.hanzi).finally(() => {
          isSpeaking.value = false;
        });
      }
    }
  } catch (error) {
    chatApiError.value = "Error connecting to AI Server";
  } finally {
    isChatLoading.value = false;
    scrollToBottom();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

onUnmounted(() => {
  clearUserAudio();
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-3 py-4 sm:px-4 sm:py-8">
    <div v-if="isModeSelect" class="w-full max-w-sm">
      <div class="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
        <BackButton />
        <h1 class="text-xl font-semibold text-foreground sm:text-2xl">Speaking</h1>
      </div>
      <p class="mb-4 text-xs text-muted-foreground sm:mb-6 sm:text-sm">Choose a practice mode.</p>
      <div class="grid grid-cols-2 gap-3">
        <Link v-for="mode in modes" :key="mode.title" :to="mode.to" class="block" :hover="true">
          <Card
            :title="mode.title"
            :description="mode.description"
            :icon="mode.icon"
            :tone="mode.tone"
            class="h-full"
          />
        </Link>
      </div>
    </div>

    <div v-else-if="isDictList" class="w-full max-w-xl">
      <div class="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
        <BackButton />
        <h1 class="text-xl font-semibold text-foreground sm:text-2xl">Words</h1>
      </div>
      <p class="mb-4 text-xs text-muted-foreground sm:mb-6 sm:text-sm">
        Select a dictionary to practise pronunciation.
      </p>
      <div class="grid gap-2 sm:gap-3 md:grid-cols-2">
        <Link
          v-for="dict in dictionaries"
          :key="dict.id"
          :to="`/speaking/words/${dict.id}`"
          class="block"
          :hover="true"
        >
          <Card
            :title="dict.title"
            :description="`Practise ${dict.title} words`"
            :icon="dict.icon"
            :tone="dict.tone"
            class="h-full"
          />
        </Link>
      </div>
    </div>

    <div v-else-if="isSentences" class="flex h-[85vh] w-full max-w-md flex-col gap-4">
      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <BackButton />
        <h1 class="text-xl font-semibold text-foreground sm:text-2xl">AI Interview</h1>
      </div>

      <div
        class="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div
          ref="chatContainer"
          class="mb-4 flex-1 space-y-5 overflow-y-auto scroll-smooth pr-2 pb-4"
        >
          <div
            v-if="chatHistory.length === 0"
            class="mt-20 flex flex-col items-center gap-3 text-center text-muted-foreground"
          >
            <Icon icon="lucide:graduation-cap" class="h-12 w-12 opacity-20" />
            <p>Tap the microphone and introduce yourself<br />to the NWPU Professor in Chinese.</p>
          </div>

          <div v-for="(msg, index) in chatHistory" :key="index" class="flex w-full flex-col">
            <div v-if="msg.role === 'user'" class="flex max-w-[85%] flex-col items-end self-end">
              <span
                class="mr-1 mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                >You</span
              >
              <div class="rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-white shadow-sm">
                {{ msg.parts }}
              </div>
            </div>

            <div v-else class="flex max-w-[90%] flex-col items-start self-start">
              <span
                class="mb-1 ml-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                >Professor</span
              >
              <div
                class="flex flex-col gap-1.5 rounded-2xl rounded-bl-sm border border-border/50 bg-muted px-4 py-3 shadow-sm"
              >
                <span class="text-xl leading-relaxed font-medium tracking-wide text-foreground">{{
                  msg.parts
                }}</span>
                <span class="text-sm leading-snug text-muted-foreground">{{ msg.pinyin }}</span>
                <span class="text-xs leading-snug text-muted-foreground">{{
                  msg.translation
                }}</span>
              </div>
            </div>
          </div>

          <div v-if="isChatLoading" class="mt-4 flex max-w-[80%] flex-col items-start self-start">
            <div class="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <Icon
                icon="mdi:dots-horizontal"
                class="h-5 w-5 animate-pulse text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <p v-if="chatApiError" class="mb-2 shrink-0 text-center text-xs text-red-400">
          {{ chatApiError }}
        </p>

        <div class="flex shrink-0 flex-col items-center border-t border-border/60 bg-card pt-3">
          <button
            type="button"
            class="flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-300 disabled:opacity-40"
            :class="{
              'scale-105 animate-pulse border-red-500 bg-red-500/10 text-red-500': isChatRecording,
              'border-accent bg-accent/10 text-accent hover:scale-105 hover:bg-accent/20':
                !isChatRecording,
              'border-muted bg-muted text-muted-foreground': isChatLoading || isSpeaking,
            }"
            :disabled="isChatLoading || isSpeaking"
            @click="toggleChatRecording"
          >
            <Icon v-if="isChatRecording" icon="lucide:square" class="h-6 w-6" />
            <Icon v-else icon="lucide:mic" class="h-7 w-7" />
          </button>
          <p
            class="mt-2.5 text-center text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
          >
            <span v-if="isChatRecording" class="text-red-500">Recording... Tap to send</span>
            <span v-else-if="isChatLoading">Professor is typing...</span>
            <span v-else-if="isSpeaking">Professor is speaking...</span>
            <span v-else>Tap to speak</span>
          </p>
        </div>
      </div>
    </div>

    <div v-else-if="isPractice" class="flex w-full max-w-md flex-col gap-4">
      <div class="flex items-center gap-2 sm:gap-3">
        <BackButton />
        <h1 class="text-xl font-semibold text-foreground sm:text-2xl">{{ dictTitle }}</h1>
        <span class="ml-auto text-sm font-medium text-muted-foreground tabular-nums"
          >{{ done ? queue.length : currentIndex + 1 }} / {{ queue.length }}</span
        >
      </div>

      <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full bg-accent transition-all duration-300"
          :style="{ width: done ? '100%' : `${progress}%` }"
        />
      </div>

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
          {{ score }} <span class="text-2xl text-muted-foreground">/ {{ queue.length }}</span>
        </p>
        <Button class="mt-2 px-6 py-2" @click="initQueue">Try again</Button>
      </div>

      <template v-else-if="currentWord">
        <div
          class="relative flex flex-col items-center gap-5 rounded-2xl border bg-card px-8 py-10 text-center shadow-sm transition-colors duration-300"
          :class="{
            'border-green-500/60 bg-green-500/5': lastResult === 'correct',
            'border-red-500/60 bg-red-500/5': lastResult === 'incorrect',
            'border-border': lastResult === null,
          }"
        >
          <div
            v-if="lastResult"
            class="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="{
              'bg-green-500/20 text-green-400': lastResult === 'correct',
              'bg-red-500/20 text-red-400': lastResult === 'incorrect',
            }"
          >
            <Icon :icon="lastResult === 'correct' ? 'lucide:check' : 'lucide:x'" class="h-3 w-3" />
            {{ lastResult === "correct" ? "Correct" : "Incorrect" }}
          </div>
          <div
            class="absolute top-3 left-3 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums"
          >
            ✓ {{ score }}
          </div>

          <p
            class="mt-4 text-7xl leading-none font-bold tracking-wider text-foreground sm:text-8xl"
          >
            {{ currentWord.hanzi }}
          </p>
          <p class="text-xl font-medium tracking-widest text-accent sm:text-2xl">
            {{ currentWord.pinyin }}
          </p>

          <div class="min-h-6 w-full">
            <p v-if="revealed" class="text-base text-muted-foreground">
              {{ currentWord.translation }}
            </p>
            <button
              v-else
              type="button"
              class="text-sm text-muted-foreground underline-offset-2 hover:underline"
              @click="reveal"
            >
              Show translation
            </button>
          </div>

          <div class="flex min-h-[40px] flex-col items-center gap-2">
            <p v-if="lastResult === 'incorrect'" class="text-xs text-red-400/90 italic">
              Heard: "{{ transcribedText || "(no transcription)" }}"
            </p>
            <p
              v-else-if="transcribedText && lastResult === 'correct'"
              class="text-xs text-muted-foreground italic"
            >
              Heard: "{{ transcribedText }}"
            </p>

            <button
              v-if="userAudioUrl && lastResult"
              @click="playUserAudio"
              class="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:text-accent/80"
            >
              <Icon icon="lucide:play-circle" class="h-4 w-4" /> My Voice
            </button>
          </div>

          <p v-if="apiError" class="mt-0.5 text-xs text-red-400">{{ apiError }}</p>

          <div class="mt-2 flex items-center gap-4">
            <button
              type="button"
              class="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-foreground transition-colors hover:bg-muted/70 disabled:opacity-40"
              :disabled="!hasElevenLabs || isSpeaking"
              aria-label="Play pronunciation"
              @click="speak"
            >
              <Icon v-if="isSpeaking" icon="mdi:loading" class="h-5 w-5 animate-spin" />
              <Icon v-else icon="lucide:volume-2" class="h-5 w-5" />
            </button>
            <button
              v-if="!lastResult"
              type="button"
              class="flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-40"
              :class="{
                'scale-110 border-red-500 bg-red-500/20 text-red-400': isRecording,
                'border-accent bg-accent/10 text-accent hover:bg-accent/20':
                  !isRecording && !isTranscribing,
                'border-muted bg-muted text-muted-foreground': isTranscribing,
              }"
              :disabled="isTranscribing"
              aria-label="Start recording"
              @click="toggleRecording"
            >
              <Icon v-if="isTranscribing" icon="mdi:loading" class="h-7 w-7 animate-spin" />
              <Icon v-else-if="isRecording" icon="lucide:square" class="h-6 w-6" />
              <Icon v-else icon="lucide:mic" class="h-7 w-7" />
            </button>
            <button
              v-if="lastResult"
              @click="nextWord"
              class="flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent bg-accent text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-accent/90"
            >
              <Icon icon="lucide:arrow-right" class="h-6 w-6" />
            </button>
          </div>

          <p class="-mt-1 text-xs text-muted-foreground">
            <template v-if="isRecording">Tap ■ to stop</template>
            <template v-else-if="isTranscribing">Checking…</template>
            <template v-else-if="lastResult"
              >Tap <Icon icon="lucide:arrow-right" class="inline h-3 w-3" /> to continue</template
            >
            <template v-else>Tap 🎤 and say the word</template>
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
