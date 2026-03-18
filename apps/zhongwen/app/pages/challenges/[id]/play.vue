<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { Button } from "~/components/ui/button";
import { authClient, useAuth } from "~/composables/useAuth";

definePageMeta({ layout: false });

const route = useRoute();
const router = useRouter();
const { user, isPending } = useAuth();

const challengeId = route.params.id as string;

type Question = {
  idx: number;
  hanzi: string;
  pinyin: string;
  prompt: string;
  options: { label: string }[];
};

type StartChallengeResponse = {
  attemptId: string;
  timeLimitSec: number;
  questions: Question[];
};

type Phase = "loading" | "playing" | "submitting" | "results";

const phase = ref<Phase>("loading");
const attemptId = ref("");
const timeLimitSec = ref(15);
const questions = ref<Question[]>([]);
const current = ref(0);
const answers = ref<{ questionIdx: number; selected: string; timeMs: number }[]>([]);

const timerStart = ref(0);
const timerRemaining = ref(1);
let timerInterval: ReturnType<typeof setInterval> | null = null;

const results = ref<{
  score: number;
  totalQuestions: number;
  timeMs: number;
  answers: {
    questionIdx: number;
    hanzi: string;
    selected: string;
    correctAnswer: string;
    correct: boolean;
  }[];
} | null>(null);

const loadError = ref("");
const progress = computed(() => current.value / questions.value.length);
const currentQuestion = computed(() => questions.value[current.value]);

/**
 * Start the challenge by fetching questions from the API.
 */
async function startChallenge() {
  try {
    const data = await $fetch<StartChallengeResponse>(
      `/api/challenges/${challengeId}/start` as string,
      { method: "POST" },
    );
    attemptId.value = data.attemptId;
    timeLimitSec.value = data.timeLimitSec;
    questions.value = data.questions;
    phase.value = "playing";
    startTimer();
  } catch (err: any) {
    if (err?.data?.statusMessage === "You have already completed this challenge") {
      router.replace(`/challenges/${challengeId}`);
      return;
    }
    loadError.value = err?.data?.statusMessage ?? "Could not start challenge";
  }
}

/**
 * Start the per-question countdown timer.
 */
function startTimer() {
  timerStart.value = Date.now();
  timerRemaining.value = 1;
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - timerStart.value;
    const ratio = 1 - elapsed / (timeLimitSec.value * 1000);
    timerRemaining.value = Math.max(0, ratio);
    if (ratio <= 0) {
      selectAnswer(null);
    }
  }, 50);
}

/**
 * Record the user's answer and advance to the next question.
 * @param label - The selected option label, or null if timed out.
 */
function selectAnswer(label: string | null) {
  const elapsed = Date.now() - timerStart.value;
  answers.value.push({
    questionIdx: current.value,
    selected: label ?? "",
    timeMs: Math.min(elapsed, timeLimitSec.value * 1000),
  });

  if (current.value + 1 < questions.value.length) {
    current.value++;
    startTimer();
  } else {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    submitAnswers();
  }
}

/**
 * Submit all answers to the server for grading.
 */
async function submitAnswers() {
  phase.value = "submitting";
  try {
    results.value = await $fetch(`/api/challenges/${challengeId}/submit` as string, {
      method: "POST",
      body: { attemptId: attemptId.value, answers: answers.value },
    });
    phase.value = "results";
  } catch {
    phase.value = "results";
  }
}

/**
 * Format milliseconds to a readable time string.
 */
