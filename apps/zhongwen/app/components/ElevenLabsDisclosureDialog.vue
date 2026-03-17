<script setup lang="ts">
import { Icon } from "@iconify/vue";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <button
        type="button"
        class="mt-0.5 flex items-center justify-end gap-1 hover:text-foreground"
      >
        <span>Powered by</span>
        <Icon icon="simple-icons:elevenlabs" class="h-3 w-3" />
        <span class="font-bold">ElevenLabs</span>
      </button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader class="text-right">
        <DialogTitle class="flex items-center gap-1">
          <Icon icon="simple-icons:elevenlabs" class="h-4 w-4" />
          ElevenLabs</DialogTitle
        >
        <DialogDescription>
          <span class="font-bold underline">zhongwen.lol</span> uses ElevenLabs
          for AI-powered audio generation. All spoken content in this app —
          including vocabulary pronunciations and story narrations — is
          generated using ElevenLabs&apos; text-to-speech technology.
          <br />
          <br />
          While we strive for accuracy, AI-generated audio may occasionally
          mispronounce words, misplace tones, or produce other inaccuracies,
          especially with less common Chinese characters and proper nouns. We
          recommend using this app as a supplementary learning tool alongside
          other verified resources.
          <br />
          <br />
          If you notice any audio errors or inaccuracies, we&apos;d appreciate
          your feedback. Please reach out via Telegram at
          <a
            href="https://t.me/valovvadim"
            target="_blank"
            rel="noreferrer"
            class="underline"
            >t.me/valovvadim</a
          >
          — your reports help us improve the quality of the content.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
</template>
