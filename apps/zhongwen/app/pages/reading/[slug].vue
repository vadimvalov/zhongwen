<script setup lang="ts">
import { Icon } from "@iconify/vue";
import confetti from "canvas-confetti";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import HanziStrokesOrder from "~/components/HanziStrokesOrder.vue";
import { TTSPlayer } from "~/components/tts-player";
import { toast } from "~/components/ui/sonner";
import { useAuth } from "~/composables/useAuth";
import { useHasElevenLabs, speakWithElevenLabs } from "~/composables/useElevenLabs";
import { useTextModules } from "~/composables/useTexts";
import type { TextData, TextWord as Word, WordMode } from "~/lib/types";
import { useUserStore } from "~/stores/user";

const route = useRoute();
const userStore = useUserStore();
const hasElevenLabs = useHasElevenLabs();
const { user } = useAuth();

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

type WordGroup =
  | { kind: "word"; word: Word; punct: Word | null; index: number }
  | { kind: "punct"; word: Word; index: number };

const wordGroups = computed<WordGroup[]>(() => {
  if (!textData.value) {
    return [];
  }
  const words = textData.value.text.words;
  const groups: WordGroup[] = [];
  let i = 0;
  while (i < words.length) {
    const word = words[i];
    if (!word) {
      i++;
      continue;
    }
    if (word.type === "punct") {
      groups.push({ kind: "punct", word, index: i });
      i++;
    } else {
      const next = words[i + 1];
      const punct = next?.type === "punct" ? next : null;
      groups.push({ kind: "word", word, punct, index: i });
      i += punct ? 2 : 1;
    }
  }
  return groups;
});

const tooltipRefs = ref<(HTMLElement | null)[]>([]);
const hoverStartMs = ref<Record<number, number>>({});
const hoverAccumMs = ref<Record<number, number>>({});
const HOVER_KNOWN_THRESHOLD_MS = 7000;
const showPinyin = ref(true);
const highlightKnown = ref(false);
const wordMode = ref<WordMode>("speak");
const activeTooltipIndex = ref<number | null>(null);

function setTooltipRef(el: HTMLElement | null, index: number) {
  tooltipRefs.value[index] = el;
}

function handleMouseEnter(index: number) {
  hoverStartMs.value[index] = performance.now();
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
  const start = hoverStartMs.value[index];
  if (start) {
    const delta = performance.now() - start;
    hoverAccumMs.value[index] = (hoverAccumMs.value[index] ?? 0) + delta;
    delete hoverStartMs.value[index];

    const total = hoverAccumMs.value[index];
    if (total >= HOVER_KNOWN_THRESHOLD_MS && user.value) {
      const group = wordGroups.value.find((g) => g.index === index && g.kind === "word");
      const hanzi = group?.word.hanzi;
      if (hanzi) {
        void userStore.addKnownWord(hanzi);
      }
    }
  }
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

async function toggleMarkAsRead() {
  if (!user.value) {
    toast.warning("Authorize to save the progress");
    return;
  }
  await userStore.toggleRead(textId.value);

  if (isRead.value) {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.2 },
      scalar: 0.9,
      colors: ["#b5ead7", "#c7b8ea", "#e8d5b7", "#f4c2c2", "#d7ebe9"],
      disableForReducedMotion: true,
    });
  }
}

watch(highlightKnown, (val) => {
  if (val && !user.value) {
    highlightKnown.value = false;
    toast.warning("Authorize to highlight known words");
  }
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8">
    <div class="w-full max-w-xl">
      <p v-if="!textData" class="text-sm text-muted-foreground">Text not found.</p>
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton />
            <h1 class="text-2xl font-semibold text-foreground">
              {{ textData.title }}
            </h1>
          </div>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ textData.description }}
        </p>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <Checkbox v-model="showPinyin" label="Pinyin" />
            <Checkbox v-model="highlightKnown" label="Highlight known words" />
          </div>
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
          <template v-for="group in wordGroups" :key="group.index">
            <!-- Standalone punctuation (e.g. opening quotes at the very start) -->
            <span
              v-if="group.kind === 'punct'"
              class="mr-5 flex shrink-0 flex-col items-end justify-end px-0.5 text-2xl leading-none text-foreground"
            >
              {{ group.word.hanzi }}
            </span>

            <span v-else class="mr-3 inline-flex shrink-0 items-end whitespace-nowrap">
              <span
                class="group relative flex shrink-0 cursor-pointer flex-col items-center select-none"
                :class="group.punct ? 'mr-0' : ''"
                role="button"
                tabindex="0"
                @mouseenter="handleMouseEnter(group.index)"
                @mouseleave="handleMouseLeave(group.index)"
                @click.stop="handleWordClick(group.word, group.index)"
                @keydown.enter.space.prevent="handleWordClick(group.word, group.index)"
              >
                <div
                  :ref="(el) => setTooltipRef(el as HTMLElement | null, group.index)"
                  class="pointer-events-none absolute -top-24 left-1/2 z-10 max-w-[min(320px,calc(100vw-3rem))] overflow-hidden rounded-md bg-card px-3 py-2 text-left text-sm text-foreground shadow-lg transition-opacity duration-150 lg:-top-16"
                  :class="
                    activeTooltipIndex === group.index
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  "
                >
                  <div class="flex items-center gap-3">
                    <div class="flex shrink-0 gap-1">
                      <HanziStrokesOrder
                        v-for="char in group.word.hanzi.split('')"
                        :key="char"
                        :hanzi="char"
                      />
                    </div>
                    <div class="flex min-w-0 flex-col">
                      <span class="overflow-hidden text-ellipsis whitespace-nowrap">
                        {{ group.word.translation }}
                      </span>
                      <span class="text-xs whitespace-nowrap text-muted-foreground">
                        HSK {{ group.word.hsk }}
                      </span>
                    </div>
                  </div>
                </div>
                <span v-if="showPinyin" class="mb-1 text-sm leading-none text-accent-muted">
                  {{ group.word.pinyin }}
                </span>
                <span
                  class="text-2xl leading-none text-foreground"
                  :class="highlightKnown && userStore.isKnown(group.word.hanzi) ? 'known-word' : ''"
                >
                  {{ group.word.hanzi }}
                </span>
              </span>

              <span
                v-if="group.punct"
                class="flex shrink-0 flex-col items-end justify-end px-0.5 text-2xl leading-none text-foreground"
              >
                {{ group.punct.hanzi }}
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
