<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from "vue";

import { cn } from "~/utils/cn";

const props = withDefaults(
  defineProps<{
    type?: ButtonHTMLAttributes["type"];
    class?: HTMLAttributes["class"];
  }>(),
  {
    type: "button",
    class: undefined,
  },
);
</script>

<template>
  <button
    :type="props.type"
    :class="
      cn(
        'inline-flex items-center justify-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium shadow transition-colors hover:opacity-90',
        '[color:var(--color-accent-foreground)]',
        props.class,
      )
    "
  >
    <slot />
  </button>
</template>
