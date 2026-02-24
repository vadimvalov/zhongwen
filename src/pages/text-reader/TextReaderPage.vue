<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { HanziStrokesOrder } from '@/shared/ui/HanziStrokesOrder'
import { Checkbox } from '@/shared/ui/Checkbox'

type Word = {
  hanzi: string
  pinyin: string
  translation: string
  hsk: number
  type?: 'punct'
}

type TextData = {
  title: string
  description: string
  level: string
  text: {
    words: Word[]
  }
}

const route = useRoute()

const modules = import.meta.glob('@/assets/texts/*.json', {
  eager: true,
}) as Record<string, { default: TextData }>

const textId = computed(() => route.params.id as string)

const textData = computed<TextData | null>(() => {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`${textId.value}.json`))
  return entry?.[1].default ?? null
})

const tooltipRefs = ref<(HTMLElement | null)[]>([])
const showPinyin = ref(true)

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
        <Checkbox v-model="showPinyin" label="Pinyin" />

        <div class="mt-16 inline-flex flex-wrap gap-x-5 gap-y-4 leading-relaxed">
          <template v-for="(word, index) in textData.text.words" :key="index">
            <span
              v-if="word.type === 'punct'"
              class="flex flex-col justify-end items-end text-2xl text-foreground leading-none px-0.5"
            >
              {{ word.hanzi }}
            </span>

            <span
              v-else
              class="relative flex flex-col items-center group"
              @mouseenter="handleMouseEnter(index)"
              @mouseleave="handleMouseLeave(index)"
            >
              <div
                :ref="(el) => setTooltipRef(el as HTMLElement | null, index)"
                class="pointer-events-none absolute -top-24 left-1/2 z-10 rounded-md bg-card px-3 py-2 text-sm text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 max-w-[min(320px,calc(100vw-3rem))] text-left overflow-hidden"
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
      </div>
    </div>
  </div>
</template>
