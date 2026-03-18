<script setup lang="ts">
import { Icon } from "@iconify/vue";

import BackButton from "~/components/BackButton.vue";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Link } from "~/components/ui/link";
import { authClient, useAuth } from "~/composables/useAuth";
import type { Challenge } from "~/lib/types";

const router = useRouter();
const { user, isPending } = useAuth();

const inviteCode = ref("");
const joinError = ref("");
const joining = ref(false);

const challenges = ref<Challenge[]>([]);
const loading = ref(true);

const active = computed(() => challenges.value.filter((c) => c.status === "active"));
const upcoming = computed(() => challenges.value.filter((c) => c.status === "upcoming"));
const past = computed(() => challenges.value.filter((c) => c.status === "past"));
const isEmpty = computed(() => challenges.value.length === 0);

async function loadChallenges() {
  try {
    const { data } = await useFetch<Challenge[]>("/api/challenges");
    challenges.value = data.value ?? [];
  } catch {
    /* ignore */
  } finally {
    loading.value = false;
  }
}

async function joinByCode() {
  if (!inviteCode.value.trim()) {
    return;
  }
  const code = inviteCode.value.trim().toUpperCase();
  joining.value = true;
  joinError.value = "";
  try {
    await useFetch("/api/challenges/join", {
      method: "POST",
      body: { inviteCode: code },
    });
    router.push(`/challenges/${code}`);
  } catch (err: any) {
    joinError.value = err?.data?.statusMessage ?? "Could not join challenge";
  } finally {
    joining.value = false;
  }
}

function formatTimeInfo(c: Challenge): string {
  const now = Date.now();
  const end = new Date(c.endsAt).getTime();
  const start = new Date(c.startsAt).getTime();

  if (c.status === "active") {
    const remaining = end - now;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      return `${Math.floor(hours / 24)}d left`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m left`;
    }
    return `${mins}m left`;
  }

  if (c.status === "upcoming") {
    const until = start - now;
    const hours = Math.floor(until / (1000 * 60 * 60));
    if (hours > 24) {
      return `Starts in ${Math.floor(hours / 24)}d`;
    }
    if (hours > 0) {
      return `Starts in ${hours}h`;
    }
    return "Starts soon";
  }

  return `Ended ${new Date(c.endsAt).toLocaleDateString()}`;
}

watch(
  user,
  (u) => {
    if (u) {
      loadChallenges();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8">
    <div class="w-full max-w-lg">
      <div v-if="!isPending && !user" class="py-20 text-center">
        <Icon icon="lucide:lock" class="mx-auto mb-4 text-4xl text-muted-foreground" />
        <p class="mb-1 text-lg font-semibold text-foreground">Sign in required</p>
        <p class="mb-6 text-sm text-muted-foreground">
          Sign in with Google to create or join challenges.
        </p>
        <Button
          @click="
            authClient.signIn.social({
              provider: 'google',
              callbackURL: '/challenges',
            })
          "
        >
          <Icon icon="logos:google-icon" class="mr-2 text-lg" />
          Sign in with Google
        </Button>
      </div>

      <div v-else-if="user">
        <div class="mt-6 mb-6 flex items-center gap-3 md:mt-0">
          <BackButton />
          <h1 class="text-2xl font-semibold text-foreground">Challenges</h1>
          <div class="flex-1" />
          <Link to="/challenges/create" :hover="true">
            <Button size="sm">
              <Icon icon="lucide:plus" class="mr-1 text-sm" />
              Create
            </Button>
          </Link>
        </div>

        <div class="mb-6 flex gap-2">
          <Input
            v-model="inviteCode"
            placeholder="Enter invite code"
            class="flex-1 uppercase"
            maxlength="6"
            @keydown.enter="joinByCode"
          />
          <Button :disabled="joining || !inviteCode.trim()" @click="joinByCode"> Join </Button>
        </div>
        <p v-if="joinError" class="mb-4 text-sm text-destructive">
          {{ joinError }}
        </p>

        <div v-if="loading" class="py-12 text-center text-sm text-muted-foreground">Loading…</div>

        <div v-else-if="isEmpty" class="py-12 text-center">
          <Icon icon="lucide:trophy" class="mx-auto mb-3 text-4xl text-muted-foreground" />
          <p class="text-sm text-muted-foreground">
            No challenges yet — create one or join with an invite code.
          </p>
        </div>

        <template v-else>
          <section v-if="active.length" class="mb-6">
            <h2 class="mb-3 text-sm font-semibold text-foreground">Active now</h2>
            <div class="flex flex-col gap-2">
              <Link
                v-for="c in active"
                :key="c.inviteCode"
                :to="`/challenges/${c.inviteCode}`"
                class="block"
                :hover="true"
              >
                <div
                  class="rounded-2xl border border-border bg-card p-4 transition-transform hover:-translate-y-0.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-foreground">
                        {{ c.title }}
                      </p>
                      <p class="mt-0.5 text-xs text-muted-foreground">
                        HSK {{ c.hskLevel }} · {{ c.questionCount }} questions ·
                        {{ c.participantCount }} players
                      </p>
                    </div>
                    <span
                      class="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      {{ formatTimeInfo(c) }}
                    </span>
                  </div>
                  <div
                    v-if="c.bestScore !== null"
                    class="mt-2 flex items-center gap-3 text-xs text-muted-foreground"
                  >
                    <span>Score: {{ c.bestScore }}/{{ c.questionCount }}</span>
                    <span
                      v-if="c.rank !== null"
                      class="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
                    >
                      #{{ c.rank }} of {{ c.rankTotal }}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          <section v-if="upcoming.length" class="mb-6">
            <h2 class="mb-3 text-sm font-semibold text-foreground">Upcoming</h2>
            <div class="flex flex-col gap-2">
              <Link
                v-for="c in upcoming"
                :key="c.inviteCode"
                :to="`/challenges/${c.inviteCode}`"
                class="block"
                :hover="true"
              >
                <div
                  class="rounded-2xl border border-border bg-card p-4 transition-transform hover:-translate-y-0.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-foreground">
                        {{ c.title }}
                      </p>
                      <p class="mt-0.5 text-xs text-muted-foreground">
                        HSK {{ c.hskLevel }} · {{ c.questionCount }} questions ·
                        {{ c.participantCount }} players
                      </p>
                    </div>
                    <span
                      class="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
                    >
                      {{ formatTimeInfo(c) }}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          <section v-if="past.length">
            <h2 class="mb-3 text-sm font-semibold text-foreground">Past</h2>
            <div class="flex flex-col gap-2">
              <Link
                v-for="c in past"
                :key="c.inviteCode"
                :to="`/challenges/${c.inviteCode}`"
                class="block"
                :hover="true"
              >
                <div
                  class="rounded-2xl border border-border bg-card p-4 opacity-70 transition-transform hover:-translate-y-0.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-foreground">
                        {{ c.title }}
                      </p>
                      <p class="mt-0.5 text-xs text-muted-foreground">
                        HSK {{ c.hskLevel }} · {{ c.participantCount }} players
                      </p>
                    </div>
                    <span class="shrink-0 text-xs text-muted-foreground">
                      {{ formatTimeInfo(c) }}
                    </span>
                  </div>
                  <div
                    v-if="c.bestScore !== null"
                    class="mt-2 flex items-center gap-3 text-xs text-muted-foreground"
                  >
                    <span>Score: {{ c.bestScore }}/{{ c.questionCount }}</span>
                    <span
                      v-if="c.rank !== null"
                      class="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
                    >
                      #{{ c.rank }} of {{ c.rankTotal }}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>
