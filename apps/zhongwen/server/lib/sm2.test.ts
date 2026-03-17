import { describe, expect, it } from "vitest";

import { calculateNextReview } from "./sm2";

const NOW = new Date("2026-03-17T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number) {
  return new Date(NOW.getTime() + days * DAY_MS);
}

describe("calculateNextReview", () => {
  it("grade 0 — resets repetitions and interval to 1", () => {
    const card = { ease_factor: 2.5, interval_days: 10, repetitions: 5 };
    const result = calculateNextReview(card, 0, NOW);

    expect(result.repetitions).toBe(0);
    expect(result.interval_days).toBe(1);
    expect(result.next_review_at).toEqual(daysFromNow(1));
    expect(result.ease_factor).toBe(1.7);
  });

  it("grade 0 — clamps ease_factor to minimum 1.3", () => {
    const card = { ease_factor: 1.3, interval_days: 1, repetitions: 0 };
    const result = calculateNextReview(card, 0, NOW);

    expect(result.ease_factor).toBe(1.3);
    expect(result.repetitions).toBe(0);
    expect(result.interval_days).toBe(1);
  });

  it("grade 3 — first successful review sets interval to 1", () => {
    const card = { ease_factor: 2.5, interval_days: 1, repetitions: 0 };
    const result = calculateNextReview(card, 3, NOW);

    expect(result.repetitions).toBe(1);
    expect(result.interval_days).toBe(1);
    expect(result.next_review_at).toEqual(daysFromNow(1));
    expect(result.ease_factor).toBeCloseTo(2.36, 2);
  });

  it("grade 4 — first successful review keeps ease at 2.5", () => {
    const card = { ease_factor: 2.5, interval_days: 1, repetitions: 0 };
    const result = calculateNextReview(card, 4, NOW);

    expect(result.repetitions).toBe(1);
    expect(result.interval_days).toBe(1);
    expect(result.next_review_at).toEqual(daysFromNow(1));
    expect(result.ease_factor).toBeCloseTo(2.5, 2);
  });

  it("grade 4 — second review sets interval to 6", () => {
    const card = { ease_factor: 2.5, interval_days: 1, repetitions: 1 };
    const result = calculateNextReview(card, 4, NOW);

    expect(result.repetitions).toBe(2);
    expect(result.interval_days).toBe(6);
    expect(result.next_review_at).toEqual(daysFromNow(6));
  });

  it("grade 4 — later reviews multiply interval by ease_factor", () => {
    const card = { ease_factor: 2.5, interval_days: 6, repetitions: 2 };
    const result = calculateNextReview(card, 4, NOW);

    expect(result.repetitions).toBe(3);
    expect(result.interval_days).toBe(15); // round(6 * 2.5)
    expect(result.next_review_at).toEqual(daysFromNow(15));
  });

  it("grade 5 — increases ease factor", () => {
    const card = { ease_factor: 2.5, interval_days: 1, repetitions: 0 };
    const result = calculateNextReview(card, 5, NOW);

    expect(result.repetitions).toBe(1);
    expect(result.interval_days).toBe(1);
    expect(result.ease_factor).toBeCloseTo(2.6, 2);
  });

  it("grade 5 — later reviews produce longer intervals", () => {
    const card = { ease_factor: 2.6, interval_days: 15, repetitions: 3 };
    const result = calculateNextReview(card, 5, NOW);

    expect(result.repetitions).toBe(4);
    expect(result.interval_days).toBe(39); // round(15 * 2.6)
    expect(result.ease_factor).toBeCloseTo(2.7, 2);
    expect(result.next_review_at).toEqual(daysFromNow(39));
  });
});
