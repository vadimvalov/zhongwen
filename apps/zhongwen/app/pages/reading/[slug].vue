<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, onMounted, onUnmounted, ref } from "vue";

import { HanziStrokesOrder } from "~/components/hanzi-strokes-order";
import { TTSPlayer } from "~/components/tts-player";
import { Link } from "~/components/ui/link";
import { useHasElevenLabs, speakWithElevenLabs } from "~/composables/useElevenLabs";
import { useTextModules } from "~/composables/useTexts";
import type { TextData, TextWord as Word, WordMode } from "~/lib/types";
import { useUserStore } from "~/stores/user";

const route = useRoute();
const userStore = useUserStore();
const hasElevenLabs = useHasElevenLabs();

const modules = useTextModules() as Record<string, TextData>;

const slug = computed(() => route.params.slug as string);
const textId = slug;

const textData = computed<TextData | null>(() => {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`${textId.value}.json`));
  return entry?.[1] ?? null;
});

const fullText = computed(() => {
  if (!textData.value) {
    return "";
  }
  return textData.value.text.words.map((w) => w.hanzi).join("");
});

const tooltipRefs = ref<(HTMLElement | null)[]>([]);
const showPinyin = ref(true);
const wordMode = ref<WordMode>("speak");
const activeTooltipIndex = ref<number | null>(null);

function setTooltipRef(el: HTMLElement | null, index: number) {
  tooltipRefs.value[index] = el;
}

function handleMouseEnter(index: number) {
  const el = tooltipRefs.value[index];
  if (!el) {
    return;
  }

  el.style.transform = "translateX(-50%)";

  const rect = el.getBoundingClientRect();
  const padding = 8;
  let shift = 0;

  if (rect.left < padding) {
    shift = padding - rect.left;
  } else if (rect.right > window.innerWidth - padding) {
    shift = window.innerWidth - padding - rect.right;
  }

  if (shift !== 0) {
    el.style.transform = `translateX(calc(-50% + ${shift}px))`;
  }
}

function handleMouseLeave(index: number) {
  const el = tooltipRefs.value[index];
  if (!el) {
    return;
  }
  el.style.transform = "translateX(-50%)";
}

async function handleWordClick(word: Word, index: number) {
  if (word.type === "punct") {
    return;
  }
  if (wordMode.value === "stroke") {
    activeTooltipIndex.value = activeTooltipIndex.value === index ? null : index;
    return;
  }
  if (!hasElevenLabs) {
    return;
  }
  try {
    await speakWithElevenLabs(word.hanzi);
  } catch {
    // Ignore playback errors for single words
  }
}

function closeTooltip() {
  activeTooltipIndex.value = null;
}

onMounted(() => {
  document.addEventListener("click", closeTooltip);
});

onUnmounted(() => {
  document.removeEventListener("click", closeTooltip);
});

const isRead = computed(() => userStore.isRead(textId.value));

function toggleMarkAsRead() {
  userStore.toggleRead(textId.value);
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8">
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
        <div class="flex flex-wrap items-center justify-between gap-3">
          <Checkbox v-model="showPinyin" label="Pinyin" />
          <Button type="button" class="px-3 py-1.5 text-sm" @click="toggleMarkAsRead()">
            {{ isRead ? "Mark as unread" : "Mark as Read" }}
          </Button>
        </div>
        <div class="mt-2 flex justify-end md:hidden">
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
              class="flex shrink-0 flex-col items-end justify-end px-0.5 text-2xl leading-none text-foreground"
              :class="textData.text.words[index + 1]?.type === 'punct' ? 'mr-2' : 'mr-5'"
            >
              {{ word.hanzi }}
            </span>

            <span
              v-else
              class="group relative flex shrink-0 cursor-pointer flex-col items-center select-none"
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
                class="pointer-events-none absolute -top-24 left-1/2 z-10 max-w-[min(320px,calc(100vw-3rem))] overflow-hidden rounded-md bg-card px-3 py-2 text-left text-sm text-foreground shadow-lg transition-opacity duration-150 lg:-top-16"
                :class="
                  activeTooltipIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                "
              >
                <div class="flex items-center gap-3">
                  <div class="flex shrink-0 gap-1">
                    <HanziStrokesOrder
                      v-for="char in word.hanzi.split('')"
                      :key="char"
                      :hanzi="char"
                    />
                  </div>
                  <div class="flex min-w-0 flex-col">
                    <span class="overflow-hidden text-ellipsis whitespace-nowrap">
                      {{ word.translation }}
                    </span>
                    <span class="text-xs whitespace-nowrap text-muted-foreground">
                      HSK {{ word.hsk }}
                    </span>
                  </div>
                </div>
              </div>
              <span v-if="showPinyin" class="mb-1 text-sm leading-none text-accent-muted">
                {{ word.pinyin }}
              </span>
              <span class="text-2xl leading-none text-foreground">
                {{ word.hanzi }}
              </span>
            </span>
          </template>
        </div>

        <TTSPlayer
          v-if="textData"
          :title="textData.title"
          :text="fullText"
          :slug="slug"
          class="mt-8"
        />
      </div>
    </div>
  </div>
</template>
