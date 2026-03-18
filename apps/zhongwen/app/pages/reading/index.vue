<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Link } from "~/components/ui/link";
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui/select";
import { useTextModules } from "~/composables/useTexts";
import { getCardStyle } from "~/lib/cardStyles";
import type { ReadingItem as Item, TextMeta } from "~/lib/types";
import { useUserStore } from "~/stores/user";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const rawModules = useTextModules() as Record<string, TextMeta>;

const items: Item[] = Object.entries(rawModules).map(([path, mod], index) => {
  const idWithExt = path.split("/").pop() || "";
  const id = idWithExt.replace(".json", "");
  const data = mod;
  const { icon, tone } = getCardStyle(index, "reading");

  return {
    id,
    title: data.title,
    description: data.description,
    level: data.level,
    icon,
    tone,
  };
});

const levelOptions = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"] as const;

/**
 * Initialize the level filter from the ?level query param (e.g. ?level=HSK3),
 * so the placement quiz can route directly to filtered content.
 */
/**
 * Initialize level filter from ?level query param, falling back to the stored
 * HSK placement level so the quiz result is sticky across sessions.
 */
function initLevelFromQuery(): string[] {
  const q = route.query.level;
  if (typeof q === "string" && levelOptions.includes(q as (typeof levelOptions)[number])) {
    return [q];
  }
  const stored = userStore.getHskLevel();
  if (stored) {
    return [`HSK${stored}`];
  }
  return [];
}

const selectedLevels = ref<string[]>(initLevelFromQuery());
const searchQuery = ref("");

const selectedLevelsLabel = computed(() => {
  if (!selectedLevels.value.length) {
    return "HSK level";
  }

  return levelOptions.filter((level) => selectedLevels.value.includes(level)).join(", ");
});

const filteredItems = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLowerCase();

  return items.filter((item) => {
    const matchesLevel = !selectedLevels.value.length || selectedLevels.value.includes(item.level);
    const matchesSearch = !normalizedQuery || item.title.toLowerCase().includes(normalizedQuery);

    return matchesLevel && matchesSearch;
  });
});

const pageSize = ref(8);

function updatePageSize() {
  if (typeof window === "undefined") {
    return;
  }
  if (window.matchMedia("(min-width: 1024px)").matches) {
    pageSize.value = 12;
  } else if (window.matchMedia("(min-width: 768px)").matches) {
    pageSize.value = 9;
  } else {
    pageSize.value = 6;
  }
}

onMounted(() => {
  updatePageSize();
  window.addEventListener("resize", updatePageSize);
});

onUnmounted(() => {
  window.removeEventListener("resize", updatePageSize);
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value)),
);

const currentPage = computed({
  get() {
    const p = Number(route.query.page);
    const n = Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
    return Math.min(n, totalPages.value);
  },
  set(page: number) {
    const q = { ...route.query };
    if (page <= 1) {
      delete q.page;
    } else {
      q.page = String(page);
    }
    router.replace({ path: route.path, query: q });
  },
});

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredItems.value.slice(start, start + pageSize.value);
});

function goToPage(page: number) {
  currentPage.value = page;
}

watch([selectedLevels, searchQuery], () => {
  const q = { ...route.query };
  delete q.page;
  router.replace({ path: route.path, query: q });
});

watch(
  [() => route.query.page, totalPages],
  () => {
    const parsed = Number(route.query.page);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return;
    }
    const clamped = Math.min(Math.max(1, Math.floor(parsed)), totalPages.value);
    if (clamped === parsed) {
      return;
    }
    const q = { ...route.query };
    if (clamped <= 1) {
      delete q.page;
    } else {
      q.page = String(clamped);
    }
    router.replace({ path: route.path, query: q });
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8">
    <div class="w-full max-w-4xl">
      <div class="mb-2 flex items-center gap-3">
        <BackButton />
        <h1 class="text-2xl font-semibold text-foreground">Reading</h1>
      </div>
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted-foreground">
          Texts to read with translations and stroke order.
        </p>
        <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search text name"
            class="w-full sm:w-56"
          />
          <Select v-model="selectedLevels" multiple>
            <SelectTrigger class="w-full sm:w-40">
              <span
                class="truncate text-left"
                :class="!selectedLevels.length && 'text-muted-foreground'"
              >
                {{ selectedLevelsLabel }}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="level in levelOptions" :key="level" :value="level">
                {{ level }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
        <Link
          v-for="item in paginatedItems"
          :key="item.id"
          :to="`/reading/${item.id}`"
          class="block"
          :hover="true"
        >
          <Card
            :title="item.title"
            :description="item.description"
            :icon="item.icon"
            :tone="item.tone"
            :read="userStore.isRead(item.id)"
            class="h-full"
          />
        </Link>
      </div>
      <p v-if="!paginatedItems.length" class="mt-4 text-sm text-muted-foreground">
        No texts found.
      </p>

      <div v-if="totalPages > 1" class="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          class="px-3 py-1.5 text-sm"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          ← Prev
        </Button>
        <span class="px-2 text-sm text-muted-foreground">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <Button
          type="button"
          class="px-3 py-1.5 text-sm"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          Next →
        </Button>
      </div>
    </div>
  </div>
</template>
