<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { HanziStrokesOrder } from '@/shared/ui/HanziStrokesOrder'
import { useHasElevenLabs, speakWithElevenLabs } from '@/shared/lib/elevenlabs'
import { formatDictName } from '@/shared/lib/formatters'
import type { Word } from '@/shared/lib/types'

const route = useRoute()
const hasElevenLabs = useHasElevenLabs()

const modules = import.meta.glob('@/assets/dictionaries/*.json', {
  eager: true,
}) as Record<string, { default: Word[] }>

const dictId = computed(() => route.params.id as string)

const words = computed<Word[]>(() => {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`${dictId.value}.json`))
  return entry?.[1]?.default ?? []
})

const dictTitle = computed(() => formatDictName(dictId.value))

const speakingIndex = ref<number | null>(null)
const selectedStrokeHanzi = ref<string | null>(null)

function openStrokeModal(hanzi: string) {
  selectedStrokeHanzi.value = hanzi
}

function closeStrokeModal() {
  selectedStrokeHanzi.value = null
}

async function handleSpeak(word: Word, index: number) {
  if (!hasElevenLabs) return
  speakingIndex.value = index
  try {
    await speakWithElevenLabs(word.hanzi)
  } catch {
    // Ignore playback errors
  } finally {
    speakingIndex.value = null
  }
}
</script>

<template>
  <div class="min-h-screen py-4 px-3 sm:py-8 sm:px-4 flex flex-col items-center">
    <div class="w-full max-w-4xl">
      <p v-if="!words.length" class="text-xs sm:text-sm text-muted-foreground">
        Dictionary not found.
      </p>
      <div v-else class="space-y-3 sm:space-y-4">
        <div class="flex items-center gap-2 sm:gap-3">
          <Link to="/vocabulary" :hover="true" class="shrink-0">
            <Button class="px-2 py-1 text-xs sm:text-sm">&larr;</Button>
          </Link>
          <h1 class="text-xl sm:text-2xl font-semibold text-foreground">
            {{ dictTitle }}
          </h1>
        </div>

        <div class="rounded-lg border border-border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full min-w-md border-collapse">
              <thead>
                <tr class="bg-muted/50">
                  <th
                    class="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground"
                  >
                    Hanzi
                  </th>
                  <th
                    class="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground"
                  >
                    Pinyin
                  </th>
                  <th
                    class="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground"
                  >
                    Translation
                  </th>
                  <th
                    class="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground"
                  >
                    Strokes
                  </th>
                  <th class="w-9 sm:w-12 px-2 sm:px-4 py-2 sm:py-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(word, index) in words"
                  :key="index"
                  class="border-t border-border hover:bg-muted/30 transition-colors"
                >
                  <td
                    class="px-2 sm:px-4 py-2 sm:py-3 text-base sm:text-xl text-foreground font-medium"
                  >
                    {{ word.hanzi }}
                  </td>
                  <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-base text-muted-foreground">
                    {{ word.pinyin }}
                  </td>
                  <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-base text-foreground">
                    {{ word.translation }}
                  </td>
                  <td class="px-2 sm:px-4 py-2 sm:py-3">
                    <div
                      class="flex gap-0.5 sm:gap-1 shrink-0 flex-nowrap scale-75 sm:scale-100 origin-left"
                    >
                      <button
                        v-for="(char, charIndex) in word.hanzi.split('')"
                        :key="`${word.hanzi}-${charIndex}`"
                        type="button"
                        class="rounded focus:outline-none focus:ring-2 focus:ring-accent/50"
                        :aria-label="`Open stroke order for ${char}`"
                        @click="openStrokeModal(char)"
                      >
                        <HanziStrokesOrder :hanzi="char" />
                      </button>
                    </div>
                  </td>
                  <td class="px-2 sm:px-4 py-2 sm:py-3">
                    <button
                      type="button"
                      class="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
                      :disabled="!hasElevenLabs || speakingIndex === index"
                      :aria-label="`Play pronunciation for ${word.hanzi}`"
                      @click="handleSpeak(word, index)"
                    >
                      <Icon
                        v-if="speakingIndex === index"
                        icon="mdi:loading"
                        class="h-4 w-4 sm:h-5 sm:w-5 animate-spin"
                      />
                      <Icon v-else icon="lucide:volume-2" class="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p v-if="!hasElevenLabs" class="text-xs sm:text-sm text-muted-foreground">
          Add <code class="rounded bg-muted px-1">NUXT_ELEVENLABS_API_KEY</code> to your
          <code class="rounded bg-muted px-1">.env</code> to enable audio playback.
        </p>
      </div>
    </div>
  </div>

  <div
    v-if="selectedStrokeHanzi"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
    @click.self="closeStrokeModal"
  >
    <div class="relative flex items-center justify-center">
      <HanziStrokesOrder :hanzi="selectedStrokeHanzi" class="rounded-2xl h-48 w-48" />
    </div>
  </div>
</template>
