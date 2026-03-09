<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/ui/utils'

const props = defineProps<{
  hanzi: string
  class?: HTMLAttributes['class']
}>()

const src = computed(() => {
  const char = props.hanzi.trim()
  if (!char) return ''
  return `https://hanzipi.com/pic/gif/${encodeURIComponent(char)}.gif`
})
</script>

<template>
  <div
    :class="cn(
      'flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-background',
      props.class,
    )"
  >
    <img
      v-if="src"
      :src="src"
      :alt="`Stroke order for ${hanzi}`"
      class="h-full w-full object-contain"
      loading="lazy"
    />
  </div>
</template>
