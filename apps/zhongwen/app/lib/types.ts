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
