<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import { useEscapeBack } from '@/shared/lib/useEscapeBack'

const userStore = useUserStore()
useEscapeBack()
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden">
    <button
      type="button"
      class="absolute top-3 right-3 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow hover:bg-muted transition-colors"
      aria-label="Toggle theme"
      @click="userStore.toggleTheme()"
    >
      <Icon :icon="userStore.theme === 'dark' ? 'lucide:sun' : 'lucide:moon'" class="text-lg" />
    </button>

    <NuxtPage />
  </div>
</template>
