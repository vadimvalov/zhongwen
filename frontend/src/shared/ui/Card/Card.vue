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
    read?: boolean
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined, read: false },
)
</script>

<template>
  <div
    :class="
      cn(
        'relative rounded-2xl cursor-pointer transition-transform hover:-translate-y-1',
        props.class,
      )
    "
  >
    <article
      :class="
        cn(
          'rounded-md md:rounded-2xl p-4 gap-3 sm:p-5 sm:gap-4 flex flex-col h-full',
          read && 'opacity-40',
        )
      "
      :style="{ backgroundColor: props.color ?? '#b5ead7' }"
    >
      <div class="flex items-center justify-between w-full">
        <Icon :icon="icon" class="text-2xl md:text-3xl text-black/70" />
      </div>
      <div>
        <h3 class="text-sm md:text-lg font-bold text-black m-0">{{ title }}</h3>
        <p class="text-xs md:text-sm line-clamp-3 text-black/50 mt-0.5 sm:mt-1 m-0">
          {{ description }}
        </p>
      </div>
    </article>
    <Icon
      v-if="read"
      icon="lucide:check"
      class="absolute top-4 right-4 sm:top-5 sm:right-5 text-xl md:text-3xl bg-black/50 rounded-lg p-1 text-green-400 pointer-events-none"
      aria-hidden
    />
  </div>
</template>
