<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { Link } from "~/components/ui/link";
import { useAuth } from "~/composables/useAuth";

const { user, isPending } = useAuth();

const reviewStats = ref<{
  due_today: number;
  reviewed_today: number;
  next_session_at: string | null;
} | null>(null);
const reviewLoading = ref(false);

async function loadReviewStats() {
  try {
    reviewLoading.value = true;
    const { data } = await useFetch("/api/review/stats");
    reviewStats.value = data.value ?? null;
  } catch {
    /* ignore when logged out */
  } finally {
    reviewLoading.value = false;
  }
}

const hasAnyWords = computed(
  () =>
    reviewStats.value !== null &&
    (reviewStats.value.due_today > 0 ||
      reviewStats.value.reviewed_today > 0 ||
      reviewStats.value.next_session_at !== null),
);

const reviewLabel = computed(() => {
  if (!reviewStats.value) {
    return "";
  }
  if (!hasAnyWords.value) {
    return "Mark words as known in Vocabulary to start";
  }
  const due = reviewStats.value.due_today;
  if (due > 0) {
    return `${due} card${due === 1 ? "" : "s"} due`;
  }
  const diff = new Date(reviewStats.value.next_session_at!).getTime() - Date.now();
  if (diff <= 0) {
    return "Reviews ready";
  }
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  if (hours < 24) {
    return `Next in ${hours}h`;
  }
  return `Next in ${Math.ceil(hours / 24)}d`;
});

const isDue = computed(() => (reviewStats.value?.due_today ?? 0) > 0);

watch(
  [user, isPending],
  ([u, pending]) => {
    if (pending) {
      reviewLoading.value = true;
      return;
    }
    if (u) {
      loadReviewStats();
    } else {
      reviewStats.value = null;
      reviewLoading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="user || reviewLoading" class="mt-4 block w-full max-w-sm">
    <div
      v-if="reviewLoading"
      class="flex min-h-[60px] items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3 sm:min-h-[72px] sm:px-5 sm:py-4"
    >
      <Icon icon="lucide:loader-2" class="h-5 w-5 animate-spin text-muted-foreground" />
      <div class="flex-1 space-y-1">
        <div class="h-3 w-24 rounded bg-muted-foreground/20" />
        <div class="h-2.5 w-40 rounded bg-muted-foreground/10" />
      </div>
      <span class="h-4 w-4" />
    </div>
    <component
      :is="hasAnyWords ? Link : 'div'"
      v-else-if="reviewStats"
      v-bind="hasAnyWords ? { to: '/review', hover: true } : {}"
      class="block"
    >
      <div
        :class="[
          'flex min-h-[60px] items-center gap-3 rounded-2xl px-4 py-3 sm:min-h-[72px] sm:px-5 sm:py-4',
          hasAnyWords ? 'transition-transform hover:-translate-y-0.5' : '',
          isDue
            ? 'bg-amber-500/15 dark:bg-amber-400/10'
            : hasAnyWords
              ? 'bg-emerald-500/15 dark:bg-emerald-400/10'
              : 'bg-muted/50',
        ]"
      >
        <Icon
          :icon="
            isDue ? 'lucide:clock-alert' : hasAnyWords ? 'lucide:circle-check' : 'lucide:layers'
          "
          :class="[
            'text-xl sm:text-2xl',
            isDue
              ? 'text-amber-600 dark:text-amber-400'
              : hasAnyWords
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground',
          ]"
        />
        <div class="flex-1">
          <p class="text-sm font-semibold text-foreground sm:text-base">
            {{ isDue ? "Review due" : hasAnyWords ? "All clear" : "Spaced repetition" }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ reviewLabel }}
          </p>
        </div>
        <Icon
          v-if="hasAnyWords"
          icon="lucide:chevron-right"
          class="text-lg text-muted-foreground"
        />
      </div>
    </component>
  </div>
</template>
