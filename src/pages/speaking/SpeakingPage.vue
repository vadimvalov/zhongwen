<script setup lang="ts">
import { Card } from '@/shared/ui/Card'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { getCardStyle } from '@/shared/lib/cardStyles'

const modes = [
  {
    title: 'Words',
    description: 'Practise pronunciation word by word',
    to: '/speaking/words' as string | null,
    ...getCardStyle(0, 'main'),
  },
  {
    title: 'Sentences',
    description: 'Practise full sentence pronunciation',
    to: null as string | null,
    ...getCardStyle(1, 'main'),
  },
]
</script>

<template>
  <div class="min-h-screen py-4 px-3 sm:py-8 sm:px-4 flex flex-col items-center">
    <div class="w-full max-w-sm">
      <div class="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
        <Link to="/" :hover="true" class="shrink-0">
          <Button class="px-2 py-1 text-xs sm:text-sm">&larr;</Button>
        </Link>
        <h1 class="text-xl sm:text-2xl font-semibold text-foreground">Speaking</h1>
      </div>
      <p class="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
        Choose a practice mode.
      </p>
      <div class="grid grid-cols-2 gap-3">
        <template v-for="mode in modes" :key="mode.title">
          <Link v-if="mode.to" :to="mode.to" class="block" :hover="true">
            <Card
              :title="mode.title"
              :description="mode.description"
              :icon="mode.icon"
              :color="mode.color"
              class="h-full"
            />
          </Link>
          <Card
            v-else
            :title="mode.title"
            :description="mode.description"
            :icon="mode.icon"
            :color="mode.color"
            class="h-full"
          />
        </template>
      </div>
    </div>
  </div>
</template>
