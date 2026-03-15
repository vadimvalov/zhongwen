<script setup lang="ts">
import { Icon } from "@iconify/vue";

import AuthMenu from "~/components/ui/AuthMenu.vue";
import { useEscapeBack } from "~/composables/useEscapeBack";
import { useUserStore } from "~/stores/user";

const userStore = useUserStore();

useEscapeBack();
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden">
    <div class="absolute top-3 right-3 z-10 flex items-center gap-2">
      <AuthMenu />
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow transition-colors hover:bg-muted"
        aria-label="Toggle theme"
        @click="userStore.toggleTheme()"
      >
        <Icon :icon="userStore.theme === 'dark' ? 'lucide:sun' : 'lucide:moon'" class="text-lg" />
      </button>
    </div>

    <NuxtPage />
  </div>
</template>
