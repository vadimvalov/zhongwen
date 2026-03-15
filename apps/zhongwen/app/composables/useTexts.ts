import type { TextData } from "~/utils/types";

export function useTextModules(): Record<string, TextData> {
  return import.meta.glob("../assets/texts/*.json", {
    eager: true,
    import: "default",
  }) as Record<string, TextData>;
}
