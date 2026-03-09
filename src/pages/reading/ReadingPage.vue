<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Card } from '@/shared/ui/Card'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Select'
import { getCardStyle } from '@/shared/lib/cardStyles'
import type { ReadingItem as Item, TextMeta } from '@/shared/lib/types'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const rawModules = import.meta.glob('@/assets/texts/*.json', {
  eager: true,
}) as Record<string, { default: TextMeta }>

const items: Item[] = Object.entries(rawModules).map(([path, mod], index) => {
  const idWithExt = path.split('/').pop() || ''
  const id = idWithExt.replace('.json', '')
  const data = mod.default
  const { icon, color } = getCardStyle(index, 'reading')

  return {
    id,
    title: data.title,
    description: data.description,
    level: data.level,
    icon,
    color,
  }
})

const levelOptions = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] as const

const selectedLevels = ref<string[]>([])

const filteredItems = computed(() => {
  if (!selectedLevels.value.length) return items
  return items.filter((item) => selectedLevels.value.includes(item.level))
})

const pageSize = ref(8)

function updatePageSize() {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(min-width: 1024px)').matches) {
    pageSize.value = 12
  } else if (window.matchMedia('(min-width: 768px)').matches) {
    pageSize.value = 9
  } else {
    pageSize.value = 8
  }
}

onMounted(() => {
  updatePageSize()
  window.addEventListener('resize', updatePageSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePageSize)
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value)),
)

const currentPage = computed({
  get() {
    const p = Number(route.query.page)
    const n = Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1
    return Math.min(n, totalPages.value)
  },
  set(page: number) {
    const q = { ...route.query }
    if (page <= 1) {
      delete q.page
    } else {
      q.page = String(page)
    }
    router.replace({ path: route.path, query: q })
  },
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

function goToPage(page: number) {
  currentPage.value = page
}

watch(selectedLevels, () => {
  const q = { ...route.query }
  delete q.page
  router.replace({ path: route.path, query: q })
})

watch(
  [() => route.query.page, totalPages],
  () => {
    const parsed = Number(route.query.page)
    if (!Number.isFinite(parsed) || parsed < 1) return
    const clamped = Math.min(Math.max(1, Math.floor(parsed)), totalPages.value)
    if (clamped === parsed) return
    const q = { ...route.query }
    if (clamped <= 1) delete q.page
    else q.page = String(clamped)
    router.replace({ path: route.path, query: q })
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-screen py-8 px-4 flex flex-col items-center">
    <div class="w-full max-w-4xl">
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
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Link
          v-for="item in paginatedItems"
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
            :read="userStore.isRead(item.id)"
            class="h-full"
          />
        </Link>
      </div>

      <div v-if="totalPages > 1" class="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          class="px-3 py-1.5 text-sm"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          ← Prev
        </Button>
        <span class="text-sm text-muted-foreground px-2">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <Button
          type="button"
          class="px-3 py-1.5 text-sm"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          Next →
        </Button>
      </div>
    </div>
  </div>
</template>
