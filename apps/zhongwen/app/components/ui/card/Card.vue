<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { HTMLAttributes } from "vue";

import { cn } from "@/lib/utils";
import type { CardTone } from "~/lib/types";

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    icon: string;
    tone?: CardTone;
    read?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  { class: undefined, read: false },
);
</script>

<template>
  <div
    :class="
      cn(
        'relative cursor-pointer rounded-2xl transition-transform hover:-translate-y-1',
        props.class,
      )
    "
  >
    <article
      :class="
        cn(
          'card-surface flex h-full flex-col gap-3 rounded-md p-4 sm:gap-4 sm:p-5 md:rounded-2xl',
          read && 'opacity-40',
        )
      "
      :data-tone="props.tone ?? 'mint'"
    >
      <div class="flex w-full items-center justify-between">
        <Icon :icon="icon" class="card-icon text-2xl md:text-3xl" />
      </div>
      <div>
        <h3 class="card-title m-0 text-sm font-bold md:text-lg">{{ title }}</h3>
        <p class="card-description m-0 mt-0.5 line-clamp-3 text-xs sm:mt-1 md:text-sm">
          {{ description }}
        </p>
      </div>
    </article>
    <Icon
      v-if="read"
      icon="lucide:check"
      class="pointer-events-none absolute top-4 right-4 rounded-lg bg-black/50 p-1 text-xl text-green-400 sm:top-5 sm:right-5 md:text-3xl"
      aria-hidden
    />
  </div>
</template>

<style scoped>
.card-surface {
  background-color: var(--card-tone-bg);
}

.card-surface[data-tone="mint"] {
  --card-tone-bg: var(--surface-card-mint);
}

.card-surface[data-tone="lavender"] {
  --card-tone-bg: var(--surface-card-lavender);
}

.card-surface[data-tone="sand"] {
  --card-tone-bg: var(--surface-card-sand);
}

.card-surface[data-tone="rose"] {
  --card-tone-bg: var(--surface-card-rose);
}

.card-surface[data-tone="seafoam"] {
  --card-tone-bg: var(--surface-card-seafoam);
}

.card-icon {
  color: var(--surface-card-foreground-soft);
}

.card-title {
  color: var(--surface-card-foreground);
}

.card-description {
  color: var(--surface-card-foreground-muted);
}
</style>
