<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useThemeStore } from '@/stores/theme'
import { Routing } from '@/pages/routing'

const themeStore = useThemeStore()
</script>

<template>
  <div class="relative min-h-screen">
    <button
      type="button"
      class="fixed top-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground shadow hover:bg-muted transition-colors"
      aria-label="Toggle theme"
      @click="themeStore.toggleTheme()"
    >
      <Icon
        :icon="themeStore.theme === 'dark' ? 'lucide:sun' : 'lucide:moon'"
        class="text-lg"
      />
    </button>
    <Routing />
  </div>
</template>
