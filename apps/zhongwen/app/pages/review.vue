<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { Button } from "~/components/ui/button";
import { useAuth } from "~/composables/useAuth";
import { useDictionaryModules } from "~/composables/useDictionaries";
import type { Word } from "~/lib/types";

const router = useRouter();
const { user, isPending } = useAuth();
const modules = useDictionaryModules();

watch(
  [user, isPending],
  ([u, pending]) => {
    if (!pending && !u) {
      router.replace("/");
    }
  },
  { immediate: true },
);

type ReviewCard = {
  hanzi: string;
  pinyin: string;
  translation: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

type SessionState = "loading" | "reviewing" | "grading" | "complete";

const state = ref<SessionState>("loading");
const queue = ref<ReviewCard[]>([]);
const currentIndex = ref(0);
const showAnswer = ref(false);
const results = ref<{ grade: number; saved: boolean }[]>([]);
const nextSessionAt = ref<string | null>(null);
const totalDue = ref(0);
const streakDays = ref(0);
const failedQueue = ref<ReviewCard[]>([]);
const reviewingFailed = ref(false);
const pendingSaves = ref(0);
const saveError = ref(false);

const currentCard = computed(() => {
  if (reviewingFailed.value) {
    return failedQueue.value[currentIndex.value] ?? null;
  }
  return queue.value[currentIndex.value] ?? null;
});

const activeQueue = computed(() =>
  reviewingFailed.value ? failedQueue.value : queue.value,
);

const progress = computed(() => {
  const q = activeQueue.value;
  if (!q.length) return 0;
  return currentIndex.value / q.length;
});

const accuracy = computed(() => {
  if (!results.value.length) return 0;
  const correct = results.value.filter((r) => r.grade >= 3).length;
  return Math.round((correct / results.value.length) * 100);
});

const remainingDue = computed(() => {
  const reviewed = results.value.length;
  return Math.max(0, totalDue.value - reviewed);
});

/** Build a hanzi → Word lookup from all dictionary modules. */
function buildWordMap(): Map<string, Word> {
  const map = new Map<string, Word>();
  for (const words of Object.values(modules)) {
    for (const word of words as Word[]) {
      if (!map.has(word.hanzi)) {
        map.set(word.hanzi, word);
      }
    }
  }
  return map;
}

/**
 * Predict interval for a given grade without mutating state.
 * Mirrors the SM-2 logic so hints are accurate.
 */
function previewInterval(card: ReviewCard, grade: number): number {
  if (grade < 3) return 1;
  if (card.repetitions === 0) return 1;
  if (card.repetitions === 1) return 6;
  return Math.round(card.intervalDays * card.easeFactor);
}

/** Qualitative label when the interval is the same across buttons. */
function previewLabel(card: ReviewCard, grade: number): string {
  const days = previewInterval(card, grade);
  const base = formatInterval(days);
  if (grade === 5 && card.repetitions < 2) {
    return `${base} +boost`;
  }
  return base;
}

/** Format days into a human-readable hint. */
function formatInterval(days: number): string {
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

async function loadQueue() {
  state.value = "loading";
  try {
    const data = await $fetch<{
      cards: Array<{
        hanzi: string;
        easeFactor: number | null;
        intervalDays: number | null;
        repetitions: number | null;
      }>;
      totalDue: number;
    }>("/api/review/queue");

    totalDue.value = data.totalDue;
    const wordMap = buildWordMap();

    queue.value = data.cards.map((row) => {
      const details = wordMap.get(row.hanzi);
      return {
        hanzi: row.hanzi,
        pinyin: details?.pinyin ?? "",
        translation: details?.translation ?? "",
        easeFactor: row.easeFactor ?? 2.5,
        intervalDays: row.intervalDays ?? 1,
        repetitions: row.repetitions ?? 0,
      };
    });

    currentIndex.value = 0;
    results.value = [];
    failedQueue.value = [];
    reviewingFailed.value = false;
    showAnswer.value = false;
    pendingSaves.value = 0;
    saveError.value = false;

    if (queue.value.length === 0) {
      state.value = "complete";
      await loadCompletionStats();
    } else {
      state.value = "reviewing";
    }
  } catch {
    state.value = "complete";
  }
}

async function loadCompletionStats() {
  try {
    const stats = await $fetch<{
      next_session_at: string | null;
      streak_days: number;
    }>("/api/review/stats");
    nextSessionAt.value = stats.next_session_at;
    streakDays.value = stats.streak_days;
  } catch {
    /* ignore */
  }
}

function revealAnswer() {
  showAnswer.value = true;
  state.value = "grading";
}

const savePromises: Promise<void>[] = [];

/** Fire-and-forget grade submission with pending counter. */
function submitGradeToServer(hanzi: string, grade: number) {
  pendingSaves.value++;
  const p = $fetch("/api/review/submit", {
    method: "POST",
    body: { wordId: hanzi, grade },
  })
    .then(() => {
      pendingSaves.value--;
    })
    .catch(() => {
      pendingSaves.value--;
      saveError.value = true;
    });
  savePromises.push(p);
}

/** Wait for all in-flight saves to settle before querying stats. */
async function waitForSaves() {
  if (savePromises.length) {
    await Promise.allSettled(savePromises);
    savePromises.length = 0;
  }
}

function submitGrade(grade: number) {
  const card = currentCard.value;
  if (!card) return;

  results.value.push({ grade, saved: true });
  submitGradeToServer(card.hanzi, grade);

  if (grade < 3) {
    failedQueue.value.push({ ...card, repetitions: 0, intervalDays: 1 });
  }

  advanceCard();
}

async function advanceCard() {
  const q = activeQueue.value;

  if (currentIndex.value + 1 >= q.length) {
    if (!reviewingFailed.value && failedQueue.value.length > 0) {
      reviewingFailed.value = true;
      currentIndex.value = 0;
      showAnswer.value = false;
      state.value = "reviewing";
      return;
    }
    state.value = "complete";
    await waitForSaves();
    await loadCompletionStats();
  } else {
    currentIndex.value++;
    showAnswer.value = false;
    state.value = "reviewing";
  }
}

function formatTimeUntil(dateStr: string | null): string {
  if (!dateStr) return "No reviews scheduled";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.ceil(hours / 24)}d`;
}

onMounted(() => {
  loadQueue();
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-3 py-4 sm:px-4 sm:py-8">
    <div class="w-full max-w-md space-y-4 sm:space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="h-8 w-8 sm:h-9 sm:w-9"
          @click="router.push('/')"
        >
          <Icon icon="lucide:arrow-left" class="text-base" />
        </Button>
        <h1 class="text-xl font-semibold text-foreground sm:text-2xl">Review</h1>
      </div>

      <!-- Save error banner -->
      <div
        v-if="saveError"
        class="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
      >
        <Icon icon="lucide:wifi-off" class="shrink-0 text-sm" />
        <span>Some cards couldn't be saved — they'll reappear next session.</span>
      </div>

      <!-- Progress bar -->
      <div
        v-if="state !== 'loading' && state !== 'complete'"
        class="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          class="h-full rounded-full bg-foreground/60 transition-all duration-300"
          :style="{ width: `${Math.round(progress * 100)}%` }"
        />
      </div>

      <!-- Loading -->
      <div
        v-if="state === 'loading'"
        class="flex flex-col items-center justify-center gap-4 py-20"
      >
        <Icon icon="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        <p class="text-sm text-muted-foreground">Loading review cards…</p>
      </div>

      <!-- Reviewing / Grading -->
      <div
        v-else-if="(state === 'reviewing' || state === 'grading') && currentCard"
        class="flex flex-col items-center gap-6 pt-8 sm:pt-12"
      >
        <!-- Card count -->
        <div class="flex flex-col items-center gap-0.5">
          <p class="text-xs text-muted-foreground">
            {{ currentIndex + 1 }} / {{ activeQueue.length }}
            <template v-if="reviewingFailed"> (retry)</template>
          </p>
          <p
            v-if="!reviewingFailed && totalDue > queue.length"
            class="text-[10px] text-muted-foreground/70"
          >
            {{ queue.length }} of {{ totalDue }} due
          </p>
        </div>

        <!-- Hanzi -->
        <div class="flex flex-col items-center gap-3">
          <span class="text-6xl font-bold text-foreground sm:text-7xl">
            {{ currentCard.hanzi }}
          </span>
        </div>

        <!-- Answer (pinyin + meaning) -->
        <div
          v-if="showAnswer"
          class="flex flex-col items-center gap-1 text-center"
        >
          <p class="text-xl font-medium text-foreground sm:text-2xl">
            {{ currentCard.pinyin }}
          </p>
          <p class="text-base text-muted-foreground sm:text-lg">
            {{ currentCard.translation }}
          </p>
        </div>

        <!-- Show answer button -->
        <Button
          v-if="state === 'reviewing'"
          class="mt-4 w-full max-w-xs"
          size="lg"
          @click="revealAnswer"
        >
          Show answer
        </Button>

        <!-- Grading buttons -->
        <div
          v-if="state === 'grading'"
          class="mt-4 grid w-full max-w-xs grid-cols-4 gap-1.5 sm:gap-2"
        >
          <button
            class="flex flex-col items-center gap-1 rounded-xl border border-destructive/30 bg-destructive/10 px-2 py-3 text-destructive transition-colors hover:bg-destructive/20 active:bg-destructive/30 sm:px-3 sm:py-4"
            @click="submitGrade(0)"
          >
            <span class="text-sm font-semibold sm:text-base">Again</span>
            <span class="text-[10px] opacity-70 sm:text-xs">
              {{ previewLabel(currentCard, 0) }}
            </span>
          </button>

          <button
            class="flex flex-col items-center gap-1 rounded-xl border border-orange-500/30 bg-orange-500/10 px-2 py-3 text-orange-600 transition-colors hover:bg-orange-500/20 active:bg-orange-500/30 dark:text-orange-400 sm:px-3 sm:py-4"
            @click="submitGrade(3)"
          >
            <span class="text-sm font-semibold sm:text-base">Hard</span>
            <span class="text-[10px] opacity-70 sm:text-xs">
              {{ previewLabel(currentCard, 3) }}
            </span>
          </button>

          <button
            class="flex flex-col items-center gap-1 rounded-xl border border-foreground/20 bg-foreground/5 px-2 py-3 text-foreground transition-colors hover:bg-foreground/10 active:bg-foreground/15 sm:px-3 sm:py-4"
            @click="submitGrade(4)"
          >
            <span class="text-sm font-semibold sm:text-base">Good</span>
            <span class="text-[10px] opacity-70 sm:text-xs">
              {{ previewLabel(currentCard, 4) }}
            </span>
          </button>

          <button
            class="flex flex-col items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-3 text-emerald-600 transition-colors hover:bg-emerald-500/20 active:bg-emerald-500/30 dark:text-emerald-400 sm:px-3 sm:py-4"
            @click="submitGrade(5)"
          >
            <span class="text-sm font-semibold sm:text-base">Easy</span>
            <span class="text-[10px] opacity-70 sm:text-xs">
              {{ previewLabel(currentCard, 5) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Complete -->
      <div
        v-else-if="state === 'complete'"
        class="flex flex-col items-center gap-6 py-12 text-center"
      >
        <Icon
          icon="lucide:check-circle-2"
          class="h-16 w-16 text-emerald-500 sm:h-20 sm:w-20"
        />

        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-foreground sm:text-2xl">
            {{ results.length ? "Session complete!" : "All caught up!" }}
          </h2>
          <p v-if="results.length" class="text-sm text-muted-foreground">
            {{ results.length }} card{{ results.length === 1 ? "" : "s" }} reviewed
            · {{ accuracy }}% accuracy
          </p>
        </div>

        <div
          v-if="streakDays > 0"
          class="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400"
        >
          <Icon icon="lucide:flame" class="text-base" />
          {{ streakDays }}-day streak
        </div>

        <p v-if="remainingDue > 0" class="text-sm text-muted-foreground">
          {{ remainingDue }} more card{{ remainingDue === 1 ? "" : "s" }} due today
        </p>
        <p v-else class="text-sm text-muted-foreground">
          Next review: {{ formatTimeUntil(nextSessionAt) }}
        </p>

        <div class="flex w-full max-w-xs flex-col gap-2">
          <Button
            v-if="remainingDue > 0"
            class="w-full"
            size="lg"
            @click="loadQueue()"
          >
            Review more ({{ remainingDue }})
          </Button>
          <Button
            class="w-full"
            size="lg"
            :variant="remainingDue > 0 ? 'outline' : 'default'"
            @click="router.push('/')"
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
