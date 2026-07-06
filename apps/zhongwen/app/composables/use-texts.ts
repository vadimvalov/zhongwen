import type { TextData } from "~/lib/types";

export function useTextModules() {
  return import.meta.glob("../assets/texts/*.json", {
    eager: true,
    import: "default",
  }) as Record<string, TextData>;
}
