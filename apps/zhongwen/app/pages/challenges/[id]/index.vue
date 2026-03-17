<script setup lang="ts">
import { Icon } from "@iconify/vue";
import confetti from "canvas-confetti";

import BackButton from "~/components/BackButton.vue";
import { Button } from "~/components/ui/button";
import { authClient, useAuth } from "~/composables/useAuth";
import type { ChallengeDetail, ChallengeResults } from "~/lib/types";

const route = useRoute();
const router = useRouter();
const { user, isPending } = useAuth();

const id = route.params.id as string;

const challenge = ref<ChallengeDetail | null>(null);
const loading = ref(true);
const copied = ref(false);
const confettiFired = ref(false);
const showResults = ref(false);
const resultsData = ref<ChallengeResults | null>(null);
const resultsLoading = ref(false);
const joining = ref(false);
const joinError = ref("");
const deleting = ref(false);
const deleteError = ref("");

const isActive = computed(() => {
  if (!challenge.value) {
    return false;
  }
  const now = Date.now();
  return (
    new Date(challenge.value.startsAt).getTime() <= now &&
    now < new Date(challenge.value.endsAt).getTime()
  );
});

const isEnded = computed(() => {
  if (!challenge.value) {
    return false;
  }
  return Date.now() >= new Date(challenge.value.endsAt).getTime();
});

const userHasPlayed = computed(() => {
  if (!challenge.value || !user.value) {
    return false;
  }
  return challenge.value.leaderboard.some((e) => e.userId === user.value!.id);
});

async function load() {
  try {
    challenge.value = await $fetch(`/api/challenges/${id}`);
  } catch {
    /* will show empty */
  } finally {
    loading.value = false;
  }
}

async function copyCode() {
  if (!challenge.value) {
    return;
  }
  await navigator.clipboard.writeText(challenge.value.inviteCode);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${secs}s`;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${s.toLocaleDateString(undefined, opts)} — ${e.toLocaleDateString(undefined, opts)}`;
}

function fireConfetti() {
  if (confettiFired.value) {
    return;
  }
  confettiFired.value = true;
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
}

async function loadResults() {
  if (resultsData.value) {
    showResults.value = !showResults.value;
    return;
  }
  resultsLoading.value = true;
  try {
    resultsData.value = await $fetch(`/api/challenges/${id}/results`);
    showResults.value = true;
  } catch {
    /* no results available */
  } finally {
    resultsLoading.value = false;
  }
}

async function joinChallenge() {
  if (!challenge.value) {
    return;
  }
  joining.value = true;
  joinError.value = "";
  try {
    await $fetch("/api/challenges/join", {
      method: "POST",
      body: { inviteCode: challenge.value.inviteCode },
    });
    challenge.value = { ...challenge.value, isParticipant: true };
  } catch (err: any) {
    joinError.value = err?.data?.statusMessage ?? "Could not join challenge";
  } finally {
    joining.value = false;
  }
}

async function deleteChallenge() {
  if (!challenge.value) {
    return;
  }
  deleting.value = true;
  deleteError.value = "";
  try {
    await $fetch(`/api/challenges/${id}`, {
      method: "DELETE",
    });
    router.push("/challenges");
  } catch (err: any) {
    deleteError.value = err?.data?.statusMessage ?? "Failed to delete challenge";
  } finally {
    deleting.value = false;
  }
}

watch(
  user,
  (u) => {
    if (u) {
      load();
    }
  },
  { immediate: true },
);

