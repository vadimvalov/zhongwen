<script setup lang="ts">
import { Icon } from "@iconify/vue";

import BackButton from "~/components/BackButton.vue";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { authClient, useAuth } from "~/composables/useAuth";

const router = useRouter();
const { user, isPending } = useAuth();

const form = reactive({
  title: "",
  description: "",
  hskLevel: 1,
  questionCount: 20,
  timeLimitSec: 15,
  startsAt: "",
  endsAt: "",
});

const submitting = ref(false);
const error = ref("");

const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const TIME_OPTIONS = [
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  { value: 20, label: "20 seconds" },
  { value: 30, label: "30 seconds" },
] as const;

const isValid = computed(() => {
  if (!form.title.trim()) return false;
  if (!form.startsAt || !form.endsAt) return false;
  const start = new Date(form.startsAt);
  const end = new Date(form.endsAt);
  if (start >= end) return false;
  if (end <= new Date()) return false;
  return true;
});

/**
 * Submit the form to create a new challenge.
 */
async function submit() {
  if (!isValid.value) return;
  submitting.value = true;
  error.value = "";

  try {
    const result = await $fetch("/api/challenges", {
      method: "POST",
      body: {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        hskLevel: form.hskLevel,
        questionCount: form.questionCount,
        timeLimitSec: form.timeLimitSec,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      },
    });
    router.push(`/challenges/${result.id}`);
  } catch (err: any) {
    error.value = err?.data?.statusMessage ?? "Failed to create challenge";
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  form.startsAt = toLocal(now);
  form.endsAt = toLocal(later);
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Auth gate -->
      <div v-if="!isPending && !user" class="py-20 text-center">
        <Icon icon="lucide:lock" class="mx-auto mb-4 text-4xl text-muted-foreground" />
        <p class="mb-1 text-lg font-semibold text-foreground">Sign in required</p>
        <p class="mb-6 text-sm text-muted-foreground">Sign in with Google to create a challenge.</p>
        <Button @click="authClient.signIn.social({ provider: 'google', callbackURL: '/challenges/create' })">
          <Icon icon="logos:google-icon" class="mr-2 text-lg" />
          Sign in with Google
        </Button>
      </div>

      <div v-else-if="user">
      <!-- Header -->
      <div class="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 class="text-2xl font-semibold text-foreground">Create challenge</h1>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <!-- Title -->
        <div>
          <label class="mb-1 block text-sm font-medium text-foreground">Title</label>
          <Input v-model="form.title" placeholder="e.g. HSK 3 Weekly Quiz" />
        </div>

        <!-- Description -->
        <div>
          <label class="mb-1 block text-sm font-medium text-foreground">Description <span class="text-muted-foreground">(optional)</span></label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="What's this challenge about?"
            class="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        <!-- HSK Level -->
        <div>
          <label class="mb-1 block text-sm font-medium text-foreground">HSK Level</label>
          <div class="flex gap-2">
            <Button
              v-for="lvl in HSK_LEVELS"
              :key="lvl"
              type="button"
              size="sm"
              :variant="form.hskLevel === lvl ? 'default' : 'outline'"
              class="px-3 text-xs"
              @click="form.hskLevel = lvl"
            >
              HSK {{ lvl }}
            </Button>
          </div>
        </div>

        <!-- Question count -->
        <div>
          <label class="mb-1 block text-sm font-medium text-foreground">Number of questions</label>
          <Input
            v-model.number="form.questionCount"
            type="number"
            min="5"
            max="50"
          />
        </div>

        <!-- Time per question -->
        <div>
          <label class="mb-1 block text-sm font-medium text-foreground">Time per question</label>
          <div class="flex gap-2">
            <Button
              v-for="opt in TIME_OPTIONS"
              :key="opt.value"
              type="button"
              size="sm"
              :variant="form.timeLimitSec === opt.value ? 'default' : 'outline'"
              class="px-3 text-xs"
              @click="form.timeLimitSec = opt.value"
            >
              {{ opt.label }}
            </Button>
          </div>
        </div>

        <!-- Start date -->
        <div>
          <label class="mb-1 block text-sm font-medium text-foreground">Start date</label>
          <input
            v-model="form.startsAt"
            type="datetime-local"
            class="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        <!-- End date -->
        <div>
          <label class="mb-1 block text-sm font-medium text-foreground">End date</label>
          <input
            v-model="form.endsAt"
            type="datetime-local"
            class="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

        <Button type="submit" class="w-full" size="lg" :disabled="!isValid || submitting">
          {{ submitting ? "Creating…" : "Create challenge" }}
        </Button>
      </form>
      </div>
    </div>
  </div>
</template>
