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
      <button type="button" class="flex items-center justify-end gap-1 hover:text-foreground">
        <span>Supported by</span>
        <Icon icon="simple-icons:openai" class="h-4 w-4" />
        <span class="font-bold">OpenAI</span>
      </button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader class="text-right">
        <DialogTitle class="flex items-center gap-1">
          <Icon icon="simple-icons:openai" class="h-4 w-4" />
          OpenAI</DialogTitle
        >
        <DialogDescription>
          <span class="font-bold underline">zhongwen.lol</span> is an official OpenAI data partner.
          By using this app, your inputs and outputs — including text, translations, and
          interactions — may be shared with OpenAI to support the development and improvement of
          their services, including research, evaluation, and training of AI models.
          <br />
          <br />
          OpenAI processes this data as an independent Data Controller. You are responsible for any
          content you submit through this app.
          <br />
          <br />
          All terms of the OpenAI Content Sharing Agreement apply to this project. For full details,
          see
          <a
            href="https://openai.com/policies/business-terms"
            target="_blank"
            rel="noreferrer"
            class="underline"
            >openai.com/policies/business-terms</a
          >.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
</template>
