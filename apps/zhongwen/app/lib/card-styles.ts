import type { CardIconSet, CardTone } from "~/lib/types";

export const CARD_TONES = [
  "mint",
  "lavender",
  "sand",
  "rose",
  "seafoam",
] as const satisfies readonly CardTone[];

export const CARD_ICON_SETS = {
  reading: [
    "lucide:book-open",
    "lucide:bookmark",
    "lucide:file-text",
    "lucide:quote",
    "lucide:scroll-text",
  ],
  vocabulary: [
    "lucide:layers",
    "lucide:book-marked",
    "lucide:library",
    "lucide:scroll-text",
    "lucide:file-text",
  ],
  main: ["lucide:book-open", "lucide:layers", "lucide:headphones", "lucide:trophy"],
} as const;

export function getCardStyle(
  index: number,
  iconSet: CardIconSet = "reading",
): { icon: string; tone: CardTone } {
  const icons = CARD_ICON_SETS[iconSet];
  return {
    icon: icons[index % icons.length] ?? icons[0],
    tone: CARD_TONES[index % CARD_TONES.length] ?? CARD_TONES[0],
  };
}
