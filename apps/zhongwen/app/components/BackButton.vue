<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineProps<{
  to: RouteLocationRaw;
}>();
</script>

<template>
  <Button as-child class="shrink-0 px-3 py-1 text-xs sm:text-sm" aria-label="Go back">
    <NuxtLink :to="to">&larr;</NuxtLink>
  </Button>
</template>
