<script setup lang="ts">
import { pinyin } from "pinyin-pro";
import { computed, ref, watch } from "vue";

import { HanziStrokesOrder } from "~/components/hanzi-strokes-order";
import { Link } from "~/components/ui/link";
import { useDictionaryModules } from "~/composables/useDictionaries";
import type { Word } from "~/lib/types";

const route = useRoute();

const modules = useDictionaryModules();

const searchId = computed(() => (route.params.id as string) || "");

const result = computed<{
  word: Word;
  level: string;
} | null>(() => {
  const query = searchId.value.trim();
  if (!query) {
    return null;
  }

  for (const [path, mod] of Object.entries(modules)) {
    const filename = path.split("/").pop() || "";
    const dictId = filename.replace(".json", "");
    const levelPart = dictId.split("_")[1];
    const level = levelPart ? `HSK ${levelPart}` : dictId;

    const found = mod.find((word) => word.hanzi === query);
    if (found) {
      return {
        word: found,
        level,
      };
    }
  }

  return null;
});

const strokeChars = computed(() => searchId.value.split("").filter(Boolean));

const isLongPhrase = computed(() => searchId.value.trim().length >= 4);

const selectedStrokeHanzi = ref<string | null>(null);
const googleTranslation = ref<string | null>(null);
const googleLoading = ref(false);
const googleError = ref(false);

function loadInitialCache(): Record<string, string> {
  try {
    if (typeof window === "undefined") {
      return {};
    }
    const raw = localStorage.getItem("vocabulary-translation-cache");
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

const translationCache = ref<Record<string, string>>(loadInitialCache());

function persistCache() {
  try {
    const entries = Object.entries(translationCache.value);
    const MAX_ENTRIES = 100;
    if (entries.length > MAX_ENTRIES) {
      const toKeep = entries.slice(entries.length - MAX_ENTRIES);
      translationCache.value = Object.fromEntries(toKeep);
    }
    localStorage.setItem("vocabulary-translation-cache", JSON.stringify(translationCache.value));
  } catch {
    // ignore persistence errors
  }
}

const googlePinyin = computed(() => {
  const query = searchId.value.trim();
  if (!query) {
    return null;
  }
  return pinyin(query, {
    toneType: "symbol",
    nonZh: "spaced",
  });
});

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

watch(
  [result, searchId],
  async () => {
    const key = searchId.value.trim();
    if (result.value !== null || !key) {
      googleTranslation.value = null;
      googleError.value = false;
      return;
    }

    const cached = translationCache.value[key];
    if (cached) {
      googleTranslation.value = cached;
      googleError.value = false;
      googleLoading.value = false;
      return;
    }

    googleLoading.value = true;
    googleError.value = false;
    googleTranslation.value = null;
    try {
      const { translation } = await $fetch("/api/translate", {
        method: "POST",
        body: { text: key },
      });
      const normalized = translation ? decodeHtmlEntities(translation) : null;
      googleTranslation.value = normalized;
      if (normalized) {
        translationCache.value[key] = normalized;
        persistCache();
      }
    } catch {
      googleError.value = true;
    } finally {
      googleLoading.value = false;
    }
  },
  { immediate: true },
);

function openStrokeModal(hanzi: string) {
  selectedStrokeHanzi.value = hanzi;
}

function closeStrokeModal() {
  selectedStrokeHanzi.value = null;
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-3 py-4 sm:px-4 sm:py-8">
    <div class="w-full max-w-3xl space-y-6 sm:space-y-8">
      <div class="flex items-center gap-2 sm:gap-3">
        <Link to="/vocabulary" :hover="true" class="shrink-0">
          <Button class="px-2 py-1 text-xs sm:text-sm">&larr;</Button>
        </Link>
        <div>
          <h1 class="text-xl font-semibold text-foreground sm:text-2xl">Vocabulary search</h1>
          <p class="text-xs text-muted-foreground sm:text-sm">
            Search result for:
            <span class="font-medium text-foreground">{{ searchId }}</span>
          </p>
        </div>
      </div>

      <div class="space-y-4 sm:space-y-6">
        <div class="rounded-lg border border-border p-3 sm:p-4">
          <div class="flex flex-col gap-4">
            <div>
              <template v-if="result">
                <div class="flex flex-col gap-2 sm:gap-3">
                  <div class="flex items-baseline gap-2">
                    <span class="text-lg font-semibold text-foreground sm:text-2xl">
                      {{ result.word.hanzi }}
                    </span>
                    <span class="text-xs text-muted-foreground sm:text-sm">
                      {{ result.word.pinyin }}
                    </span>
                  </div>
                  <p class="text-sm text-foreground sm:text-base">
                    {{ result.word.translation }}
                  </p>
                  <p v-if="!isLongPhrase" class="text-xs text-muted-foreground sm:text-sm">
                    Level:
                    <span class="font-medium text-foreground">{{ result.level }}</span>
                  </p>
                </div>
              </template>
              <template v-else>
                <div class="flex flex-col gap-2 sm:gap-3">
                  <div class="flex items-baseline gap-2">
                    <span class="text-lg font-semibold text-foreground sm:text-2xl">
                      {{ searchId }}
                    </span>
                    <span v-if="googlePinyin" class="text-xs text-muted-foreground sm:text-sm">
                      {{ googlePinyin }}
                    </span>
                  </div>
                  <p v-if="googleLoading" class="text-sm text-muted-foreground sm:text-base">
                    Translating…
                  </p>
                  <p v-else-if="googleError" class="text-sm text-muted-foreground sm:text-base">
                    Translation not found.
                  </p>
                  <p v-else-if="googleTranslation" class="text-sm text-foreground sm:text-base">
                    {{ googleTranslation }}
                  </p>
                  <p v-else class="text-sm text-muted-foreground sm:text-base">
                    Translation not found.
                  </p>
                  <p v-if="!isLongPhrase" class="text-xs text-muted-foreground sm:text-sm">
                    Level:
                    <span class="font-medium text-foreground">Unknown</span>
                  </p>
                </div>
              </template>
            </div>

            <div
              v-if="strokeChars.length"
              class="flex flex-wrap items-center justify-start gap-2 sm:gap-3"
            >
              <button
                v-for="(char, index) in strokeChars"
                :key="`${char}-${index}`"
                type="button"
                class="rounded focus:ring-2 focus:ring-accent/50 focus:outline-none"
                :aria-label="`Open stroke order for ${char}`"
                @click="openStrokeModal(char)"
              >
                <HanziStrokesOrder :hanzi="char" class="h-16 w-16 sm:h-20 sm:w-20" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="selectedStrokeHanzi"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      @click.self="closeStrokeModal"
    >
      <div class="relative flex items-center justify-center">
        <HanziStrokesOrder :hanzi="selectedStrokeHanzi" class="h-48 w-48 rounded-2xl" />
      </div>
    </div>
  </div>
</template>
