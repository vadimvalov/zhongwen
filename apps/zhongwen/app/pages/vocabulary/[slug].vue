<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { useWindowVirtualizer } from "@tanstack/vue-virtual";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import HanziStrokesOrder from "~/components/HanziStrokesOrder.vue";
import StrokeOrderDialog from "~/components/StrokeOrderDialog.vue";
import { useAuth } from "~/composables/use-auth";
import { useDictionaryModules } from "~/composables/use-dictionaries";
import { useHasElevenLabs, speakWithElevenLabs } from "~/composables/use-eleven-labs";
import { formatDictName } from "~/lib/formatters";
import type { Word } from "~/lib/types";

const route = useRoute();
const hasElevenLabs = useHasElevenLabs();
const { user } = useAuth();
const userStore = useUserStore();

const modules = useDictionaryModules();

const slug = computed(() => route.params.slug as string);
const dictId = slug;

const words = computed<Word[]>(() => {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`${dictId.value}.json`));
  return entry?.[1] ?? [];
});

const dictTitle = computed(() => formatDictName(dictId.value));

const totalWordsInDict = computed(() => words.value.length);
const knownWordsInDict = computed(
  () => words.value.filter((w) => userStore.isKnown(w.hanzi)).length,
);

const speakingIndex = ref<number | null>(null);
const selectedStrokeWord = ref<Word | null>(null);
const selectedStrokeIndex = ref(0);
const virtualBodyRef = ref<HTMLElement | null>(null);
const virtualBodyOffset = ref(0);

const rowVirtualizer = useWindowVirtualizer(
  computed(() => ({
    count: words.value.length,
    estimateSize: () => 87,
    overscan: 8,
    getItemKey: (index) => words.value[index]?.hanzi ?? index,
    scrollMargin: virtualBodyOffset.value,
  })),
);

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const virtualBodyHeight = computed(() => `${rowVirtualizer.value.getTotalSize()}px`);

function measureVirtualBodyOffset() {
  if (typeof window === "undefined" || !virtualBodyRef.value) {
    return;
  }
  virtualBodyOffset.value = virtualBodyRef.value.getBoundingClientRect().top + window.scrollY;
}

onMounted(() => {
  measureVirtualBodyOffset();
  window.addEventListener("resize", measureVirtualBodyOffset);
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", measureVirtualBodyOffset);
  }
});

function openStrokeModal(word: Word, index: number) {
  selectedStrokeWord.value = word;
  selectedStrokeIndex.value = index;
}

function closeStrokeModal() {
  selectedStrokeWord.value = null;
}

const speakCounts = ref<Record<string, number>>({});

async function handleSpeak(word: Word, index: number) {
  if (!hasElevenLabs) {
    return;
  }
  speakingIndex.value = index;
  try {
    await speakWithElevenLabs(word.hanzi);
    const key = word.hanzi;
    speakCounts.value[key] = (speakCounts.value[key] ?? 0) + 1;
    if (speakCounts.value[key] >= 3 && user.value) {
      void userStore.addKnownWord(key);
    }
  } catch {
    // Ignore playback errors
  } finally {
    speakingIndex.value = null;
  }
}

