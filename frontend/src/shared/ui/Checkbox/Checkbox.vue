<script setup lang="ts">
import type { HTMLAttributes, InputHTMLAttributes } from 'vue'
import { cn } from '@/shared/ui/utils'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    class?: HTMLAttributes['class']
    inputClass?: InputHTMLAttributes['class']
  }>(),
  {
    label: undefined,
    class: undefined,
    inputClass: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <label
    :class="
      cn(
        'inline-flex items-center gap-2 text-muted-foreground cursor-pointer select-none',
        props.class,
      )
    "
  >
    <input
      type="checkbox"
      :checked="modelValue"
      class="h-3 w-3 rounded border-border bg-background focus-visible:outline-none"
      :style="{ accentColor: 'var(--color-accent)' }"
      :class="inputClass"
      @change="onChange"
    />
    <span v-if="label">{{ label }}</span>
  </label>
</template>
