<script setup lang="ts">
import { Icon } from "@iconify/vue";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { authClient, useAuth } from "~/composables/useAuth";

const { user, isPending } = useAuth();

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

async function signOut() {
  await authClient.signOut();
}
</script>

<template>
  <div>
    <button
      v-if="!isPending && !user"
      type="button"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow transition-colors hover:bg-muted"
      aria-label="Sign in"
      @click="authClient.signIn.social({ provider: 'google', callbackURL: '/' })"
    >
      <Icon icon="lucide:user" class="text-lg" />
    </button>

    <DropdownMenu v-else-if="user">
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card text-foreground shadow transition-colors hover:bg-muted data-[state=open]:bg-muted"
          :aria-label="user.name ?? 'Account'"
        >
          <img
            v-if="user.image"
            :src="user.image"
            :alt="user.name ?? ''"
            class="h-full w-full object-cover"
          />
          <span v-else class="text-xs font-semibold">{{ initials }}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        class="w-72 border-border bg-card shadow-[0_20px_50px_rgb(0_0_0_/_0.3),inset_0_1px_0_rgb(255_255_255_/_0.05)]"
      >
        <DropdownMenuLabel class="border-b border-border">
          <div class="flex items-center gap-4">
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-foreground"
            >
              <img
                v-if="user.image"
                :src="user.image"
                :alt="user.name ?? ''"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-sm font-semibold">{{ initials }}</span>
            </div>
            <div class="min-w-0">
              <p class="truncate text-base font-semibold text-foreground">{{ user.name }}</p>
              <p class="truncate text-sm text-muted-foreground">{{ user.email }}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <div class="p-2">
          <DropdownMenuItem as-child>
            <NuxtLink to="/dashboard" class="w-full">
              <Icon icon="lucide:layout-dashboard" class="text-base text-muted-foreground" />
              Dashboard
            </NuxtLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator class="my-2" />
          <DropdownMenuItem @select="signOut">
            <Icon icon="lucide:log-out" class="text-base text-muted-foreground" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
