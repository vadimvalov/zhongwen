export type Word = {
  hanzi: string;
  pinyin: string;
  translation: string;
};

export type TextWord = Word & {
  hsk: number;
  type?: "punct";
};

export type WordMode = "speak" | "stroke";

export type TextData = {
  title: string;
  description: string;
  level: string;
  text: {
    words: TextWord[];
  };
};

export type Result = "correct" | "incorrect";

export type CardTone = "mint" | "lavender" | "sand" | "rose" | "seafoam";

export type MainCard = {
  title: string;
  description: string;
  to: string | null;
  icon: string;
  tone: CardTone;
};

export type Theme = "light" | "dark";

export type TextMeta = {
  title: string;
  description: string;
  level: string;
};

export type ReadingItem = {
  id: string;
  title: string;
  description: string;
  level: string;
  icon: string;
  tone: CardTone;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type CardIconSet = "reading" | "vocabulary" | "main";

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  hskLevel: number;
  inviteCode: string;
  questionCount: number;
  timeLimitSec: number;
  startsAt: string;
  endsAt: string;
  participantCount: number;
  status: "active" | "upcoming" | "past";
  bestScore: number | null;
  rank: number | null;
  rankTotal: number | null;
};

export type ReviewCard = {
  hanzi: string;
  pinyin: string;
  translation: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type ReviewSessionState = "loading" | "reviewing" | "grading" | "complete";

export type ChallengeLeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  score: number;
  timeMs: number;
  finishedAt: string | null;
};

export type ChallengeDetail = {
  id: string;
  title: string;
  description: string | null;
  hskLevel: number;
  questionCount: number;
  timeLimitSec: number;
  startsAt: string;
  endsAt: string;
  inviteCode: string;
  participantCount: number;
  isParticipant: boolean;
  leaderboard: ChallengeLeaderboardEntry[];
  createdBy: string;
};

export type ChallengeResultAnswer = {
  questionIdx: number;
  hanzi: string;
  pinyin: string;
  selected: string;
  correctAnswer: string;
  correct: boolean;
};

export type ChallengeResults = {
  score: number;
  totalQuestions: number;
  timeMs: number;
  answers: ChallengeResultAnswer[];
};
