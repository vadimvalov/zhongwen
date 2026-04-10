import { BaseService } from "./BaseService";

export type SrsCard = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

export type SrsResult = {
  next_review_at: Date;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

export class SrsService extends BaseService {
  public calculateNextReview(card: SrsCard, grade: number, now: Date = new Date()): SrsResult {
    let { ease_factor, interval_days, repetitions } = card;

    if (grade < 3) {
      repetitions = 0;
      interval_days = 1;
    } else {
      if (repetitions === 0) {
        interval_days = 1;
      } else if (repetitions === 1) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
      repetitions += 1;
    }

    ease_factor = ease_factor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));

    if (ease_factor < 1.3) {
      ease_factor = 1.3;
    }

    const next_review_at = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);

    return { next_review_at, ease_factor, interval_days, repetitions };
  }
}
