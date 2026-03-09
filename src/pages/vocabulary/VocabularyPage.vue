<script setup lang="ts">
import { computed } from 'vue'
import { Card } from '@/shared/ui/Card'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { getCardStyle } from '@/shared/lib/cardStyles'
import { formatDictName } from '@/shared/lib/formatters'

const modules = import.meta.glob('@/assets/dictionaries/*.json', {
  eager: true,
}) as Record<string, { default: unknown[] }>

const dictionaries = computed(() => {
  return Object.entries(modules).map(([path], index) => {
    const filename = path.split('/').pop() || ''
    const id = filename.replace('.json', '')
    const { icon, color } = getCardStyle(index, 'vocabulary')
    return {
      id,
      title: formatDictName(filename),
      icon,
      color,
    }
  })
})
</script>

<template>
  <div class="min-h-screen py-4 px-3 sm:py-8 sm:px-4 flex flex-col items-center">
    <div class="w-full max-w-xl">
      <div class="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
        <Link to="/" :hover="true" class="shrink-0">
          <Button class="px-2 py-1 text-xs sm:text-sm">&larr;</Button>
        </Link>
        <h1 class="text-xl sm:text-2xl font-semibold text-foreground">Vocabulary</h1>
      </div>
      <p class="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
        Select a dictionary to view words.
      </p>
      <div class="grid grid-cols-2 gap-2 sm:gap-3">
        <Link
          v-for="dict in dictionaries"
          :key="dict.id"
          :to="`/vocabulary/${dict.id}`"
          class="block"
          :hover="true"
        >
          <Card
            :title="dict.title"
            :description="`View ${dict.title} word list`"
            :icon="dict.icon"
            :color="dict.color"
            class="h-full"
          />
        </Link>
      </div>
    </div>
  </div>
</template>
