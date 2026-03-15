<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { HTMLAttributes } from "vue";

import { cn } from "~/utils/cn";

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    icon: string;
    color?: string;
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
          'flex h-full flex-col gap-3 rounded-md p-4 sm:gap-4 sm:p-5 md:rounded-2xl',
          read && 'opacity-40',
        )
      "
      :style="{ backgroundColor: props.color ?? '#b5ead7' }"
    >
      <div class="flex w-full items-center justify-between">
        <Icon :icon="icon" class="text-2xl text-black/70 md:text-3xl" />
      </div>
      <div>
        <h3 class="m-0 text-sm font-bold text-black md:text-lg">{{ title }}</h3>
        <p class="m-0 mt-0.5 line-clamp-3 text-xs text-black/50 sm:mt-1 md:text-sm">
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
