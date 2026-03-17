<script setup lang="ts">
import { Icon } from "@iconify/vue";

import ElevenLabsDisclosureDialog from "~/components/ElevenLabsDisclosureDialog.vue";
import OpenAIPartnerDialog from "~/components/OpenAIPartnerDialog.vue";
import { Card } from "~/components/ui/card";
import { Link } from "~/components/ui/link";
import { useAuth } from "~/composables/useAuth";
import { getCardStyle } from "~/lib/cardStyles";
import type { MainCard } from "~/lib/types";

const config = useRuntimeConfig();
const { user } = useAuth();

const mainCards: MainCard[] = [
  {
    title: "Reading",
    description: "Short stories with translation",
    to: "/reading",
  },
  {
    title: "Vocabulary",
    description: "Learn words by HSK level",
    to: "/vocabulary",
  },
  {
    title: "Speaking",
    description: "Audio with transcription",
    to: "/speaking",
  },
  {
    title: "Challenges",
    description: "Compete with classmates",
    to: "/challenges",
  },
].map((card, index) => ({
  ...card,
  ...getCardStyle(index, "main"),
}));

const reviewStats = ref<{
  due_today: number;
  reviewed_today: number;
  next_session_at: string | null;
} | null>(null);

async function loadReviewStats() {
  try {
    const { data } = await useFetch("/api/review/stats");
    reviewStats.value = data.value ?? null;
  } catch {
    /* ignore when logged out */
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
  user,
  (u) => {
    if (u) {
      loadReviewStats();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-4 py-8">
    <h1 class="mb-6 text-2xl font-semibold text-foreground">大家好</h1>

    <div class="grid w-full max-w-sm grid-cols-2 gap-3">
      <template v-for="card in mainCards" :key="card.title">
        <Link v-if="card.to" :to="card.to" class="block" :hover="true">
          <Card
            :title="card.title"
            :description="card.description"
            :icon="card.icon"
            :tone="card.tone"
            class="h-full"
          />
        </Link>
        <Card
          v-else
          :title="card.title"
          :description="card.description"
          :icon="card.icon"
          :tone="card.tone"
          class="h-full"
        />
      </template>
    </div>

    <component
      :is="hasAnyWords ? Link : 'div'"
      v-if="user && reviewStats"
      v-bind="hasAnyWords ? { to: '/review', hover: true } : {}"
      class="mt-4 block w-full max-w-sm"
    >
      <div
        :class="[
          'flex items-center gap-3 rounded-2xl px-4 py-3 sm:px-5 sm:py-4',
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

    <p class="mt-8 max-w-sm text-[10px] leading-snug text-muted-foreground">
      This is open-source project. You can find the source code on
      <a href="https://github.com/vadimvalov/zhongwen" target="_blank" class="text-foreground"
        >GitHub</a
      >.
    </p>
    <p class="mt-2 text-[10px] leading-snug text-muted-foreground">
      Any contributions are welcome. Contact me on
      <a href="https://t.me/valovvadim" target="_blank" class="text-foreground">Telegram</a>.
    </p>
    <a
      href="https://github.com/vadimvalov/zhongwen/releases"
      target="_blank"
      class="mt-4 inline-block text-[10px] text-muted-foreground"
    >
      v{{ config.public.version }}
    </a>
    <div
      class="absolute right-4 bottom-4 text-right text-[10px] leading-snug text-muted-foreground"
    >
      <OpenAIPartnerDialog />
      <ElevenLabsDisclosureDialog />
    </div>
  </div>
</template>
