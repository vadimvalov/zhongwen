<script setup lang="ts">
import { Icon } from "@iconify/vue";

import HanziStrokesOrder from "~/components/HanziStrokesOrder.vue";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useAuth } from "~/composables/useAuth";
import { useDictionaryModules } from "~/composables/useDictionaries";
import { formatDictName } from "~/lib/formatters";
import type { Word } from "~/lib/types";
import { useUserStore } from "~/stores/user";

const router = useRouter();
const { user, isPending } = useAuth();
const userStore = useUserStore();
const modules = useDictionaryModules();

const searchQuery = ref("");

watch(
  [user, isPending],
  ([u, pending]) => {
    if (!pending && !u) {
      router.replace("/");
    }
  },
  { immediate: true },
);

const knownWordRows = computed(() => {
  const set = userStore.knownWords;
  const rows: Array<Word & { fromDict: string }> = [];

  for (const [path, words] of Object.entries(modules)) {
    const filename = path.split("/").pop() || "";
    const id = filename.replace(".json", "");
    const fromDict = formatDictName(id);
    for (const word of words as Word[]) {
      if (set.has(word.hanzi)) {
        rows.push({ ...word, fromDict });
      }
    }
  }

  const seen = new Set<string>();
  const deduped = rows.filter((row) => {
    if (seen.has(row.hanzi)) {
      return false;
    }
    seen.add(row.hanzi);
    return true;
  });

  const q = searchQuery.value.trim().toLowerCase();
  if (!q) {
    return deduped;
  }

  return deduped.filter((row) => {
    return (
      row.hanzi.includes(q) ||
      row.pinyin.toLowerCase().includes(q) ||
      row.translation.toLowerCase().includes(q)
    );
  });
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-3 py-4 sm:px-4 sm:py-8">
    <div class="w-full max-w-4xl space-y-4 sm:space-y-6">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            class="h-8 w-8 sm:h-9 sm:w-9"
            @click="router.push('/')"
          >
            <Icon icon="lucide:arrow-left" class="text-base" />
          </Button>
          <h1 class="text-xl font-semibold text-foreground sm:text-2xl">Known words</h1>
        </div>
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="Search known words..."
          class="h-8 w-40 text-xs sm:h-9 sm:w-56 sm:text-sm"
        />
      </div>

      <p class="text-xs text-muted-foreground sm:text-sm">
        This list is powered by the app&apos;s behavior-recognition model: it tracks how you
        interact with words in texts and speaking practice to infer which ones you already know. You
        can also mark or unmark known words manually from vocabulary dictionaries.
      </p>

      <div class="overflow-hidden rounded-lg border border-border">
        <div class="overflow-x-auto">
          <table class="w-full min-w-md border-collapse">
            <thead>
              <tr class="bg-muted/50">
                <th
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                >
                  Hanzi
                </th>
                <th
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                >
                  Pinyin
                </th>
                <th
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                >
                  Translation
                </th>
                <th
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                >
                  Strokes
                </th>
                <th
                  class="px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 sm:text-sm"
                >
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="word in knownWordRows"
                :key="word.hanzi"
                class="border-t border-border transition-colors hover:bg-muted/30"
              >
                <td
                  class="px-2 py-2 text-base font-medium text-foreground sm:px-4 sm:py-3 sm:text-xl"
                >
                  {{ word.hanzi }}
                </td>
                <td class="px-2 py-2 text-xs text-muted-foreground sm:px-4 sm:py-3 sm:text-base">
                  {{ word.pinyin }}
                </td>
                <td class="px-2 py-2 text-xs text-foreground sm:px-4 sm:py-3 sm:text-base">
                  {{ word.translation }}
                </td>
                <td class="px-2 py-2 sm:px-4 sm:py-3">
                  <div
                    class="flex shrink-0 origin-left scale-75 flex-nowrap gap-0.5 sm:scale-100 sm:gap-1"
                  >
                    <HanziStrokesOrder
                      v-for="(char, idx) in word.hanzi.split('')"
                      :key="`${word.hanzi}-${idx}`"
                      :hanzi="char"
                    />
                  </div>
                </td>
                <td class="px-2 py-2 text-xs text-muted-foreground sm:px-4 sm:py-3 sm:text-sm">
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate">
                      {{ word.fromDict }}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-muted-foreground hover:text-destructive"
                      :aria-label="`Remove ${word.hanzi} from known words`"
                      @click="userStore.removeKnownWord(word.hanzi)"
                    >
                      <Icon icon="lucide:x" class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p v-if="!knownWordRows.length" class="text-xs text-muted-foreground sm:text-sm">
        No known words yet. Hover over words in texts or practise vocabulary to mark them as known.
      </p>
    </div>
  </div>
</template>
