<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { useHotkey } from "@tanstack/vue-hotkeys";
import { computed, ref, watch } from "vue";

import HanziStrokesOrder from "~/components/HanziStrokesOrder.vue";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";

const props = withDefaults(
  defineProps<{
    word: string | null;
    pinyin?: string | null;
    translation?: string | null;
    initialIndex?: number;
  }>(),
  {
    initialIndex: 0,
  },
);

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();

const currentIndex = ref(0);

const chars = computed(() => props.word?.split("").filter(Boolean) ?? []);
const currentChar = computed(() => chars.value[currentIndex.value] ?? null);
const hasMultipleChars = computed(() => chars.value.length > 1);
const isOpen = computed(() => Boolean(props.word));

watch(
  () => [props.word, props.initialIndex] as const,
  () => {
    currentIndex.value = clampIndex(props.initialIndex);
  },
  { immediate: true },
);

function clampIndex(index: number) {
  const lastIndex = Math.max(chars.value.length - 1, 0);
  return Math.min(Math.max(index, 0), lastIndex);
}

function closeDialog() {
  emit("update:open", false);
}

function showPrevious() {
  if (!hasMultipleChars.value) {
    return;
  }
  currentIndex.value = currentIndex.value === 0 ? chars.value.length - 1 : currentIndex.value - 1;
}

function showNext() {
  if (!hasMultipleChars.value) {
    return;
  }
  currentIndex.value = currentIndex.value === chars.value.length - 1 ? 0 : currentIndex.value + 1;
}

function handleOpenChange(open: boolean) {
  if (!open) {
    closeDialog();
  }
}

useHotkey("ArrowLeft", showPrevious, { enabled: isOpen });
useHotkey("ArrowRight", showNext, { enabled: isOpen });
</script>

<template>
  <Dialog :open="Boolean(word)" @update:open="handleOpenChange">
    <DialogContent
      :show-close-button="false"
      class="w-auto max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none outline-none focus:outline-none"
    >
      <DialogTitle class="sr-only">Stroke order for {{ currentChar }}</DialogTitle>
      <div v-if="currentChar" class="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-40 sm:h-10 sm:w-10"
          :disabled="!hasMultipleChars"
          aria-label="Previous stroke order"
          @click="showPrevious"
        >
          <Icon icon="lucide:chevron-left" class="h-5 w-5" />
        </button>

        <div class="space-y-3">
          <div class="min-h-16 text-center">
            <div class="text-2xl font-semibold text-foreground sm:text-3xl">
              {{ word }}
            </div>
            <div
              v-if="pinyin || translation"
              class="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm sm:text-base"
            >
              <span v-if="pinyin" class="font-medium text-muted-foreground">
                {{ pinyin }}
              </span>
              <span v-if="translation" class="text-foreground">
                {{ translation }}
              </span>
            </div>
          </div>

          <HanziStrokesOrder :hanzi="currentChar" class="h-48 w-48 rounded-2xl sm:h-56 sm:w-56" />
          <div
            v-if="hasMultipleChars"
            class="flex items-center justify-center gap-1 text-xs text-muted-foreground"
          >
            <span>{{ currentIndex + 1 }} / {{ chars.length }}</span>
          </div>
        </div>

        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-40 sm:h-10 sm:w-10"
          :disabled="!hasMultipleChars"
          aria-label="Next stroke order"
          @click="showNext"
        >
          <Icon icon="lucide:chevron-right" class="h-5 w-5" />
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
