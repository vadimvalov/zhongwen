<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { useUserStore } from '@/stores/user'
import { HanziStrokesOrder } from '@/shared/ui/HanziStrokesOrder'
import { Checkbox } from '@/shared/ui/Checkbox'
import { TTSPlayer } from '@/shared/ui/TTSPlayer'
import { useHasElevenLabs, speakWithElevenLabs } from '@/shared/lib/elevenlabs'
import type { TextData, TextWord as Word, WordMode } from '@/shared/lib/types'

const route = useRoute()
const userStore = useUserStore()
const hasElevenLabs = useHasElevenLabs()

const modules = import.meta.glob('@/assets/texts/*.json', {
  eager: true,
}) as Record<string, { default: TextData }>

const textId = computed(() => route.params.id as string)

const textData = computed<TextData | null>(() => {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`${textId.value}.json`))
  return entry?.[1].default ?? null
})

const fullText = computed(() => {
  if (!textData.value) return ''
  return textData.value.text.words.map((w) => w.hanzi).join('')
})

const tooltipRefs = ref<(HTMLElement | null)[]>([])
const showPinyin = ref(true)
const wordMode = ref<WordMode>('speak')
const activeTooltipIndex = ref<number | null>(null)

function setTooltipRef(el: HTMLElement | null, index: number) {
  tooltipRefs.value[index] = el
}

function handleMouseEnter(index: number) {
  const el = tooltipRefs.value[index]
  if (!el) return

  el.style.transform = 'translateX(-50%)'

  const rect = el.getBoundingClientRect()
  const padding = 8
  let shift = 0

  if (rect.left < padding) {
    shift = padding - rect.left
  } else if (rect.right > window.innerWidth - padding) {
    shift = window.innerWidth - padding - rect.right
  }

  if (shift !== 0) {
    el.style.transform = `translateX(calc(-50% + ${shift}px))`
  }
}

function handleMouseLeave(index: number) {
  const el = tooltipRefs.value[index]
  if (!el) return
  el.style.transform = 'translateX(-50%)'
}

async function handleWordClick(word: Word, index: number) {
  if (word.type === 'punct') return
  if (wordMode.value === 'stroke') {
    activeTooltipIndex.value = activeTooltipIndex.value === index ? null : index
    return
  }
  if (!hasElevenLabs) return
  try {
    await speakWithElevenLabs(word.hanzi)
  } catch {
    // Ignore playback errors for single words
  }
}

function closeTooltip() {
  activeTooltipIndex.value = null
}

onMounted(() => {
  document.addEventListener('click', closeTooltip)
})

onUnmounted(() => {
  document.removeEventListener('click', closeTooltip)
})

const isRead = computed(() => userStore.isRead(textId.value))

function toggleMarkAsRead() {
  userStore.toggleRead(textId.value)
}
</script>

<template>
  <div class="min-h-screen py-8 px-4 flex flex-col items-center">
    <div class="w-full max-w-xl">
      <p v-if="!textData" class="text-sm text-muted-foreground">Text not found.</p>
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <Link to="/reading" :hover="true" class="shrink-0">
              <Button class="px-2 py-1 text-sm">&larr;</Button>
            </Link>
            <h1 class="text-2xl font-semibold text-foreground">
              {{ textData.title }}
            </h1>
          </div>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ textData.description }}
        </p>
        <div class="flex flex-wrap justify-between items-center gap-3">
          <Checkbox v-model="showPinyin" label="Pinyin" />
          <Button type="button" class="px-3 py-1.5 text-sm" @click="toggleMarkAsRead()">
            {{ isRead ? 'Mark as unread' : 'Mark as Read' }}
          </Button>
        </div>
        <div class="flex md:hidden justify-end mt-2">
          <div class="flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded transition-colors"
              :class="
                wordMode === 'stroke'
                  ? 'bg-background text-foreground shadow'
                  : 'text-muted-foreground'
              "
              aria-label="Show stroke order on tap"
              @click.stop="wordMode = 'stroke'"
            >
              <Icon icon="lucide:pen-line" class="text-lg" />
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded transition-colors"
              :class="
                wordMode === 'speak'
                  ? 'bg-background text-foreground shadow'
                  : 'text-muted-foreground'
              "
              aria-label="Play audio on tap"
              @click.stop="wordMode = 'speak'"
            >
              <Icon icon="lucide:volume-2" class="text-lg" />
            </button>
          </div>
        </div>

        <div class="inline-flex flex-wrap gap-y-4 leading-relaxed">
          <template v-for="(word, index) in textData.text.words" :key="index">
            <span
              v-if="word.type === 'punct'"
              class="flex flex-col justify-end items-end text-2xl text-foreground leading-none px-0.5 shrink-0"
              :class="textData.text.words[index + 1]?.type === 'punct' ? 'mr-2' : 'mr-5'"
            >
              {{ word.hanzi }}
            </span>

            <span
              v-else
              class="relative flex flex-col items-center group cursor-pointer select-none shrink-0"
              :class="textData.text.words[index + 1]?.type === 'punct' ? 'mr-2' : 'mr-5'"
              role="button"
              tabindex="0"
              @mouseenter="handleMouseEnter(index)"
              @mouseleave="handleMouseLeave(index)"
              @click.stop="handleWordClick(word, index)"
              @keydown.enter.space.prevent="handleWordClick(word, index)"
            >
              <div
                :ref="(el) => setTooltipRef(el as HTMLElement | null, index)"
                class="pointer-events-none absolute -top-24 lg:-top-16 left-1/2 z-10 rounded-md bg-card px-3 py-2 text-sm text-foreground shadow-lg transition-opacity duration-150 max-w-[min(320px,calc(100vw-3rem))] text-left overflow-hidden"
                :class="
                  activeTooltipIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                "
              >
                <div class="flex items-center gap-3">
                  <div class="flex gap-1 shrink-0">
                    <HanziStrokesOrder
                      v-for="char in word.hanzi.split('')"
                      :key="char"
                      :hanzi="char"
                    />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="whitespace-nowrap text-ellipsis overflow-hidden">
                      {{ word.translation }}
                    </span>
                    <span class="text-xs text-muted-foreground whitespace-nowrap">
                      HSK {{ word.hsk }}
                    </span>
                  </div>
                </div>
              </div>
              <span v-if="showPinyin" class="text-sm text-accent-muted mb-1 leading-none">
                {{ word.pinyin }}
              </span>
              <span class="text-2xl text-foreground leading-none">
                {{ word.hanzi }}
              </span>
            </span>
          </template>
        </div>

        <TTSPlayer v-if="textData" :title="textData.title" :text="fullText" class="mt-8" />
      </div>
    </div>
  </div>
</template>
