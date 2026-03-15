<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, onUnmounted, ref, watch } from "vue";

import { cn } from "@/lib/utils";
import { useHasElevenLabs } from "~/composables/useElevenLabs";

const props = defineProps<{
  title: string;
  text: string;
  slug?: string;
  class?: string;
}>();

const TTS_SPEED = 0.85;
const hasApiKey = useHasElevenLabs();

const isPlaying = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);
const currentTime = ref(0);
const duration = ref(0);
let audio: HTMLAudioElement | null = null;
const cachedAudioUrl = ref<string | null>(null);
const cachedText = ref("");

const progress = computed(() => {
  if (duration.value <= 0) {
    return 0;
  }
  return Math.min((currentTime.value / duration.value) * 100, 100);
});

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

async function fetchAudio(): Promise<string> {
  if (cachedAudioUrl.value && cachedText.value === props.text) {
    return cachedAudioUrl.value;
  }

  const blob = await $fetch<Blob>("/api/tts", {
    method: "POST",
    body: { text: props.text, speed: TTS_SPEED, slug: props.slug },
    responseType: "blob",
  });
  if (cachedAudioUrl.value) {
    URL.revokeObjectURL(cachedAudioUrl.value);
  }
  cachedAudioUrl.value = URL.createObjectURL(blob);
  cachedText.value = props.text;
  return cachedAudioUrl.value;
}

function updateTime() {
  if (!audio) {
    return;
  }
  currentTime.value = audio.currentTime;
}

function setupAudio(url: string) {
  if (audio) {
    audio.pause();
    audio.src = "";
    audio.removeEventListener("timeupdate", updateTime);
    audio.removeEventListener("ended", handleEnded);
    audio.removeEventListener("error", handleAudioError);
  }

  audio = new Audio(url);
  duration.value = 0;

  audio.addEventListener("loadedmetadata", () => {
    duration.value = audio!.duration;
  });
  audio.addEventListener("timeupdate", updateTime);
  audio.addEventListener("ended", handleEnded);
  audio.addEventListener("error", handleAudioError);
}

function handleEnded() {
  isPlaying.value = false;
  currentTime.value = duration.value;
}

function handleAudioError() {
  isPlaying.value = false;
  error.value = "Playback error";
}

async function play() {
  if (!props.text.trim()) {
    return;
  }

  error.value = null;
  isLoading.value = true;

  try {
    const url = await fetchAudio();
    setupAudio(url);
    await audio!.play();
    isPlaying.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load audio";
    isPlaying.value = false;
  } finally {
    isLoading.value = false;
  }
}

function pause() {
  if (audio) {
    audio.pause();
    isPlaying.value = false;
  }
}

function togglePlayPause() {
  if (isPlaying.value) {
    pause();
  } else if (audio && cachedText.value === props.text) {
    audio
      .play()
      .then(() => (isPlaying.value = true))
      .catch(handleAudioError);
  } else {
    play();
  }
}

function handleProgressClick(e: MouseEvent) {
  if (!audio || duration.value <= 0) {
    return;
  }
  const bar = e.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, x / rect.width));
  const targetTime = pct * duration.value;
  audio.currentTime = targetTime;
  currentTime.value = targetTime;
}

watch(
  () => props.text,
  () => {
    pause();
    currentTime.value = 0;
    duration.value = 0;
    error.value = null;
    if (cachedText.value !== props.text && cachedAudioUrl.value) {
      URL.revokeObjectURL(cachedAudioUrl.value);
      cachedAudioUrl.value = null;
      cachedText.value = "";
    }
  },
);

onUnmounted(() => {
  pause();
  if (cachedAudioUrl.value) {
    URL.revokeObjectURL(cachedAudioUrl.value);
  }
  audio = null;
});
</script>

<template>
  <div :class="cn('flex flex-col gap-3 rounded-lg border border-border bg-card p-4', props.class)">
    <div v-if="!hasApiKey" class="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      Add <code class="rounded bg-muted px-1">NUXT_ELEVENLABS_API_KEY</code> to your
      <code class="rounded bg-muted px-1">.env</code> to enable ElevenLabs TTS.
    </div>

    <div v-if="error" class="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-400">
      {{ error }}
    </div>

    <div class="flex items-center gap-4">
      <button
        type="button"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        :disabled="!text.trim() || !hasApiKey || isLoading"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
        @click="togglePlayPause"
      >
        <Icon v-if="isLoading" icon="mdi:loading" class="h-5 w-5 animate-spin" aria-hidden />
        <Icon v-else-if="isPlaying" icon="mdi:pause" class="h-5 w-5" aria-hidden />
        <Icon v-else icon="mdi:play" class="ml-0.5 h-5 w-5" aria-hidden />
      </button>

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-foreground">
          {{ title }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <span class="text-xs text-muted-foreground tabular-nums">
          {{ formatTime(currentTime) }}
        </span>
        <span class="text-xs text-muted-foreground tabular-nums">/</span>
        <span class="text-xs text-muted-foreground tabular-nums">
          {{ formatTime(duration) }}
        </span>
      </div>
    </div>

    <div
      class="relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-muted"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="duration"
      :aria-valuenow="currentTime"
      tabindex="0"
      @click="handleProgressClick"
      @keydown.space.prevent="togglePlayPause"
    >
      <div
        class="absolute inset-y-0 left-0 rounded-full bg-accent transition-all"
        :style="{ width: `${progress}%` }"
      />
      <div
        class="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-foreground/50"
        :style="{ left: `${progress}%` }"
      />
    </div>
  </div>
</template>