watch([() => challenge.value?.leaderboard, isEnded], () => {
  if (isEnded.value && challenge.value?.leaderboard?.length) {
    nextTick(fireConfetti);
  }
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8">
    <div class="w-full max-w-lg">
      <div v-if="!isPending && !user" class="py-20 text-center">
        <Icon icon="lucide:lock" class="mx-auto mb-4 text-4xl text-muted-foreground" />
        <p class="mb-1 text-lg font-semibold text-foreground">Sign in required</p>
        <p class="mb-6 text-sm text-muted-foreground">
          Sign in with Google to view this challenge.
        </p>
        <Button
          @click="
            authClient.signIn.social({
              provider: 'google',
              callbackURL: `/challenges/${id}`,
            })
          "
        >
          <Icon icon="logos:google-icon" class="mr-2 text-lg" />
          Sign in with Google
        </Button>
      </div>

      <div v-else-if="user">
        <div class="mb-6 flex items-center gap-3">
          <BackButton />
          <h1 class="truncate text-2xl font-semibold text-foreground">
            {{ challenge?.title ?? "Challenge" }}
          </h1>
          <div class="flex-1" />
          <Button
            v-if="
              challenge &&
              (challenge.createdBy === user?.id || user?.id === '1L1aU9BQM0CHwuiumLtdLEbEbppCTYu2')
            "
            variant="outline"
            size="icon"
            class="h-8 w-8 text-destructive"
            :disabled="deleting"
            @click="deleteChallenge"
          >
            <Icon icon="lucide:trash-2" class="text-sm" />
          </Button>
        </div>

        <div v-if="loading" class="py-12 text-center text-sm text-muted-foreground">Loading…</div>

        <div v-else-if="!challenge" class="py-12 text-center text-sm text-muted-foreground">
          Challenge not found.
        </div>

        <template v-else>
          <div class="mb-4 rounded-2xl border border-border bg-card p-4">
            <p v-if="challenge.description" class="mb-3 text-sm text-muted-foreground">
              {{ challenge.description }}
            </p>
            <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span class="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground"
                >HSK {{ challenge.hskLevel }}</span
              >
              <span>{{ challenge.questionCount }} questions</span>
              <span>{{ challenge.timeLimitSec }}s per question</span>
              <span>{{ challenge.participantCount }} players</span>
            </div>
            <p class="mt-2 text-xs text-muted-foreground">
              {{ formatDateRange(challenge.startsAt, challenge.endsAt) }}
            </p>

            <div v-if="isEnded" class="mt-3">
              <span
                class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                Challenge ended
              </span>
            </div>
          </div>

          <div class="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-4">
            <div class="flex-1">
              <p class="text-xs text-muted-foreground">Invite code</p>
              <p class="font-mono text-lg font-bold tracking-widest text-foreground">
                {{ challenge.inviteCode }}
              </p>
            </div>
            <Button size="sm" variant="outline" @click="copyCode">
              <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" class="mr-1 text-sm" />
              {{ copied ? "Copied" : "Copy" }}
            </Button>
          </div>

          <div v-if="!challenge.isParticipant" class="mb-4 flex flex-col gap-2">
            <p class="text-xs text-muted-foreground">
              Join this challenge with your current account to participate and appear on the
              leaderboard.
            </p>
            <Button class="w-full" size="sm" :disabled="joining" @click="joinChallenge">
              {{ joining ? "Joining…" : "Join challenge" }}
            </Button>
            <p v-if="joinError" class="text-xs text-destructive">
              {{ joinError }}
            </p>
          </div>

          <div v-if="isActive && challenge.isParticipant && !userHasPlayed" class="mb-6">
            <Button class="w-full" size="lg" @click="router.push(`/challenges/${id}/play`)">
              Start challenge
            </Button>
          </div>

          <div v-if="userHasPlayed" class="mb-6">
            <Button
              class="w-full"
              variant="outline"
              @click="loadResults"
              :disabled="resultsLoading"
            >
              <Icon
                :icon="showResults ? 'lucide:chevron-up' : 'lucide:clipboard-list'"
                class="mr-2 text-base"
              />
              {{ resultsLoading ? "Loading…" : showResults ? "Hide results" : "View your results" }}
            </Button>
          </div>

          <div v-if="showResults && resultsData" class="mb-6">
            <div class="mb-3 rounded-2xl border border-border bg-card p-4 text-center">
              <p class="text-3xl font-bold text-foreground">
                {{ resultsData.score }}/{{ resultsData.totalQuestions }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                Completed in {{ formatTime(resultsData.timeMs) }}
              </p>
            </div>
            <div class="space-y-2">
              <div
                v-for="ans in resultsData.answers"
                :key="ans.questionIdx"
                :class="[
                  'rounded-xl border px-4 py-3 text-sm',
                  ans.correct
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-red-500/30 bg-red-500/5',
                ]"
              >
                <div class="flex items-baseline gap-2">
                  <p class="text-base font-bold text-foreground">
                    {{ ans.hanzi }}
                  </p>
                  <p class="text-xs text-muted-foreground">{{ ans.pinyin }}</p>
                </div>
                <p v-if="ans.correct" class="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ {{ ans.correctAnswer }}
                </p>
                <template v-else>
                  <p class="mt-1 text-xs text-red-600 dark:text-red-400">
                    ✗ Your answer: {{ ans.selected || "(timed out)" }}
                  </p>
                  <p class="text-xs text-muted-foreground">Correct: {{ ans.correctAnswer }}</p>
                </template>
              </div>
            </div>
          </div>

          <div v-if="challenge.leaderboard.length" class="rounded-2xl border border-border bg-card">
            <h2 class="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
              Leaderboard
            </h2>
            <div class="divide-y divide-border">
              <div
                v-for="entry in challenge.leaderboard"
                :key="entry.userId"
                :class="[
                  'flex items-center gap-3 px-4 py-3',
                  entry.userId === user?.id && 'bg-primary/5',
                ]"
              >
                <span
                  :class="[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    entry.rank === 1
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground',
                  ]"
                >
                  {{ entry.rank }}
                </span>

                <img
                  v-if="entry.image"
                  :src="entry.image"
                  :alt="entry.name"
                  class="h-7 w-7 shrink-0 rounded-full object-cover"
                />
                <div
                  v-else
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
                >
                  {{ entry.name.charAt(0).toUpperCase() }}
                </div>

                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-foreground">
                    {{ entry.name }}
                    <span v-if="entry.userId === user?.id" class="text-xs text-muted-foreground"
                      >(you)</span
                    >
                  </p>
                </div>

                <div class="text-right">
                  <p class="text-sm font-semibold text-foreground">
                    {{ entry.score }}/{{ challenge.questionCount }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ formatTime(entry.timeMs) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground"
          >
            No attempts yet — be the first to play!
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
