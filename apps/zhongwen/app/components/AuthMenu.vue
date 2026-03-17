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
import { useUserStore } from "~/stores/user";

const { user, isPending } = useAuth();
const userStore = useUserStore();
const router = useRouter();

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

const textsRead = computed(() => userStore.readTextIds.size);
const knownWords = computed(() => userStore.knownWords.size);

async function signOut() {
  await authClient.signOut();
}
</script>

<template>
  <div>
    <div v-if="!isPending && !user" class="flex items-center gap-3">
      <p class="hidden text-xs text-muted-foreground lg:flex lg:items-center lg:gap-1.5">
        <span>Save the progress, sign in</span>
        <Icon icon="lucide:arrow-right" class="text-sm" />
      </p>
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-white text-foreground shadow transition-colors hover:bg-gray-300"
        aria-label="Sign in"
        @click="authClient.signIn.social({ provider: 'google', callbackURL: '/' })"
      >
        <Icon icon="logos:google-icon" class="text-xl" />
      </button>
    </div>

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
              <p class="truncate text-base font-semibold text-foreground">
                {{ user.name }}
              </p>
              <p class="truncate text-sm text-muted-foreground">
                {{ user.email }}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <div class="space-y-1.5 p-2">
          <DropdownMenuItem @select="router.push('/reading')">
            <Icon icon="lucide:book-open" class="text-base text-muted-foreground" />
            <span class="flex-1 text-xs font-medium text-foreground">Texts read</span>
            <span class="text-xs text-foreground tabular-nums">{{ textsRead }}</span>
          </DropdownMenuItem>
          <DropdownMenuItem @select="router.push('/known-words')">
            <Icon icon="lucide:bookmark-check" class="text-base text-muted-foreground" />
            <span class="flex-1 text-xs font-medium text-foreground">Known words</span>
            <span class="text-xs text-foreground tabular-nums">{{ knownWords }}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator class="my-1.5" />
          <DropdownMenuItem @select="signOut">
            <Icon icon="lucide:log-out" class="text-base text-muted-foreground" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
