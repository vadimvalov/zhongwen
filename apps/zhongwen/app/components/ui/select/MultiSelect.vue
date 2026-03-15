<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";

import { cn } from "@/lib/utils";
import type { SelectOption as Option } from "~/lib/types";

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
  "update:modelValue": [value: string[]];
}>();

const open = ref(false);

const selectedLabels = computed(() => {
  if (!props.modelValue.length) {
    return props.placeholder;
  }
  return props.options
    .filter((opt) => props.modelValue.includes(opt.value))
    .map((opt) => opt.label)
    .join(", ");
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

function onClickOutside(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest("[data-multiselect]");
  if (!el) {
    open.value = false;
  }
}

watch(open, (val) => {
  if (val) {
    document.addEventListener("click", onClickOutside);
  } else {
    document.removeEventListener("click", onClickOutside);
  }
});

onUnmounted(() => document.removeEventListener("click", onClickOutside));
</script>

<template>
  <div data-multiselect class="relative" :class="props.class">
    <button
      type="button"
      :class="
        cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-colors outline-none dark:bg-input/30',
          !modelValue.length && 'text-muted-foreground',
        )
      "
      @click.stop="open = !open"
    >
      <span class="truncate text-left">{{ selectedLabels }}</span>
      <ChevronDown class="size-4 shrink-0 opacity-50" />
    </button>

    <div
      v-if="open"
      class="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover py-1 text-sm shadow-md"
    >
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-accent/10"
      >
        <Checkbox
          :model-value="modelValue.includes(opt.value)"
          @update:model-value="toggleOption(opt.value)"
        />
        <span class="text-foreground">{{ opt.label }}</span>
      </label>
    </div>
  </div>
</template>
