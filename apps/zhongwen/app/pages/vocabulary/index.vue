<script setup lang="ts">
import { computed, ref } from "vue";

import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Link } from "~/components/ui/link";
import { useDictionaryModules } from "~/composables/useDictionaries";
import { getCardStyle } from "~/lib/cardStyles";
import { formatDictName } from "~/lib/formatters";

const modules = useDictionaryModules();

const router = useRouter();
const searchQuery = ref("");

const dictionaries = computed(() => {
  return Object.entries(modules).map(([path], index) => {
    const filename = path.split("/").pop() || "";
    const id = filename.replace(".json", "");
    const { icon, tone } = getCardStyle(index, "vocabulary");
    return {
      id,
      title: formatDictName(filename),
      icon,
      tone,
    };
  });
});

function handleSearch() {
  const value = searchQuery.value.trim();
  if (!value) {
    return;
  }
  if (!/^[\u4e00-\u9fff\u3400-\u4dbf]+$/.test(value)) {
    return;
  }

  if (value === "我操你妈") {
    if (typeof window !== "undefined") {
      window.open("https://youtu.be/FumbPNRKTs8?si=jax27cejG7iBtmi1", "_blank");
    }
  }

  router.push(`/vocabulary/search/${encodeURIComponent(value)}`);
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-3 py-4 sm:px-4 sm:py-8">
    <div class="w-full max-w-xl">
      <div class="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
        <Link to="/" :hover="true" class="shrink-0">
          <Button class="px-2 py-1 text-xs sm:text-sm">&larr;</Button>
        </Link>
        <h1 class="text-xl font-semibold text-foreground sm:text-2xl">Vocabulary</h1>
      </div>
      <div class="mb-4 space-y-2 sm:mb-6">
        <p class="text-xs text-muted-foreground sm:text-sm">
          Select a dictionary to view words or search for a specific word.
        </p>
        <form class="flex flex-col gap-2" @submit.prevent="handleSearch">
          <div class="flex gap-2">
            <Input
              v-model="searchQuery"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="Search word (hanzi)..."
              class="flex-1"
            />
            <Button
              type="submit"
              class="px-3 py-2 text-xs sm:text-sm"
              :disabled="
                !searchQuery.trim() || !/^[\u4e00-\u9fff\u3400-\u4dbf]+$/.test(searchQuery.trim())
              "
            >
              Search
            </Button>
          </div>
          <p
            v-if="searchQuery.trim() && !/^[\u4e00-\u9fff\u3400-\u4dbf]+$/.test(searchQuery.trim())"
            class="text-xs text-muted-foreground"
          >
            Only Chinese characters (hanzi) are allowed.
          </p>
        </form>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:gap-3">
        <Link
          v-for="dict in dictionaries"
          :key="dict.id"
          :to="`/vocabulary/${dict.id}`"
          class="block"
          :hover="true"
        >
          <Card
            :title="dict.title"
            :description="`View ${dict.title} word list`"
            :icon="dict.icon"
            :tone="dict.tone"
            class="h-full"
          />
        </Link>
      </div>
    </div>
  </div>
</template>
