<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { watchDebounced } from "@vueuse/core";
import { ref, computed } from "vue";

import { speakWithElevenLabs } from "~/composables/useElevenLabs";

const LANGS = [
  { code: "en", label: "English", bcp47: "en-US" },
  { code: "ru", label: "Russian", bcp47: "ru-RU" },
  { code: "kk", label: "Kazakh", bcp47: "kk-KZ" },
  { code: "zh-CN", label: "中文", bcp47: "zh-CN" },
] as const;

type LangCode = (typeof LANGS)[number]["code"];

const sourceLang = ref<LangCode>("en");
const targetLang = ref<LangCode>("ru");
const sourceText = ref("");
const translatedText = ref("");
const isLoading = ref(false);
const isError = ref(false);

const MAX_CHARS = 10000;

const sourceLangObj = computed(() => LANGS.find((l) => l.code === sourceLang.value)!);
const targetLangObj = computed(() => LANGS.find((l) => l.code === targetLang.value)!);

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function translate() {
  const text = sourceText.value.trim();
  if (!text) {
    translatedText.value = "";
    isError.value = false;
    return;
  }

  isLoading.value = true;
  isError.value = false;

  try {
    const { translation } = await $fetch<{ translation: string }>("/api/translate", {
      method: "POST",
      body: { text, source: sourceLang.value, target: targetLang.value },
    });
    translatedText.value = translation ? decodeHtmlEntities(translation) : "";
  } catch {
    isError.value = true;
    translatedText.value = "";
  } finally {
    isLoading.value = false;
  }
}

watchDebounced(sourceText, translate, { debounce: 600 });

function swapLanguages() {
  const prevSource = sourceLang.value;
  const prevSourceText = sourceText.value;
  sourceLang.value = targetLang.value;
  targetLang.value = prevSource;
  sourceText.value = translatedText.value;
  translatedText.value = prevSourceText;
}

function selectSourceLang(code: LangCode) {
  if (code === targetLang.value) {
    swapLanguages();
    return;
  }
  sourceLang.value = code;
  translatedText.value = "";
  translate();
}

function selectTargetLang(code: LangCode) {
  if (code === sourceLang.value) {
    swapLanguages();
    return;
  }
  targetLang.value = code;
  translatedText.value = "";
  translate();
}

function clearSource() {
  sourceText.value = "";
  translatedText.value = "";
  isError.value = false;
}

async function copyTranslation() {
  if (!translatedText.value) return;
  await navigator.clipboard.writeText(translatedText.value);
}

function speakBrowser(text: string, bcp47: string) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = bcp47;
  window.speechSynthesis.speak(utterance);
}

function speakSource() {
  const text = sourceText.value.trim();
  if (!text) return;
  if (sourceLangObj.value.code === "zh-CN") {
    speakWithElevenLabs(text);
  } else {
    speakBrowser(text, sourceLangObj.value.bcp47);
  }
}

function speakTarget() {
  const text = translatedText.value.trim();
  if (!text) return;
  if (targetLangObj.value.code === "zh-CN") {
    speakWithElevenLabs(text);
  } else {
    speakBrowser(text, targetLangObj.value.bcp47);
  }
}

// Speech recognition
const isListening = ref(false);

function startMic() {
  const SpeechRecognition =
    (window as unknown as { SpeechRecognition?: SpeechRecognitionStatic })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionStatic })
      .webkitSpeechRecognition;

  if (!SpeechRecognition) return;

  const recognition = new SpeechRecognition();
  recognition.lang = sourceLangObj.value.bcp47;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  isListening.value = true;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0]?.[0]?.transcript ?? "";
    if (transcript) {
      sourceText.value = transcript;
    }
  };

  recognition.onend = () => {
    isListening.value = false;
  };

  recognition.onerror = () => {
    isListening.value = false;
  };

  recognition.start();
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- Language selector row -->
    <div class="relative flex items-stretch border-b border-border">
      <!-- Source language tabs -->
      <div class="flex flex-1 items-center">
        <button
          v-for="lang in LANGS"
          :key="lang.code"
          type="button"
          class="px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors sm:px-5 sm:text-sm"
          :class="
            sourceLang === lang.code
              ? 'border-b-2 border-foreground text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="selectSourceLang(lang.code as LangCode)"
        >
          {{ lang.label }}
        </button>
      </div>

      <!-- Swap button -->
      <button
        type="button"
        class="absolute top-1/2 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors hover:bg-muted"
        aria-label="Swap languages"
        @click="swapLanguages"
      >
        <Icon icon="lucide:arrow-left-right" class="text-base text-foreground" />
      </button>

      <!-- Target language tabs -->
      <div class="flex flex-1 items-center justify-end">
        <button
          v-for="lang in LANGS"
          :key="lang.code"
          type="button"
          class="px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors sm:px-5 sm:text-sm"
          :class="
            targetLang === lang.code
              ? 'border-b-2 border-foreground text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="selectTargetLang(lang.code as LangCode)"
        >
          {{ lang.label }}
        </button>
      </div>
    </div>

    <!-- Translation panels -->
    <div class="flex flex-1 flex-col sm:flex-row">
      <!-- Source panel -->
      <div class="relative flex flex-1 flex-col border-b border-border sm:border-r sm:border-b-0">
        <div class="relative flex-1">
          <textarea
            v-model="sourceText"
            :maxlength="MAX_CHARS"
            placeholder="Enter text…"
            class="h-full min-h-[200px] w-full resize-none bg-transparent p-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:min-h-0"
          />
          <button
            v-if="sourceText"
            type="button"
            class="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear"
            @click="clearSource"
          >
            <Icon icon="lucide:x" class="text-sm" />
          </button>
        </div>

        <!-- Source toolbar -->
        <div class="flex items-center gap-2 border-t border-border px-3 py-2">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Speak source"
            :disabled="!sourceText"
            @click="speakSource"
          >
            <Icon icon="lucide:volume-2" class="text-base" />
          </button>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
            :class="isListening ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'"
            aria-label="Mic input"
            @click="startMic"
          >
            <Icon icon="lucide:mic" class="text-base" />
          </button>
          <span class="ml-auto text-xs text-muted-foreground">
            {{ sourceText.length }} / {{ MAX_CHARS }}
          </span>
        </div>
      </div>

      <!-- Target panel -->
      <div class="relative flex flex-1 flex-col">
        <div class="relative flex-1">
          <div class="min-h-[200px] p-4 text-base sm:min-h-0">
            <span v-if="isLoading" class="text-muted-foreground">Translating…</span>
            <span v-else-if="isError" class="text-muted-foreground">Translation error.</span>
            <span v-else class="text-foreground">{{ translatedText }}</span>
          </div>
        </div>

        <!-- Target toolbar -->
        <div class="flex items-center gap-2 border-t border-border px-3 py-2">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Speak translation"
            :disabled="!translatedText"
            @click="speakTarget"
          >
            <Icon icon="lucide:volume-2" class="text-base" />
          </button>
          <button
            type="button"
            class="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Copy translation"
            :disabled="!translatedText"
            @click="copyTranslation"
          >
            <Icon icon="lucide:copy" class="text-base" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
