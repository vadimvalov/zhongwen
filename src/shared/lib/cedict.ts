import { ref, computed } from 'vue'
import type { CedictEntry } from './types'

// Numbered pinyin → tone-marked pinyin
const TONES: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
}

function syllableToTone(s: string): string {
  s = s.replace('u:', 'v')
  const m = s.match(/^(.+?)(\d)$/)
  if (!m) return s.replace(/v/g, 'ü')

  const base = m[1]
  const tone = +m[2]
  if (tone < 1 || tone > 5) return base.replace(/v/g, 'ü')
  if (tone === 5) return base.replace(/v/g, 'ü')

  const lc = base.toLowerCase()

  // Rule 1: a or e always gets the mark
  for (let i = 0; i < lc.length; i++) {
    if (lc[i] === 'a' || lc[i] === 'e') {
      return base.slice(0, i) + TONES[lc[i]][tone - 1] + base.slice(i + 1)
    }
  }
  // Rule 2: ou → mark on o
  const ouIdx = lc.indexOf('ou')
  if (ouIdx !== -1) {
    return base.slice(0, ouIdx) + TONES['o'][tone - 1] + base.slice(ouIdx + 1)
  }
  // Rule 3: last vowel
  for (let i = lc.length - 1; i >= 0; i--) {
    const ch = lc[i]
    if (TONES[ch]) {
      return (
        base.slice(0, i) +
        TONES[ch][tone - 1] +
        base.slice(i + 1).replace(/v/g, 'ü')
      )
    }
  }
  return base.replace(/v/g, 'ü')
}

function convertPinyin(numbered: string): string {
  return numbered.split(/\s+/).map(syllableToTone).join(' ')
}

// CC-CEDICT line: Traditional Simplified [pinyin] /def1/def2/
const LINE_RE = /^\S+\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/\s*$/

function parseCedict(text: string): Map<string, CedictEntry[]> {
  const map = new Map<string, CedictEntry[]>()

  for (const line of text.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue
    const m = line.match(LINE_RE)
    if (!m) continue

    const simplified = m[1]
    const pinyin = convertPinyin(m[2])
    const translation = m[3].replace(/\//g, '; ')

    const entries = map.get(simplified)
    if (entries) {
      entries.push({ pinyin, translation })
    } else {
      map.set(simplified, [{ pinyin, translation }])
    }
  }

  return map
}

// Global singleton state
const dict = ref<Map<string, CedictEntry[]> | null>(null)
const isLoading = ref(false)
let loadPromise: Promise<void> | null = null

async function load() {
  if (dict.value || loadPromise) return loadPromise
  isLoading.value = true
  loadPromise = fetch('/cedict.txt')
    .then((r) => r.text())
    .then((text) => {
      dict.value = parseCedict(text)
      isLoading.value = false
    })
  return loadPromise
}

export function useCedict() {
  // Kick off loading (safe to call multiple times)
  load()

  function lookup(word: string): CedictEntry[] {
    return dict.value?.get(word) ?? []
  }

  return {
    lookup,
    loaded: computed(() => dict.value !== null),
    loading: isLoading,
  }
}
