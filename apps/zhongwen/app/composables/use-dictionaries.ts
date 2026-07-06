import type { Word } from "~/lib/types";

export function useDictionaryModules() {
  return import.meta.glob("../assets/dictionaries/*.json", {
    eager: true,
    import: "default",
  }) as Record<string, Word[]>;
}
