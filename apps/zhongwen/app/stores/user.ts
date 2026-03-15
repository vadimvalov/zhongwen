import { defineStore } from "pinia";
import { ref, watch } from "vue";

import type { Theme } from "~/utils/types";

const THEME_KEY = "zhongwen-theme";
const READ_TEXTS_KEY = "zhongwen-read-texts";

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

function getStoredReadTextIds() {
  try {
    const raw = localStorage.getItem(READ_TEXTS_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
      return new Set<string>(arr);
    }
  } catch {
    /* ignore */
  }
  return new Set<string>();
}

function saveReadTextIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_TEXTS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export const useUserStore = defineStore("user", () => {
  const theme = ref<Theme>(getStoredTheme());
  const readTextIds = ref<Set<string>>(getStoredReadTextIds());

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

  function markAsRead(textId: string) {
    readTextIds.value = new Set([...readTextIds.value, textId]);
    saveReadTextIds(readTextIds.value);
  }

  function unmarkAsRead(textId: string) {
    const next = new Set(readTextIds.value);
    next.delete(textId);
    readTextIds.value = next;
    saveReadTextIds(readTextIds.value);
  }

  function toggleRead(textId: string) {
    if (readTextIds.value.has(textId)) {
      unmarkAsRead(textId);
    } else {
      markAsRead(textId);
    }
  }

  watch(
    theme,
    (v) => {
      if (typeof document !== "undefined") {
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
    isRead,
    markAsRead,
    unmarkAsRead,
    toggleRead,
  };
});
