<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";

import { cn } from "~/utils/cn";
import type { SelectOption as Option } from "~/utils/types";

const props = withDefaults(
  defineProps<{
    options: Option[];
    modelValue: string[];
    placeholder?: string;
    class?: HTMLAttributes["class"];
  }>(),
  {
    placeholder: "Select...",
    class: undefined,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
}>();

const open = ref(false);

const selectedLabels = computed(() => {
  if (!props.modelValue.length) {
    return props.placeholder;
  }
  const labels = props.options
    .filter((opt) => props.modelValue.includes(opt.value))
    .map((opt) => opt.label);
  return labels.join(", ");
});

function toggleOption(value: string) {
  const set = new Set(props.modelValue);
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  emit("update:modelValue", Array.from(set));
}
</script>

<template>
  <div class="relative inline-block" :class="props.class">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm hover:border-accent"
      @click="open = !open"
    >
      <span class="truncate text-left">{{ selectedLabels }}</span>
      <span class="text-xs text-muted-foreground" aria-hidden="true">
        {{ open ? "▲" : "▼" }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute z-10 mt-1 w-full rounded-md border border-border bg-card py-1 text-sm shadow-lg"
    >
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-accent/10"
      >
        <input
          type="checkbox"
          class="h-3.5 w-3.5 rounded border-border bg-background text-accent focus-visible:outline-none"
          :checked="modelValue.includes(opt.value)"
          @change="toggleOption(opt.value)"
        />
        <span class="text-foreground">{{ opt.label }}</span>
      </label>
    </div>
  </div>
</template>