function toggleKnown(word: Word) {
  if (!user.value) {
    return;
  }
  if (userStore.isKnown(word.hanzi)) {
    void userStore.removeKnownWord(word.hanzi);
  } else {
    void userStore.addKnownWord(word.hanzi);
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-3 py-4 sm:px-4 sm:py-8">
    <div class="w-full max-w-5xl">
      <p v-if="!words.length" class="text-xs text-muted-foreground sm:text-sm">
        Dictionary not found.
      </p>
      <div v-else class="space-y-3 sm:space-y-4">
        <div class="mt-6 mb-6 flex items-center justify-between gap-3 md:mt-14">
          <div class="flex items-center gap-2 sm:gap-3">
            <BackButton to="/vocabulary" />
            <h1 class="text-xl font-semibold text-foreground sm:text-2xl">
              {{ dictTitle }}
            </h1>
          </div>
          <p class="text-xs text-muted-foreground sm:text-sm">
            Learned: {{ knownWordsInDict }} / {{ totalWordsInDict }}
          </p>
        </div>

        <div class="overflow-hidden rounded-lg border border-border">
          <div class="overflow-x-auto">
            <div class="min-w-md" role="table" :aria-label="`${dictTitle} vocabulary`">
              <div
                class="grid grid-cols-[1fr_1.3fr_2.4fr_1.8fr_1.4fr_3rem] bg-muted/50 sm:grid-cols-[1fr_1.3fr_2.4fr_1.8fr_1.4fr_4rem]"
                role="row"
              >
                <div
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                  role="columnheader"
                >
                  Hanzi
                </div>
                <div
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                  role="columnheader"
                >
                  Pinyin
                </div>
                <div
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                  role="columnheader"
                >
                  Translation
                </div>
                <div
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                  role="columnheader"
                >
                  Strokes
                </div>
                <div
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                  role="columnheader"
                >
                  Learned?
                </div>
                <div class="px-2 py-2 sm:px-4 sm:py-3" role="columnheader"></div>
              </div>

              <div ref="virtualBodyRef" role="rowgroup">
                <div class="relative w-full" :style="{ height: virtualBodyHeight }">
                  <div
                    v-for="virtualRow in virtualRows"
                    :key="virtualRow.key"
                    class="absolute top-0 left-0 grid w-full grid-cols-[1fr_1.3fr_2.4fr_1.8fr_1.4fr_3rem] border-t border-border transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_1.3fr_2.4fr_1.8fr_1.4fr_4rem]"
                    role="row"
                    :style="{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start - virtualBodyOffset}px)`,
                    }"
                  >
                    <template v-if="words[virtualRow.index]">
                      <div
                        class="flex items-center px-2 py-2 text-base font-medium text-foreground sm:px-4 sm:py-3 sm:text-xl"
                        role="cell"
                      >
                        {{ words[virtualRow.index].hanzi }}
                      </div>
                      <div
                        class="flex items-center px-2 py-2 text-xs text-muted-foreground sm:px-4 sm:py-3 sm:text-base"
                        role="cell"
                      >
                        {{ words[virtualRow.index].pinyin }}
                      </div>
                      <div
                        class="flex items-center px-2 py-2 text-xs text-foreground sm:px-4 sm:py-3 sm:text-base"
                        role="cell"
                      >
                        {{ words[virtualRow.index].translation }}
                      </div>
                      <div class="flex items-center px-2 py-2 sm:px-4 sm:py-3" role="cell">
                        <div
                          class="flex shrink-0 origin-left scale-75 flex-nowrap gap-0.5 sm:scale-100 sm:gap-1"
                        >
                          <button
                            v-for="(char, charIndex) in words[virtualRow.index].hanzi.split('')"
                            :key="`${words[virtualRow.index].hanzi}-${charIndex}`"
                            type="button"
                            class="rounded focus:ring-2 focus:ring-accent/50 focus:outline-none"
                            :aria-label="`Open stroke order for ${char}`"
                            @click="openStrokeModal(words[virtualRow.index], charIndex)"
                          >
                            <HanziStrokesOrder :hanzi="char" />
                          </button>
                        </div>
                      </div>
                      <div class="flex items-center px-2 py-2 sm:px-4 sm:py-3" role="cell">
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50"
                          :class="
                            userStore.isKnown(words[virtualRow.index].hanzi)
                              ? 'border-transparent bg-[var(--surface-card-mint)] text-[var(--surface-card-foreground)]'
                              : 'border-border text-foreground hover:bg-muted'
                          "
                          :disabled="!user"
                          :aria-pressed="userStore.isKnown(words[virtualRow.index].hanzi)"
                          @click="toggleKnown(words[virtualRow.index])"
                        >
                          <Icon
                            :icon="
                              userStore.isKnown(words[virtualRow.index].hanzi)
                                ? 'lucide:check-circle-2'
                                : 'lucide:circle'
                            "
                            class="h-3.5 w-3.5"
                          />
                          <span> Learned </span>
                        </button>
                      </div>
                      <div class="flex items-center px-2 py-2 sm:px-4 sm:py-3" role="cell">
                        <button
                          type="button"
                          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:h-9 sm:w-9"
                          :disabled="!hasElevenLabs || speakingIndex === virtualRow.index"
                          :aria-label="`Play pronunciation for ${words[virtualRow.index].hanzi}`"
                          @click="handleSpeak(words[virtualRow.index], virtualRow.index)"
                        >
                          <Icon
                            v-if="speakingIndex === virtualRow.index"
                            icon="mdi:loading"
                            class="h-4 w-4 animate-spin sm:h-5 sm:w-5"
                          />
                          <Icon v-else icon="lucide:volume-2" class="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p v-if="!hasElevenLabs" class="text-xs text-muted-foreground sm:text-sm">
          Add
          <code class="rounded bg-muted px-1">NUXT_ELEVENLABS_API_KEY</code> to your
          <code class="rounded bg-muted px-1">.env</code> to enable audio playback.
        </p>
      </div>
    </div>

    <StrokeOrderDialog
      :word="selectedStrokeWord?.hanzi ?? null"
      :pinyin="selectedStrokeWord?.pinyin"
      :translation="selectedStrokeWord?.translation"
      :initial-index="selectedStrokeIndex"
      @update:open="closeStrokeModal"
    />
  </div>
</template>
