<script setup lang="ts">
const router = useRouter();

/**
 * Navigate back if there is history, otherwise fall back to the home page.
 * Prevents landing on transient pages like /placement after a redirect.
 */
function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.replace("/");
  }
}
</script>

<template>
  <Button
    type="button"
    class="shrink-0 px-3 py-1 text-xs sm:text-sm"
    aria-label="Go back"
    @click="goBack"
  >
    &larr;
  </Button>
</template>
