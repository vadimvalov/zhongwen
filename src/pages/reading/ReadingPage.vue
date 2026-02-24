<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card } from '@/shared/ui/Card'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Select'

type TextMeta = {
  title: string
  description: string
  level: string
}

type Item = {
  id: string
  title: string
  description: string
  level: string
  icon: string
  color: string
}

const icons = [
  'lucide:book-open',
  'lucide:bookmark',
  'lucide:file-text',
  'lucide:quote',
  'lucide:scroll-text',
] as const
const colors = ['#b5ead7', '#c7b8ea', '#e8d5b7', '#f4c2c2', '#d7ebe9'] as const

const rawModules = import.meta.glob('@/assets/texts/*.json', {
  eager: true,
}) as Record<string, { default: TextMeta }>

const items: Item[] = Object.entries(rawModules).map(([path, mod], index) => {
  const idWithExt = path.split('/').pop() || ''
  const id = idWithExt.replace('.json', '')
  const data = mod.default

  return {
    id,
    title: data.title,
    description: data.description,
    level: data.level,
    icon: icons[index % icons.length] as string,
    color: colors[index % colors.length] as string,
  }
})

const levelOptions = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] as const

const selectedLevels = ref<string[]>([])

const filteredItems = computed(() => {
  if (!selectedLevels.value.length) return items
  return items.filter((item) => selectedLevels.value.includes(item.level))
})
</script>

<template>
  <div class="min-h-screen py-8 px-4 flex flex-col items-center">
    <div class="w-full max-w-xl">
      <div class="mb-4 flex items-center gap-3">
        <Link to="/" :hover="true" class="shrink-0">
          <Button class="px-2 py-1 text-sm">&larr;</Button>
        </Link>
        <h1 class="text-2xl font-semibold text-foreground">Reading</h1>
      </div>
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">
          Texts to read with translations and stroke order.
        </p>
        <Select
          v-model="selectedLevels"
          :options="levelOptions.map((l) => ({ label: l, value: l }))"
          class="w-40"
          placeholder="HSK level"
        />
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <Link
          v-for="item in filteredItems"
          :key="item.id"
          :to="`/text/${item.id}`"
          class="block"
          :hover="true"
        >
          <Card
            :title="item.title"
            :description="item.description"
            :icon="item.icon"
            :color="item.color"
            class="h-full"
          />
        </Link>
      </div>
    </div>
  </div>
</template>
