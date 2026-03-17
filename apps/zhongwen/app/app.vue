<script setup lang="ts">
import { Icon } from "@iconify/vue";

import AuthMenu from "~/components/AuthMenu.vue";
import { Toaster } from "~/components/ui/sonner";
import { useAuth } from "~/composables/useAuth";
import { useEscapeBack } from "~/composables/useEscapeBack";
import { useUserStore } from "~/stores/user";

const userStore = useUserStore();
const { user, isPending } = useAuth();

useEscapeBack();

watch(
  [user, isPending],
  async ([u, pending]) => {
    if (pending) {
      return;
    }
    if (u) {
      await Promise.all([userStore.refreshReadTextIds(), userStore.refreshKnownWords()]);
    } else {
      userStore.readTextIds = new Set();
      userStore.knownWords = new Set();
    }
  },
  { immediate: true },
);
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
    <Toaster
      :theme="userStore.theme === 'dark' ? 'dark' : 'light'"
      position="bottom-right"
      rich-colors
    />
  </div>
</template>
