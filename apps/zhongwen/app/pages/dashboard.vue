<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { authClient, useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";

const { user, isPending } = useAuth();
const userStore = useUserStore();

const router = useRouter();

watch(
  [user, isPending],
  ([u, pending]) => {
    if (!pending && !u) {
      router.replace("/");
    }
  },
  { immediate: true },
);

const initials = computed(() => {
  if (!user.value?.name) {
    return "?";
  }
  return user.value.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
});

const readCount = computed(() => userStore.readTextIds.size);

const stats = computed(() => [
  { label: "Texts read", value: readCount.value, icon: "lucide:book-open", color: "#b5ead7" },
  { label: "Streak", value: "—", icon: "lucide:flame", color: "#f4c2c2" },
  { label: "Words saved", value: "—", icon: "lucide:bookmark", color: "#c7b8ea" },
]);

async function signOut() {
  await authClient.signOut();
  router.replace("/");
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-16">
    <div class="w-full max-w-sm space-y-6">
      <!-- Profile -->
      <div class="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div
          class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-foreground"
        >
          <img
            v-if="user?.image"
            :src="user.image"
            :alt="user.name ?? ''"
            class="h-full w-full object-cover"
          />
          <span v-else class="text-lg font-semibold">{{ initials }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-base font-semibold text-foreground">{{ user?.name ?? "—" }}</p>
          <p class="truncate text-sm text-muted-foreground">{{ user?.email ?? "" }}</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="flex flex-col gap-2 rounded-2xl p-4"
          :style="{ backgroundColor: stat.color }"
        >
          <Icon :icon="stat.icon" class="text-xl text-black/60" />
          <div>
            <p class="text-lg leading-none font-bold text-black">{{ stat.value }}</p>
            <p class="mt-0.5 text-xs text-black/50">{{ stat.label }}</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="space-y-2">
        <NuxtLink
          v-for="item in [
            { to: '/', label: 'Home', icon: 'lucide:house' },
            { to: '/reading', label: 'Reading', icon: 'lucide:book-open-text' },
            { to: '/vocabulary', label: 'Vocabulary', icon: 'lucide:library' },
            { to: '/speaking', label: 'Speaking', icon: 'lucide:mic' },
          ]"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Icon :icon="item.icon" class="text-base text-muted-foreground" />
          {{ item.label }}
        </NuxtLink>
      </div>

      <!-- Sign out -->
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        @click="signOut"
      >
        <Icon icon="lucide:log-out" class="text-base" />
        Sign out
      </button>
    </div>
  </div>
</template>
