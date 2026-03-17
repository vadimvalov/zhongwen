<script setup lang="ts">
import { computed, ref } from "vue";

import { Button } from "~/components/ui/button";
import { useUserStore } from "~/stores/user";

definePageMeta({ layout: false });

const router = useRouter();
const userStore = useUserStore();

/**
 * Five progressive questions spanning HSK 1–6.
 * Each question displays Hanzi + Pinyin and four answer options.
 */
const questions = [
  {
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    prompt: "What does this mean?",
    options: [
      { label: "Hello", correct: true },
      { label: "Goodbye" },
      { label: "Thank you" },
      { label: "Sorry" },
    ],
  },
  {
    hanzi: "已经",
    pinyin: "yǐjīng",
    prompt: "What does this word mean?",
    options: [
      { label: "Always" },
      { label: "Already", correct: true },
      { label: "Still" },
      { label: "Never" },
    ],
  },
  {
    hanzi: "环境",
    pinyin: "huánjìng",
    prompt: "What does this word mean?",
    options: [
      { label: "Economy" },
      { label: "Education" },
      { label: "Environment", correct: true },
      { label: "Experience" },
    ],
  },
  {
    hanzi: "她不但会说中文，而且说得很流利。",
    pinyin: "tā bùdàn huì shuō zhōngwén, érqiě shuō de hěn liúlì.",
    prompt: "What does this sentence mean?",
    options: [
      { label: "She can't speak Chinese fluently." },
      { label: "She not only speaks Chinese, but speaks it fluently.", correct: true },
      { label: "She used to speak Chinese fluently." },
      { label: "She is learning to speak Chinese." },
    ],
  },
  {
    hanzi: "尽管",
    pinyin: "jǐnguǎn",
    prompt: "What does this word mean?",
    options: [
      { label: "Because" },
      { label: "Therefore" },
      { label: "Even though / despite", correct: true },
      { label: "As long as" },
    ],
  },
] as const;

const TOTAL = questions.length;

/** Point value per question — equal to its target HSK level (max total: 15). */
const QUESTION_WEIGHTS = [1, 2, 3, 4, 5] as const;

/**
 * Map a weighted score (0–15) to an HSK level (1–6).
 * @param s - Sum of correct question weights.
 */
function scoreToLevel(s: number): number {
  if (s >= 13) return 6;
  if (s >= 10) return 5;
  if (s >= 7) return 4;
  if (s >= 4) return 3;
  if (s >= 2) return 2;
  return 1;
}

type Phase = "quiz" | "result";

const phase = ref<Phase>("quiz");
const current = ref(0);
const score = ref(0);

const progress = computed(() => current.value / TOTAL);

/**
 * Record the user's answer and advance to the next question or results.
 * @param correct - Whether the selected option was the correct one.
 */
function selectAnswer(correct: boolean) {
  if (correct) score.value += QUESTION_WEIGHTS[current.value];
  if (current.value + 1 < TOTAL) {
    current.value++;
  } else {
    phase.value = "result";
    userStore.setHskLevel(scoreToLevel(score.value));
  }
}

/** HSK level derived from the weighted score. */
const placedLevel = computed(() => scoreToLevel(score.value));

/**
 * Persist the placed level and navigate to reading filtered by that level.
 */
function startLearning() {
  userStore.setHskLevel(placedLevel.value);
  router.replace({ path: "/reading", query: { level: `HSK${placedLevel.value}` } });
}

/**
 * Skip the quiz and default to HSK 1.
 */
function skipAsBeginner() {
  userStore.setHskLevel(1);
  router.replace({ path: "/reading", query: { level: "HSK1" } });
}

const showLevelPicker = ref(false);
const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Manually choose an HSK level, persist it, and navigate to reading.
 * @param level - HSK level between 1 and 6.
 */
function pickLevel(level: number) {
  userStore.setHskLevel(level);
  router.replace({ path: "/reading", query: { level: `HSK${level}` } });
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Quiz phase -->
      <template v-if="phase === 'quiz'">
        <div class="mb-6 text-center">
          <h1 class="text-2xl font-semibold text-foreground">
            Placement Quiz
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Question {{ current + 1 }} of {{ TOTAL }}
          </p>
        </div>

        <!-- Progress bar -->
        <div
          class="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          :aria-valuenow="Math.round(progress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Quiz progress"
        >
          <div
            class="h-full rounded-full bg-foreground/60 transition-all duration-300"
            :style="{ width: `${Math.round(progress * 100)}%` }"
          />
        </div>

        <Transition name="slide-fade" mode="out-in">
          <div :key="current" aria-live="polite">
            <!-- Question card -->
            <div class="mb-6 rounded-2xl border border-border bg-card p-6 text-center">
              <p class="text-2xl font-bold text-foreground sm:text-3xl">
                {{ questions[current].hanzi }}
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ questions[current].pinyin }}
              </p>
              <p class="mt-3 text-sm font-medium text-foreground">
                {{ questions[current].prompt }}
              </p>
            </div>

            <!-- Answer options -->
            <div class="flex flex-col gap-2">
              <Button
                v-for="(option, idx) in questions[current].options"
                :key="idx"
                variant="outline"
                class="w-full justify-start px-4 py-3 text-left text-sm"
                @click="selectAnswer(!!option.correct)"
              >
                {{ option.label }}
              </Button>
            </div>
          </div>
        </Transition>

        <!-- Beginner skip (first question only) -->
        <button
          v-if="current === 0"
          type="button"
          class="mt-6 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          @click="skipAsBeginner"
        >
          I'm a beginner — start at HSK 1
        </button>

        <!-- "I already know my level" picker -->
        <div class="mt-4 text-center">
          <button
            type="button"
            class="text-xs text-muted-foreground transition-colors hover:text-foreground"
            @click="showLevelPicker = !showLevelPicker"
          >
            I already know my level {{ showLevelPicker ? '▴' : '▾' }}
          </button>
          <div v-if="showLevelPicker" class="mt-2 flex justify-center gap-2">
            <Button
              v-for="lvl in HSK_LEVELS"
              :key="lvl"
              variant="outline"
              size="sm"
              class="px-3 text-xs"
              @click="pickLevel(lvl)"
            >
              HSK {{ lvl }}
            </Button>
          </div>
        </div>
      </template>

      <!-- Result phase -->
      <template v-else>
        <div class="text-center">
          <p class="text-5xl font-bold text-foreground">
            HSK {{ placedLevel }}
          </p>
          <p class="mt-3 text-base text-muted-foreground">
            You placed at HSK {{ placedLevel }}!
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            We'll show you reading content at this level.
          </p>
          <Button class="mt-8 w-full max-w-xs" size="lg" @click="startLearning">
            Start reading at HSK {{ placedLevel }}
          </Button>

          <!-- Adjust placement escape hatch -->
          <div class="mt-4">
            <button
              type="button"
              class="text-xs text-muted-foreground transition-colors hover:text-foreground"
              @click="showLevelPicker = !showLevelPicker"
            >
              Not right? Choose your level {{ showLevelPicker ? '▴' : '▾' }}
            </button>
            <div v-if="showLevelPicker" class="mt-2 flex justify-center gap-2">
              <Button
                v-for="lvl in HSK_LEVELS"
                :key="lvl"
                variant="outline"
                size="sm"
                class="px-3 text-xs"
                @click="pickLevel(lvl)"
              >
                HSK {{ lvl }}
              </Button>
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
  transition: opacity 180ms ease, transform 180ms ease;
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
