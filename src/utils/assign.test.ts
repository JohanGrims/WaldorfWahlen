import { describe, it, expect } from "vitest";
import {
  calculatePoints,
  calculateAllPoints,
  type Rule,
  type ChoiceForRules,
} from "./assign";

const makeChoice = (
  overrides: Partial<ChoiceForRules> = {}
): ChoiceForRules => ({
  id: "choice-1",
  name: "Max Mustermann",
  grade: 10,
  listIndex: 1,
  selected: ["opt-a", "opt-b", "opt-c"],
  ...overrides,
});

describe("calculatePoints", () => {
  it("returns default scores when no rules provided", () => {
    const choice = makeChoice();
    const result = calculatePoints(choice, []);
    expect(result).toEqual([1, 2, 4]);
  });

  it("applies wildcard rule (*) to all choices", () => {
    const choice = makeChoice();
    const rules: Rule[] = [{ apply: "*", scores: [10, 20, 30] }];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([10, 20, 30]);
  });

  it("matches grade condition", () => {
    const choice = makeChoice({ grade: 12 });
    const rules: Rule[] = [
      { apply: "*", scores: [1, 2, 4] },
      { apply: "grade=12", scores: [1, 5, 10] },
    ];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([1, 5, 10]);
  });

  it("does not match wrong grade", () => {
    const choice = makeChoice({ grade: 10 });
    const rules: Rule[] = [
      { apply: "*", scores: [1, 2, 4] },
      { apply: "grade=12", scores: [1, 5, 10] },
    ];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([1, 2, 4]);
  });

  it("matches listIndex condition", () => {
    const choice = makeChoice({ listIndex: 5 });
    const rules: Rule[] = [{ apply: "listIndex=5", scores: [3, 6, 9] }];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([3, 6, 9]);
  });

  it("does not match wrong listIndex", () => {
    const choice = makeChoice({ listIndex: 3 });
    const rules: Rule[] = [{ apply: "listIndex=5", scores: [3, 6, 9] }];
    const result = calculatePoints(choice, rules);
    // Falls back to default since wildcard was not set
    expect(result).toEqual([1, 2, 4]);
  });

  it("matches name condition (case-insensitive, substring)", () => {
    const choice = makeChoice({ name: "Max Mustermann" });
    const rules: Rule[] = [{ apply: "name=max", scores: [5, 10, 15] }];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([5, 10, 15]);
  });

  it("does not match wrong name", () => {
    const choice = makeChoice({ name: "Erika Müller" });
    const rules: Rule[] = [{ apply: "name=max", scores: [5, 10, 15] }];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([1, 2, 4]);
  });

  it("matches combined conditions (grade + name)", () => {
    const choice = makeChoice({ grade: 12, name: "Anna Schmidt" });
    const rules: Rule[] = [
      { apply: "grade=12,name=anna", scores: [2, 8, 16] },
    ];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([2, 8, 16]);
  });

  it("fails combined conditions if one doesn't match", () => {
    const choice = makeChoice({ grade: 10, name: "Anna Schmidt" });
    const rules: Rule[] = [
      { apply: "grade=12,name=anna", scores: [2, 8, 16] },
    ];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([1, 2, 4]); // Default
  });

  it("last matching rule wins", () => {
    const choice = makeChoice({ grade: 12 });
    const rules: Rule[] = [
      { apply: "*", scores: [1, 2, 4] },
      { apply: "grade=12", scores: [1, 5, 10] },
      { apply: "grade=12", scores: [100, 200, 300] },
    ];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([100, 200, 300]);
  });

  it("wildcard followed by specific rule applies the specific one", () => {
    const choice = makeChoice({ grade: 12 });
    const rules: Rule[] = [
      { apply: "*", scores: [10, 20, 30] },
      { apply: "grade=12", scores: [1, 5, 10] },
    ];
    const result = calculatePoints(choice, rules);
    expect(result).toEqual([1, 5, 10]);
  });

  it("accepts custom default scores", () => {
    const choice = makeChoice();
    const result = calculatePoints(choice, [], [100, 200, 300]);
    expect(result).toEqual([100, 200, 300]);
  });

  it("12th grader preference scenario (real-world)", () => {
    // The admin toggle for preferring 12th graders adds: grade=12 → [1, 5, 10]
    const grade10 = makeChoice({ id: "c1", grade: 10 });
    const grade12 = makeChoice({ id: "c2", grade: 12 });

    const rules: Rule[] = [
      { apply: "*", scores: [1, 2, 4] },
      { apply: "grade=12", scores: [1, 5, 10] },
    ];

    expect(calculatePoints(grade10, rules)).toEqual([1, 2, 4]);
    expect(calculatePoints(grade12, rules)).toEqual([1, 5, 10]);

    // 12th graders have much higher penalty for 2nd/3rd choice, so optimizer
    // will prefer giving them their 1st choice
  });
});

describe("calculateAllPoints", () => {
  it("calculates points for all choices", () => {
    const choices: ChoiceForRules[] = [
      makeChoice({ id: "c1", grade: 10 }),
      makeChoice({ id: "c2", grade: 12 }),
      makeChoice({ id: "c3", grade: 11 }),
    ];

    const rules: Rule[] = [
      { apply: "*", scores: [1, 2, 4] },
      { apply: "grade=12", scores: [1, 5, 10] },
    ];

    const result = calculateAllPoints(choices, rules);

    expect(result).toEqual({
      c1: [1, 2, 4],
      c2: [1, 5, 10],
      c3: [1, 2, 4],
    });
  });

  it("returns empty object for empty choices", () => {
    const result = calculateAllPoints([], [{ apply: "*", scores: [1, 2, 4] }]);
    expect(result).toEqual({});
  });

  it("applies multiple rules correctly across choices", () => {
    const choices: ChoiceForRules[] = [
      makeChoice({ id: "c1", grade: 10, name: "Anna" }),
      makeChoice({ id: "c2", grade: 12, name: "Ben" }),
      makeChoice({ id: "c3", grade: 12, name: "Anna" }),
    ];

    const rules: Rule[] = [
      { apply: "*", scores: [1, 2, 4] },
      { apply: "grade=12", scores: [1, 5, 10] },
      { apply: "grade=12;name=anna", scores: [1, 10, 20] },
    ];

    const result = calculateAllPoints(choices, rules);

    expect(result).toEqual({
      c1: [1, 2, 4],     // Grade 10, no special rule
      c2: [1, 5, 10],    // Grade 12, but name doesn't match Anna
      c3: [1, 10, 20],   // Grade 12 AND name=Anna
    });
  });
});
