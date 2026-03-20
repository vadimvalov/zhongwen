<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { pinyin } from "pinyin-pro";
import { computed, ref } from "vue";

import { Button } from "~/components/ui/button";
import { speakWithElevenLabs, useHasElevenLabs } from "~/composables/useElevenLabs";

type Direction = "to-chinese" | "from-chinese";
type OtherLang = "ru" | "kk" | "en";

const MAX_CHARS = 500;

const direction = ref<Direction>("to-chinese");
const otherLang = ref<OtherLang>("en");
const inputText = ref("");
const outputText = ref("");
const isLoading = ref(false);
const isBlocked = ref(false);
const error = ref<string | null>(null);
const isSpeaking = ref(false);

const hasElevenLabs = useHasElevenLabs();

const langLabels: Record<OtherLang, string> = { ru: "RU", kk: "KZ", en: "EN" };
const otherLangs: OtherLang[] = ["en", "ru", "kk"];

const sourceLang = computed(() => (direction.value === "to-chinese" ? otherLang.value : "zh-CN"));
const targetLang = computed(() => (direction.value === "to-chinese" ? "zh-CN" : otherLang.value));

const chineseChars = computed(() => {
  if (!outputText.value || direction.value !== "to-chinese") return [];
  const pinyinArr = pinyin(outputText.value, { toneType: "symbol", type: "array" });
  return [...outputText.value].map((char, i) => ({ char, py: pinyinArr[i] ?? "" }));
});

async function translate() {
  const text = inputText.value.trim();
  if (!text || isLoading.value) return;
  outputText.value = "";
  error.value = null;
  isBlocked.value = false;
  isLoading.value = true;
  try {
    const res = await $fetch<{ translation: string }>("/api/translate", {
      method: "POST",
      body: { text, sourceLang: sourceLang.value, targetLang: targetLang.value },
    });
    outputText.value = res.translation;
  } catch (err: unknown) {
    const e = err as { statusCode?: number; statusMessage?: string };
    if (e?.statusCode === 429) {
      isBlocked.value = true;
    } else {
      error.value = e?.statusMessage ?? "Translation failed";
    }
  } finally {
    isLoading.value = false;
  }
}

async function speak() {
  if (!outputText.value || !hasElevenLabs || isSpeaking.value) return;
  isSpeaking.value = true;
  try {
    await speakWithElevenLabs(outputText.value);
  } finally {
    isSpeaking.value = false;
  }
}

function setDirection(d: Direction) {
  direction.value = d;
  inputText.value = "";
  outputText.value = "";
  error.value = null;
  isBlocked.value = false;
}
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <h2 class="text-xl font-semibold text-foreground">Translator</h2>

    <!-- Direction toggle -->
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
        :class="
          direction === 'to-chinese'
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:bg-muted/70'
        "
        @click="setDirection('to-chinese')"
      >
        → 中文
      </button>
      <button
        type="button"
        class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
        :class="
          direction === 'from-chinese'
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:bg-muted/70'
        "
        @click="setDirection('from-chinese')"
      >
        中文 →
      </button>
    </div>

    <!-- Language chips -->
    <div class="flex gap-2">
      <button
        v-for="lang in otherLangs"
        :key="lang"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="
          otherLang === lang
            ? 'border-foreground bg-foreground text-background'
            : 'border-border bg-transparent text-muted-foreground hover:border-foreground/50'
        "
        @click="otherLang = lang"
      >
        {{ langLabels[lang] }}
      </button>
    </div>

    <!-- Input -->
    <div class="relative">
      <textarea
        v-model="inputText"
        :maxlength="MAX_CHARS"
        rows="4"
        :placeholder="direction === 'to-chinese' ? 'Enter text to translate...' : 'Enter Chinese text...'"
        class="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <span class="absolute right-3 bottom-2 text-xs text-muted-foreground">
        {{ inputText.length }}/{{ MAX_CHARS }}
      </span>
    </div>

    <!-- Translate button -->
    <Button
      :disabled="!inputText.trim() || isLoading"
      class="w-full"
      @click="translate"
    >
      <Icon v-if="isLoading" icon="mdi:loading" class="mr-2 h-4 w-4 animate-spin" />
      {{ isLoading ? "Translating..." : "Translate" }}
    </Button>

    <!-- Blocked message -->
    <p v-if="isBlocked" class="text-sm text-red-500">
      Your IP has been temporarily blocked due to too many requests.
    </p>

    <!-- Error message -->
    <p v-else-if="error" class="text-sm text-red-500">
      {{ error }}
    </p>

    <!-- Output: Chinese with pinyin -->
    <div
      v-if="outputText && direction === 'to-chinese'"
      class="rounded-xl border border-border bg-card p-4"
    >
      <div class="flex flex-wrap gap-x-1 gap-y-3">
        <ruby
          v-for="(item, i) in chineseChars"
          :key="i"
          class="text-center text-2xl font-medium text-foreground"
        >
          {{ item.char }}
          <rt class="text-[10px] text-muted-foreground">{{ item.py }}</rt>
        </ruby>
      </div>
      <div v-if="hasElevenLabs" class="mt-3 flex justify-end">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-foreground transition-colors hover:bg-muted/70 disabled:opacity-40"
          :disabled="isSpeaking"
          aria-label="Play pronunciation"
          @click="speak"
        >
          <Icon v-if="isSpeaking" icon="mdi:loading" class="h-4 w-4 animate-spin" />
          <Icon v-else icon="lucide:volume-2" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Output: plain text -->
    <div
      v-else-if="outputText && direction === 'from-chinese'"
      class="rounded-xl border border-border bg-card p-4"
    >
      <p class="text-sm text-foreground">{{ outputText }}</p>
    </div>
  </div>
</template>
