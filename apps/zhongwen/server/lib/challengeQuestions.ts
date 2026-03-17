import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type DictEntry = { hanzi: string; pinyin: string; translation: string };

type QuestionOption = { label: string; correct: boolean };

export type ChallengeQuestion = {
  idx: number;
  hanzi: string;
  pinyin: string;
  prompt: string;
  options: QuestionOption[];
};

const dictionaryCache = new Map<number, DictEntry[]>();

/**
 * Load an HSK dictionary file (cached after first read).
 */
function loadDictionary(hskLevel: number): DictEntry[] {
  const cached = dictionaryCache.get(hskLevel);
  if (cached) return cached;

  const filePath = resolve(
    process.cwd(),
    `app/assets/dictionaries/hsk_${hskLevel}.json`,
  );
  const data: DictEntry[] = JSON.parse(readFileSync(filePath, "utf-8"));
  dictionaryCache.set(hskLevel, data);
  return data;
}

/**
 * Mulberry32 PRNG — deterministic 32-bit generator.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string (challenge ID) to a numeric seed.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Fisher–Yates shuffle using a seeded PRNG.
 */
function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Generate deterministic MCQ questions for a challenge.
 * Same challengeId always produces the same questions.
 */
export function generateChallengeQuestions(params: {
  challengeId: string;
  hskLevel: number;
  questionCount: number;
}): ChallengeQuestion[] {
  const { challengeId, hskLevel, questionCount } = params;
  const dict = loadDictionary(hskLevel);

  if (dict.length < 4) {
    throw new Error(`HSK ${hskLevel} dictionary has fewer than 4 entries`);
  }

  const seed = hashString(challengeId);
  const rand = mulberry32(seed);

  const shuffled = seededShuffle(dict, rand);
  const selected = shuffled.slice(0, Math.min(questionCount, dict.length));

  return selected.map((word, idx) => {
    const distractorPool = dict.filter((w) => w.hanzi !== word.hanzi);
    const shuffledPool = seededShuffle(distractorPool, rand);
    const distractors = shuffledPool.slice(0, 3);

    const options: QuestionOption[] = [
      { label: word.translation, correct: true },
      ...distractors.map((d) => ({ label: d.translation, correct: false })),
    ];

    const shuffledOptions = seededShuffle(options, rand);

    return {
      idx,
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      prompt: "What does this mean?",
      options: shuffledOptions,
    };
  });
}
