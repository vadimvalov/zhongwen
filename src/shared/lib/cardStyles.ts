import type { CardIconSet } from '@/shared/lib/types'

export const CARD_COLORS = [
  '#b5ead7',
  '#c7b8ea',
  '#e8d5b7',
  '#f4c2c2',
  '#d7ebe9',
] as const

export const CARD_ICON_SETS = {
  reading: [
    'lucide:book-open',
    'lucide:bookmark',
    'lucide:file-text',
    'lucide:quote',
    'lucide:scroll-text',
  ],
  vocabulary: [
    'lucide:layers',
    'lucide:book-marked',
    'lucide:library',
    'lucide:scroll-text',
    'lucide:file-text',
  ],
  main: [
    'lucide:book-open',
    'lucide:layers',
    'lucide:headphones',
    'lucide:play-circle',
  ],
} as const

export function getCardStyle(
  index: number,
  iconSet: CardIconSet = 'reading',
): { icon: string; color: string } {
  const icons = CARD_ICON_SETS[iconSet]
  return {
    icon: icons[index % icons.length] ?? icons[0],
    color: CARD_COLORS[index % CARD_COLORS.length] ?? CARD_COLORS[0],
  }
}
