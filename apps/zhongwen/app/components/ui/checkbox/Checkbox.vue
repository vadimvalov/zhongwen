<script setup lang="ts">
import { reactiveOmit } from "@vueuse/core";
import { Check } from "lucide-vue-next";
import type { CheckboxRootEmits, CheckboxRootProps } from "reka-ui";
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from "reka-ui";
import type { HTMLAttributes } from "vue";

import { cn } from "@/lib/utils";

const props = defineProps<
  CheckboxRootProps & {
    class?: HTMLAttributes["class"];
    label?: string;
    modelValue?: boolean;
  }
>();
const emits = defineEmits<
  CheckboxRootEmits & {
    "update:modelValue": [value: boolean];
  }
>();

const delegatedProps = reactiveOmit(props, "class", "label", "modelValue");

// Support both v-model (boolean) and v-model:checked (reka-ui)
const isChecked = computed(() => props.modelValue ?? props.checked ?? false);

const forwarded = useForwardPropsEmits(delegatedProps, emits);

function onCheckedChange(val: boolean | "indeterminate") {
  emits("update:checked", val);
  emits("update:modelValue", val === true);
}
</script>

<template>
  <label
    v-if="label"
    :class="cn('inline-flex cursor-pointer items-center gap-2 text-muted-foreground select-none')"
  >
    <CheckboxRoot
      v-slot="slotProps"
      data-slot="checkbox"
      v-bind="forwarded"
      :checked="isChecked"
      :class="
        cn(
          'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground',
          props.class,
        )
      "
      @update:checked="onCheckedChange"
    >
      <CheckboxIndicator
        data-slot="checkbox-indicator"
        class="grid place-content-center text-current transition-none"
      >
        <slot v-bind="slotProps">
          <Check class="size-3.5" />
        </slot>
      </CheckboxIndicator>
    </CheckboxRoot>
    <span class="text-sm">{{ label }}</span>
  </label>
  <CheckboxRoot
    v-else
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="forwarded"
    :checked="isChecked"
    :class="
      cn(
        'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground',
        props.class,
      )
    "
    @update:checked="onCheckedChange"
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="grid place-content-center text-current transition-none"
    >
      <slot v-bind="slotProps">
        <Check class="size-3.5" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
