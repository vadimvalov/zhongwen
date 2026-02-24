<script setup lang="ts">
import { Card } from '@/shared/ui/Card'
import { Link } from '@/shared/ui/Link'
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen py-8 px-4">
    <h1 class="text-2xl font-semibold text-foreground mb-6">大家好</h1>
    <div class="grid grid-cols-2 gap-3 w-full max-w-sm">
      <Link to="/reading" class="block" :hover="true">
        <Card
          title="Reading"
          description="Short stories with translation"
          icon="lucide:book-open"
          color="#b5ead7"
          class="h-full"
        />
      </Link>
      <Card
        title="Vocabulary"
        description="Learn words by HSK level"
        icon="lucide:layers"
        color="#c7b8ea"
      />
      <Card
        title="Listening"
        description="Audio with transcription"
        icon="lucide:headphones"
        color="#e8d5b7"
      />
      <Card
        title="Writing"
        description="Practice characters"
        icon="lucide:pen-line"
        color="#f4c2c2"
      />
    </div>
  </div>
</template>
