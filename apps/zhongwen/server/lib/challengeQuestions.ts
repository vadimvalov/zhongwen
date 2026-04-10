import hsk1 from "../../app/assets/dictionaries/hsk_1.json";
import hsk2 from "../../app/assets/dictionaries/hsk_2.json";
import hsk3 from "../../app/assets/dictionaries/hsk_3.json";
import hsk4 from "../../app/assets/dictionaries/hsk_4.json";
import hsk5 from "../../app/assets/dictionaries/hsk_5.json";
import hsk6 from "../../app/assets/dictionaries/hsk_6.json";
import { BaseService } from "./BaseService";
import { ValidateHSK } from "./decorators";

type DictEntry = { hanzi: string; pinyin: string; translation: string };
type QuestionOption = { label: string; correct: boolean };

export type ChallengeQuestion = {
  idx: number;
  hanzi: string;
  pinyin: string;
  prompt: string;
  options: QuestionOption[];
};

export class ChallengeService extends BaseService {
  private dictionaryCache = new Map<number, DictEntry[]>();

  private dictionaryModules: Record<number, DictEntry[]> = {
    1: hsk1 as DictEntry[],
    2: hsk2 as DictEntry[],
    3: hsk3 as DictEntry[],
    4: hsk4 as DictEntry[],
    5: hsk5 as DictEntry[],
    6: hsk6 as DictEntry[],
  };

  private loadDictionary(hskLevel: number): DictEntry[] {
    const cached = this.dictionaryCache.get(hskLevel);
    if (cached) {
      return cached;
    }

    const data = this.dictionaryModules[hskLevel];
    if (!data) {
      throw new Error(`HSK ${hskLevel} dictionary not found`);
    }
    this.dictionaryCache.set(hskLevel, data);
    return data;
  }

  private mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  private seededShuffle<T>(arr: T[], rand: () => number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  @ValidateHSK(1, 6)
  public generateChallengeQuestions(params: {
    challengeId: string;
    hskLevel: number;
    questionCount: number;
  }): ChallengeQuestion[] {
    const { challengeId, hskLevel, questionCount } = params;
    const dict = this.loadDictionary(hskLevel);

    if (dict.length < 4) {
      throw new Error(`HSK ${hskLevel} dictionary has fewer than 4 entries`);
    }

    const seed = this.hashString(challengeId);
    const rand = this.mulberry32(seed);

    const shuffled = this.seededShuffle(dict, rand);
    const selected = shuffled.slice(0, Math.min(questionCount, dict.length));

    return selected.map((word, idx) => {
      const distractorPool = dict.filter((w) => w.hanzi !== word.hanzi);
      const shuffledPool = this.seededShuffle(distractorPool, rand);
      const distractors = shuffledPool.slice(0, 3);

      const options: QuestionOption[] = [
        { label: word.translation, correct: true },
        ...distractors.map((d) => ({ label: d.translation, correct: false })),
      ];

      const shuffledOptions = this.seededShuffle(options, rand);

      return {
        idx,
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        prompt: "What does this mean?",
        options: shuffledOptions,
      };
    });
  }
}
