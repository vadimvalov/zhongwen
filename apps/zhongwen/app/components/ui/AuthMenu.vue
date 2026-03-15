<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { authClient, useAuth } from "~/composables/useAuth";

const { user, isPending } = useAuth();

const open = ref(false);
const menuRef = ref<HTMLElement | null>(null);

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

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

watch(open, (val) => {
  if (val) {
    document.addEventListener("click", onClickOutside);
  } else {
    document.removeEventListener("click", onClickOutside);
  }
});

onUnmounted(() => document.removeEventListener("click", onClickOutside));

async function signOut() {
  await authClient.signOut();
  open.value = false;
}
</script>

<template>
  <div ref="menuRef" class="relative">
    <!-- Not signed in -->
    <button
      v-if="!isPending && !user"
      type="button"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow transition-colors hover:bg-muted"
      aria-label="Sign in"
      @click="authClient.signIn.social({ provider: 'google', callbackURL: '/' })"
    >
      <Icon icon="lucide:user" class="text-lg" />
    </button>

    <!-- Signed in: avatar button -->
    <button
      v-else-if="user"
      type="button"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow transition-colors hover:bg-muted"
      :aria-label="user.name ?? 'Account'"
      @click.stop="open = !open"
    >
      <img
        v-if="user.image"
        :src="user.image"
        :alt="user.name ?? ''"
        class="h-full w-full rounded-md object-cover"
      />
      <span v-else class="text-xs font-semibold">{{ initials }}</span>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-150"
      enter-from-class="opacity-0 -translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-100"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-1 scale-95"
    >
      <div
        v-if="open && user"
        class="absolute top-11 right-0 z-50 w-56 origin-top-right rounded-xl border border-border bg-card shadow-lg"
      >
        <div class="border-b border-border px-4 py-3">
          <p class="truncate text-sm font-medium text-foreground">{{ user.name }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ user.email }}</p>
        </div>
        <div class="p-1.5">
          <NuxtLink
            to="/dashboard"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            @click="open = false"
          >
            <Icon icon="lucide:layout-dashboard" class="text-base text-muted-foreground" />
            Dashboard
          </NuxtLink>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            @click="signOut"
          >
            <Icon icon="lucide:log-out" class="text-base text-muted-foreground" />
            Sign out
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
