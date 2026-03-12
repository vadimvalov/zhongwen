<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { cn } from '@/shared/ui/utils'

const props = withDefaults(
  defineProps<{
    to: RouteLocationRaw
    class?: HTMLAttributes['class']
    hover?: boolean
    underline?: boolean
    target?: string
  }>(),
  {
    hover: false,
    underline: false,
    target: undefined,
    class: undefined,
  },
)

const isExternal = computed(() => {
  return typeof props.to === 'string' && !props.to.startsWith('/')
})

const classes = computed(() => {
  return cn(
    'underline-offset-4',
    {
      underline: props.underline,
      'hover:opacity-80': props.hover,
    },
    props.class,
  )
})
</script>

<template>
  <a v-if="typeof to === 'string' && isExternal" :target="target" :href="to" :class="classes">
    <slot />
  </a>
  <NuxtLink v-else :target="target" :to="to" :class="classes">
    <slot />
  </NuxtLink>
</template>
