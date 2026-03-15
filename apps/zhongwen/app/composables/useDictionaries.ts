import type { Word } from "~/utils/types";

export function useDictionaryModules(): Record<string, Word[]> {
  return import.meta.glob("../assets/dictionaries/*.json", {
    eager: true,
    import: "default",
  }) as Record<string, Word[]>;
}
