<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { parseSrt } from '@/shared/lib/srt'
import { useCedict } from '@/shared/lib/cedict'
import { useEscapeBack } from '@/shared/lib/useEscapeBack'
import type { Subtitle, CedictEntry } from '@/shared/lib/types'

useEscapeBack()

const { lookup, loaded: cedictLoaded, loading: cedictLoading } = useCedict()

// File state
const videoUrl = ref<string | null>(null)
const subtitles = ref<Subtitle[]>([])
const videoRef = ref<HTMLVideoElement | null>(null)
const subtitleListRef = ref<HTMLDivElement | null>(null)

// Playback
const currentTimeMs = ref(0)

const activeIndex = computed(() =>
  subtitles.value.findIndex(
    (s) => currentTimeMs.value >= s.startMs && currentTimeMs.value <= s.endMs,
  ),
)

// Segmenter
const segmenter = new Intl.Segmenter('zh', { granularity: 'word' })

const segmented = computed(() =>
  subtitles.value.map((sub) => ({
    ...sub,
    words: [...segmenter.segment(sub.text)].map((s) => s.segment),
  })),
)

// Popup
const popup = ref<{
  word: string
  entries: CedictEntry[]
  x: number
  y: number
} | null>(null)

// File handlers
function onVideoSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
  videoUrl.value = URL.createObjectURL(file)
}

function onSrtSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    subtitles.value = parseSrt(reader.result as string)
  }
  reader.readAsText(file)
}

// Time update
function onTimeUpdate() {
  if (!videoRef.value) return
  currentTimeMs.value = videoRef.value.currentTime * 1000
}

// Auto-scroll to active subtitle
watch(activeIndex, (idx) => {
  if (idx < 0) return
  nextTick(() => {
    const el = document.getElementById(`sub-${idx}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})

// Jump to subtitle
function jumpTo(startMs: number) {
  if (videoRef.value) {
    videoRef.value.currentTime = startMs / 1000
  }
}

// Word click
function onWordClick(word: string, event: MouseEvent) {
  event.stopPropagation()

  const trimmed = word.trim()
  if (!trimmed || /^\s*$/.test(trimmed)) return

  const entries = lookup(trimmed)
  if (entries.length === 0) {
    popup.value = null
    return
  }

  // Position popup near click, keep on screen
  const x = Math.min(event.clientX, window.innerWidth - 280)
  const y = Math.max(event.clientY - 120, 8)

  popup.value = { word: trimmed, entries, x, y }
}

// Close popup on outside click
function onDocumentClick() {
  popup.value = null
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 pb-12">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <NuxtLink
        to="/"
        class="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
      >
        <Icon name="lucide:arrow-left" class="w-5 h-5" />
      </NuxtLink>
      <span class="text-sm font-medium text-muted-foreground">Mining</span>
    </div>

    <!-- File inputs -->
    <div class="flex gap-3 mb-4">
      <label
        class="inline-flex items-center justify-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium shadow hover:opacity-90 transition-colors cursor-pointer [color:var(--color-accent-foreground)]"
      >
        <input type="file" accept="video/*" class="hidden" @change="onVideoSelect" />
        Choose Video
      </label>
      <label
        class="inline-flex items-center justify-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium shadow hover:opacity-90 transition-colors cursor-pointer [color:var(--color-accent-foreground)]"
      >
        <input type="file" accept=".srt" class="hidden" @change="onSrtSelect" />
        Choose SRT
      </label>
    </div>

    <!-- CEDICT loading indicator -->
    <div v-if="cedictLoading" class="text-muted-foreground text-sm mb-3">Loading dictionary...</div>

    <!-- Video -->
    <video
      v-if="videoUrl"
      ref="videoRef"
      :src="videoUrl"
      controls
      class="w-full rounded-lg bg-black"
      @timeupdate="onTimeUpdate"
    />

    <!-- Subtitle list -->
    <div
      v-if="segmented.length > 0"
      ref="subtitleListRef"
      class="mt-4 max-h-[50vh] overflow-y-auto space-y-0.5 rounded-lg border border-border p-2"
    >
      <div
        v-for="(sub, idx) in segmented"
        :id="`sub-${idx}`"
        :key="sub.id"
        :class="[
          'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
          idx === activeIndex ? 'bg-accent/20' : 'hover:bg-card',
        ]"
        @click="jumpTo(sub.startMs)"
      >
        <div class="flex-1 flex flex-wrap">
          <span
            v-for="(word, wi) in sub.words"
            :key="wi"
            :class="[
              /\S/.test(word) && !/^[\s\p{P}]+$/u.test(word)
                ? 'cursor-pointer hover:bg-accent/30 rounded px-0.5 transition-colors'
                : '',
            ]"
            @click="onWordClick(word, $event)"
          >
            {{ word }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!videoUrl"
      class="mt-12 text-center text-muted-foreground"
    >
      Select a video and SRT file to start.
    </div>

    <!-- Word popup -->
    <Teleport to="body">
      <div
        v-if="popup"
        :style="{ left: popup.x + 'px', top: popup.y + 'px' }"
        class="fixed z-50 bg-card border border-border rounded-lg p-3 shadow-xl min-w-[200px] max-w-[300px]"
        @click.stop
      >
        <div class="text-2xl mb-1">{{ popup.word }}</div>
        <div v-for="(entry, i) in popup.entries" :key="i" class="mb-1.5 last:mb-0">
          <div class="text-accent text-sm">{{ entry.pinyin }}</div>
          <div class="text-muted-foreground text-xs leading-snug">{{ entry.translation }}</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
