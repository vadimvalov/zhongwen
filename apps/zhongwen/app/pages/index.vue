<script setup lang="ts">
import Card from "~/components/ui/Card.vue";
import Link from "~/components/ui/Link.vue";
import { getCardStyle } from "~/utils/cardStyles";
import type { MainCard } from "~/utils/types";

const config = useRuntimeConfig();

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
].map((card, index) => ({
  ...card,
  ...getCardStyle(index, "main"),
}));
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
            :color="card.color"
            class="h-full"
          />
        </Link>
        <Card
          v-else
          :title="card.title"
          :description="card.description"
          :icon="card.icon"
          :color="card.color"
          class="h-full"
        />
      </template>
    </div>

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
  </div>
</template>
