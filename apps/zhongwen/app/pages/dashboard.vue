<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { Button } from "~/components/ui/button";
import { authClient, useAuth } from "~/composables/useAuth";
import type { CardTone } from "~/lib/types";
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

type DashboardStat = {
  label: string;
  value: number | string;
  icon: string;
  tone: CardTone;
};

const stats = computed<DashboardStat[]>(() => [
  { label: "Texts read", value: readCount.value, icon: "lucide:book-open", tone: "mint" },
  { label: "Streak", value: "—", icon: "lucide:flame", tone: "rose" },
  { label: "Words saved", value: "—", icon: "lucide:bookmark", tone: "lavender" },
]);

const navItems = [
  { to: "/", label: "Home", icon: "lucide:house" },
  { to: "/reading", label: "Reading", icon: "lucide:book-open-text" },
  { to: "/vocabulary", label: "Vocabulary", icon: "lucide:library" },
  { to: "/speaking", label: "Speaking", icon: "lucide:mic" },
] as const;

async function signOut() {
  await authClient.signOut();
  router.replace("/");
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-16">
    <div class="w-full max-w-sm space-y-6">
      <!-- Profile -->
      <div
        class="flex items-center gap-4 rounded-2xl border border-white/25 bg-card p-5 shadow-[0_18px_40px_rgb(0_0_0_/_0.18),inset_0_1px_0_rgb(255_255_255_/_0.04)]"
      >
        <div
          class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-muted text-foreground"
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
          class="dashboard-stat flex flex-col gap-2 rounded-2xl p-4"
          :data-tone="stat.tone"
        >
          <Icon :icon="stat.icon" class="dashboard-stat__icon text-xl" />
          <div>
            <p class="dashboard-stat__value text-lg leading-none font-bold">{{ stat.value }}</p>
            <p class="dashboard-stat__label mt-0.5 text-xs">{{ stat.label }}</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="space-y-2.5">
        <Button
          v-for="item in navItems"
          :key="item.to"
          as-child
          variant="outline"
          size="lg"
          class="dashboard-action w-full justify-start rounded-2xl border-border bg-card px-4 text-left text-sm font-semibold text-foreground"
        >
          <NuxtLink :to="item.to">
            <Icon :icon="item.icon" class="text-base text-muted-foreground" />
            {{ item.label }}
          </NuxtLink>
        </Button>
      </div>

      <!-- Sign out -->
      <Button
        variant="outline"
        size="lg"
        class="dashboard-action mt-5 w-full rounded-2xl border-border bg-card text-sm font-semibold text-muted-foreground"
        @click="signOut"
      >
        <Icon icon="lucide:log-out" class="text-base" />
        Sign out
      </Button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-stat {
  background-color: var(--card-tone-bg);
}

.dashboard-stat[data-tone="mint"] {
  --card-tone-bg: var(--surface-card-mint);
}

.dashboard-stat[data-tone="lavender"] {
  --card-tone-bg: var(--surface-card-lavender);
}

.dashboard-stat[data-tone="sand"] {
  --card-tone-bg: var(--surface-card-sand);
}

.dashboard-stat[data-tone="rose"] {
  --card-tone-bg: var(--surface-card-rose);
}

.dashboard-stat[data-tone="seafoam"] {
  --card-tone-bg: var(--surface-card-seafoam);
}

.dashboard-stat__icon {
  color: var(--surface-card-foreground-soft);
}

.dashboard-stat__value {
  color: var(--surface-card-foreground);
}

.dashboard-stat__label {
  color: var(--surface-card-foreground-muted);
}

.dashboard-action {
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.04) inset;
}

.dashboard-action:hover {
  transform: translateY(-1px);
}
</style>