function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${secs}s`;
}

watch(
  user,
  (u) => {
    if (u && phase.value === "loading" && !loadError.value) {
      startChallenge();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Auth gate -->
      <div v-if="!isPending && !user" class="py-20 text-center">
        <Icon icon="lucide:lock" class="mx-auto mb-4 text-4xl text-muted-foreground" />
        <p class="mb-1 text-lg font-semibold text-foreground">Sign in required</p>
        <p class="mb-6 text-sm text-muted-foreground">
          Sign in with Google to play this challenge.
        </p>
        <Button
          @click="
            authClient.signIn.social({
              provider: 'google',
              callbackURL: `/challenges/${challengeId}/play`,
            })
          "
        >
          <Icon icon="logos:google-icon" class="mr-2 text-lg" />
          Sign in with Google
        </Button>
      </div>

      <!-- Loading -->
      <div v-else-if="phase === 'loading'" class="text-center">
        <p v-if="loadError" class="text-sm text-destructive">{{ loadError }}</p>
        <p v-else class="text-sm text-muted-foreground">Loading challenge…</p>
        <Button v-if="loadError" class="mt-4" @click="router.push(`/challenges/${challengeId}`)">
          Go back
        </Button>
      </div>

      <!-- Playing -->
      <template v-if="phase === 'playing' && currentQuestion">
        <div class="mb-6 text-center">
          <p class="text-sm text-muted-foreground">
            Question {{ current + 1 }} of {{ questions.length }}
          </p>
        </div>

        <!-- Progress bar -->
        <div
          class="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          :aria-valuenow="Math.round(progress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full rounded-full bg-foreground/60 transition-all duration-300"
            :style="{ width: `${Math.round(progress * 100)}%` }"
          />
        </div>

        <!-- Timer bar -->
        <div class="mb-8 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            :class="[
              'h-full rounded-full transition-all duration-75',
              timerRemaining > 0.25 ? 'bg-emerald-500' : 'bg-red-500',
            ]"
            :style="{ width: `${Math.round(timerRemaining * 100)}%` }"
          />
        </div>

        <Transition name="slide-fade" mode="out-in">
          <div :key="current">
            <!-- Question card -->
            <div class="mb-6 rounded-2xl border border-border bg-card p-6 text-center">
              <p class="text-2xl font-bold text-foreground sm:text-3xl">
                {{ currentQuestion.hanzi }}
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ currentQuestion.pinyin }}
              </p>
              <p class="mt-3 text-sm font-medium text-foreground">
                {{ currentQuestion.prompt }}
              </p>
            </div>

            <!-- Answer options -->
            <div class="flex flex-col gap-2">
              <Button
                v-for="(option, idx) in currentQuestion.options"
                :key="idx"
                variant="outline"
                class="w-full justify-start px-4 py-3 text-left text-sm"
                @click="selectAnswer(option.label)"
              >
                {{ option.label }}
              </Button>
            </div>
          </div>
        </Transition>
      </template>

      <!-- Submitting -->
      <div v-if="phase === 'submitting'" class="py-12 text-center text-sm text-muted-foreground">
        Submitting your answers…
      </div>

      <!-- Results -->
      <template v-if="phase === 'results' && results">
        <div class="text-center">
          <p class="text-5xl font-bold text-foreground">
            {{ results.score }}/{{ results.totalQuestions }}
          </p>
          <p class="mt-2 text-sm text-muted-foreground">
            Completed in {{ formatTime(results.timeMs) }}
          </p>

          <div class="mt-8 flex flex-col gap-2">
            <Button size="lg" class="w-full" @click="router.push(`/challenges/${challengeId}`)">
              View leaderboard
            </Button>
          </div>

          <!-- Answer breakdown -->
          <div class="mt-8 space-y-2 text-left">
            <div
              v-for="ans in results.answers"
              :key="ans.questionIdx"
              :class="[
                'rounded-xl border px-4 py-3 text-sm',
                ans.correct
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-red-500/30 bg-red-500/5',
              ]"
            >
              <p class="font-medium text-foreground">{{ ans.hanzi }}</p>
              <p v-if="ans.correct" class="text-xs text-emerald-600 dark:text-emerald-400">
                ✓ {{ ans.correctAnswer }}
              </p>
              <template v-else>
                <p class="text-xs text-red-600 dark:text-red-400">
                  ✗ Your answer: {{ ans.selected || "(timed out)" }}
                </p>
                <p class="text-xs text-muted-foreground">Correct: {{ ans.correctAnswer }}</p>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
