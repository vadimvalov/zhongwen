<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Icon } from '@iconify/vue'
import { cn } from '@/shared/ui/utils'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    icon: string
    color?: string
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)
</script>

<template>
  <article
    :class="cn('rounded-2xl p-5 flex flex-col gap-4 cursor-pointer transition-transform hover:-translate-y-1', props.class)"
    :style="{ backgroundColor: props.color ?? '#b5ead7' }"
  >
    <Icon :icon="icon" class="text-3xl text-black/70" />
    <div>
      <h3 class="text-lg font-bold text-black m-0">{{ title }}</h3>
      <p class="text-sm text-black/50 mt-1 m-0">{{ description }}</p>
    </div>
  </article>
</template>

