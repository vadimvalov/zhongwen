import type { Subtitle } from './types'

const TIME_RE =
  /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/

function toMs(h: string, m: string, s: string, ms: string): number {
  return +h * 3_600_000 + +m * 60_000 + +s * 1_000 + +ms
}

export function parseSrt(raw: string): Subtitle[] {
  const blocks = raw.trim().replace(/\r\n/g, '\n').split(/\n\n+/)
  const result: Subtitle[] = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    const id = parseInt(lines[0], 10)
    if (isNaN(id)) continue

    const m = lines[1].match(TIME_RE)
    if (!m) continue

    result.push({
      id,
      startMs: toMs(m[1], m[2], m[3], m[4]),
      endMs: toMs(m[5], m[6], m[7], m[8]),
      text: lines.slice(2).join(' ').trim(),
    })
  }

  return result
}
