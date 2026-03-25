import { defineStore } from "pinia";
import { ref, watch } from "vue";

import type { Theme } from "~/lib/types";

const THEME_KEY = "zhongwen-theme";

function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY) as Theme | null;
    if (v === "light" || v === "dark") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

export const useUserStore = defineStore("user", () => {
  const theme = ref<Theme>(getStoredTheme());
  const readTextIds = ref<Set<string>>(new Set());
  const knownWords = ref<Set<string>>(new Set());

  function setTheme(value: Theme) {
    theme.value = value;
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      /* ignore */
    }
  }

  function toggleTheme() {
    setTheme(theme.value === "dark" ? "light" : "dark");
  }

  function isRead(textId: string) {
    return readTextIds.value.has(textId);
  }

  function isKnown(hanzi: string) {
    return knownWords.value.has(hanzi);
  }

  async function refreshReadTextIds() {
    try {
      const ids = await $fetch<string[]>("/api/reading/read-texts");
      readTextIds.value = new Set(ids);
    } catch (err) {
      // Ignore unauthorized; other errors can be logged in dev
      if (process.dev) {
        // eslint-disable-next-line no-console
        console.warn("[userStore] failed to refresh read texts", err);
      }
    }
  }

  async function refreshKnownWords() {
    try {
      const list = await $fetch<string[]>("/api/known-words");
      knownWords.value = new Set(list);
    } catch (err) {
      if (process.dev) {
        // eslint-disable-next-line no-console
        console.warn("[userStore] failed to refresh known words", err);
      }
    }
  }

  async function addKnownWord(hanzi: string) {
    if (knownWords.value.has(hanzi)) {
      return;
    }
    knownWords.value = new Set([...knownWords.value, hanzi]);
    try {
      await $fetch("/api/known-words", {
        method: "POST",
        body: { hanzi, review: true },
      });
    } catch (err) {
      if (process.dev) {
        // eslint-disable-next-line no-console
        console.warn("[userStore] failed to add known word", err);
      }
    }
  }

  async function removeKnownWord(hanzi: string) {
    const next = new Set(knownWords.value);
    next.delete(hanzi);
    knownWords.value = next;
    try {
      await $fetch("/api/known-words", {
        method: "DELETE",
        query: { hanzi },
      });
    } catch (err) {
      if (process.dev) {
        // eslint-disable-next-line no-console
        console.warn("[userStore] failed to remove known word", err);
      }
    }
  }

  async function markAsRead(textId: string) {
    if (readTextIds.value.has(textId)) {
      return;
    }
    readTextIds.value = new Set([...readTextIds.value, textId]);
    try {
      await $fetch("/api/reading/read-texts", {
        method: "POST",
        body: { textId, read: true },
      });
    } catch (err) {
      if (process.dev) {
        // eslint-disable-next-line no-console
        console.warn("[userStore] failed to mark as read", err);
      }
    }
  }

  async function unmarkAsRead(textId: string) {
    const next = new Set(readTextIds.value);
    next.delete(textId);
    readTextIds.value = next;
    try {
      await $fetch("/api/reading/read-texts", {
        method: "POST",
        body: { textId, read: false },
      });
    } catch (err) {
      if (process.dev) {
        // eslint-disable-next-line no-console
        console.warn("[userStore] failed to unmark as read", err);
      }
    }
  }

  async function toggleRead(textId: string) {
    if (readTextIds.value.has(textId)) {
      await unmarkAsRead(textId);
    } else {
      await markAsRead(textId);
    }
  }

  watch(
    theme,
    (v) => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", v === "dark");
        document.documentElement.setAttribute("data-theme", v);
      }
    },
    { immediate: true },
  );

  return {
    theme,
    setTheme,
    toggleTheme,
    readTextIds,
    knownWords,
    refreshReadTextIds,
    refreshKnownWords,
    isRead,
    isKnown,
    markAsRead,
    unmarkAsRead,
    toggleRead,
    addKnownWord,
    removeKnownWord,
  };
});
