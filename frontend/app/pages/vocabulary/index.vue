<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Card } from '@/shared/ui/Card'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { getCardStyle } from '@/shared/lib/cardStyles'
import { formatDictName } from '@/shared/lib/formatters'

const modules = import.meta.glob('@/assets/dictionaries/*.json', {
  eager: true,
}) as Record<string, { default: unknown[] }>

const router = useRouter()
const searchQuery = ref('')

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

function handleSearch() {
  const value = searchQuery.value.trim()
  if (!value) return
  if (!/^[\u4e00-\u9fff\u3400-\u4dbf]+$/.test(value)) return

  if (value === '我操你吗') {
    if (typeof window !== 'undefined') {
      window.open('https://youtu.be/FumbPNRKTs8?si=jax27cejG7iBtmi1', '_blank')
    }
    return
  }

  router.push(`/vocabulary/search/${encodeURIComponent(value)}`)
}
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
      <div class="mb-4 sm:mb-6 space-y-2">
        <p class="text-xs sm:text-sm text-muted-foreground">
          Select a dictionary to view words or search for a specific word.
        </p>
        <form class="flex flex-col gap-2" @submit.prevent="handleSearch">
          <div class="flex gap-2">
            <input
              v-model="searchQuery"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="Search word (hanzi)..."
              class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
            <Button
              type="submit"
              class="px-3 py-2 text-xs sm:text-sm"
              :disabled="!searchQuery.trim() || !/^[\u4e00-\u9fff\u3400-\u4dbf]+$/.test(searchQuery.trim())"
            >
              Search
            </Button>
          </div>
          <p
            v-if="searchQuery.trim() && !/^[\u4e00-\u9fff\u3400-\u4dbf]+$/.test(searchQuery.trim())"
            class="text-xs text-muted-foreground"
          >
            Only Chinese characters (hanzi) are allowed.
          </p>
        </form>
      </div>
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
