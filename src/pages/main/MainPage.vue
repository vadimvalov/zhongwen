<script setup lang="ts">
import { Card } from '@/shared/ui/Card'
import { Link } from '@/shared/ui/Link'
import { getCardStyle } from '@/shared/lib/cardStyles'

type MainCard = {
  title: string
  description: string
  to: string | null
  icon: string
  color: string
}

const mainCards: MainCard[] = [
  {
    title: 'Reading',
    description: 'Short stories with translation',
    to: '/reading',
  },
  {
    title: 'Vocabulary',
    description: 'Learn words by HSK level',
    to: '/vocabulary',
  },
  {
    title: 'Speaking',
    description: 'Audio with transcription',
    to: '/speaking',
  },
].map((card, index) => ({
  ...card,
  ...getCardStyle(index, 'main'),
}))
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen py-8 px-4">
    <h1 class="text-2xl font-semibold text-foreground mb-6">大家好</h1>
    <div class="grid grid-cols-2 gap-3 w-full max-w-sm">
      <template v-for="card in mainCards" :key="card.title">
        <Link v-if="card.to" :to="card.to" class="block" :hover="true">
          <Card
            :title="card.title"
            :description="card.description"
            :icon="card.icon"
            :color="card.color"
            class="h-full"
          />
        </Link>
        <Card
          v-else
          :title="card.title"
          :description="card.description"
          :icon="card.icon"
          :color="card.color"
          class="h-full"
        />
      </template>
    </div>
  </div>
</template>
