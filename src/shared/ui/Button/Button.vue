<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from 'vue'
import { cn } from '@/shared/ui/utils'

const props = withDefaults(
  defineProps<{
    type?: ButtonHTMLAttributes['type']
    class?: HTMLAttributes['class']
  }>(),
  {
    type: 'button',
    class: undefined,
  },
)
</script>

<template>
  <button
    :type="props.type"
    :class="
      cn(
        'inline-flex items-center justify-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black/80 shadow hover:opacity-90 transition-colors',
        props.class,
      )
    "
  >
    <slot />
  </button>
</template>

