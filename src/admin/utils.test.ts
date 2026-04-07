import { describe, it, expect } from "vitest";
import {
  generateRandomHash,
  deepEqual,
  capitalizeWords,
  sortVotes,
} from "./utils";

describe("generateRandomHash", () => {
  it("generates a hash of default length 4", () => {
    const hash = generateRandomHash();
    expect(hash).toHaveLength(4);
  });

  it("generates a hash of specified length", () => {
    const hash = generateRandomHash(8);
    expect(hash).toHaveLength(8);
  });

  it("generates a hash of length 1", () => {
    const hash = generateRandomHash(1);
    expect(hash).toHaveLength(1);
  });

  it("only contains alphanumeric characters", () => {
    const hash = generateRandomHash(100);
    expect(hash).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("generates different hashes on subsequent calls", () => {
    const hashes = new Set(
      Array.from({ length: 20 }, () => generateRandomHash(8))
    );
    // With 8-char hashes from 62 chars, collisions in 20 tries are astronomically unlikely
    expect(hashes.size).toBeGreaterThan(1);
  });
});

describe("deepEqual", () => {
  it("returns true for identical primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("hello", "hello")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
  });

  it("returns true for deeply equal objects", () => {
    const a = { x: 1, y: { z: 2 } };
    const b = { x: 1, y: { z: 2 } };
    expect(deepEqual(a, b)).toBe(true);
  });

  it("returns false for objects with different values", () => {
    const a = { x: 1, y: { z: 2 } };
    const b = { x: 1, y: { z: 3 } };
    expect(deepEqual(a, b)).toBe(false);
  });

  it("returns false for objects with different keys", () => {
    const a = { x: 1 };
    const b = { x: 1, y: 2 };
    expect(deepEqual(a, b)).toBe(false);
  });

  it("returns true for deeply equal arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("returns false for arrays with different lengths", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("handles nested arrays and objects", () => {
    const a = { items: [{ id: 1 }, { id: 2 }] };
    const b = { items: [{ id: 1 }, { id: 2 }] };
    expect(deepEqual(a, b)).toBe(true);
  });

  it("returns false when comparing object to null", () => {
    expect(deepEqual({ x: 1 }, null)).toBe(false);
    expect(deepEqual(null, { x: 1 })).toBe(false);
  });

  it("returns false when comparing different types", () => {
    expect(deepEqual(1, "1")).toBe(false);
  });

  it("returns false when comparing array to object", () => {
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });
});

describe("capitalizeWords", () => {
  it("capitalizes a single word", () => {
    expect(capitalizeWords("hello")).toBe("Hello");
  });

  it("capitalizes multiple words", () => {
    expect(capitalizeWords("hello world")).toBe("Hello World");
  });

  it("handles already capitalized input", () => {
    expect(capitalizeWords("Hello World")).toBe("Hello World");
  });

  it("capitalizes after hyphens", () => {
    expect(capitalizeWords("hans-peter")).toBe("Hans-Peter");
  });

  it("removes non-alphabetic characters except hyphens", () => {
    expect(capitalizeWords("hello123world")).toBe("Helloworld");
  });

  it("capitalizes German umlauts at word start", () => {
    expect(capitalizeWords("über")).toBe("Über");
    expect(capitalizeWords("ärger")).toBe("Ärger");
    expect(capitalizeWords("öffnen")).toBe("Öffnen");
  });

  it("capitalizes words in mixed umlaut/ASCII text", () => {
    expect(capitalizeWords("große ferien")).toBe("Große Ferien");
    expect(capitalizeWords("über den ärmelkanal")).toBe("Über Den Ärmelkanal");
  });

  it("handles empty string", () => {
    expect(capitalizeWords("")).toBe("");
  });
});

describe("sortVotes", () => {
  const mockVotes = [
    {
      title: "Projektwoche 2024",
      description: "Frühling",
      startTime: { seconds: 1700000000 },
    },
    {
      title: "Herbstwahl",
      description: "Herbstprojekte",
      startTime: { seconds: 1710000000 },
    },
    {
      title: "Sommerfest",
      description: "Sommerprojekte",
      startTime: { seconds: 1720000000 },
    },
  ];

  it("filters by search query (title)", () => {
    const result = sortVotes(mockVotes, "Herbst", "1900-01-01", "2099-12-31");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Herbstwahl");
  });

  it("filters by search query (description)", () => {
    const result = sortVotes(mockVotes, "Frühling", "1900-01-01", "2099-12-31");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Projektwoche 2024");
  });

  it("filters by search query case-insensitively", () => {
    const result = sortVotes(mockVotes, "herbst", "1900-01-01", "2099-12-31");
    expect(result).toHaveLength(1);
  });

  it("filters by date range", () => {
    const result = sortVotes(mockVotes, "", "2024-03-01", "2024-07-30");
    expect(result).toHaveLength(2);
  });

  it("sorts by startTime descending", () => {
    const result = sortVotes(mockVotes, "", "1900-01-01", "2099-12-31");
    expect(result[0].startTime.seconds).toBeGreaterThan(
      result[1].startTime.seconds
    );
    expect(result[1].startTime.seconds).toBeGreaterThan(
      result[2].startTime.seconds
    );
  });

  it("returns empty array when no matches", () => {
    const result = sortVotes(
      mockVotes,
      "nonexistent",
      "1900-01-01",
      "2099-12-31"
    );
    expect(result).toHaveLength(0);
  });

  it("handles empty vote list", () => {
    const result = sortVotes([], "", "1900-01-01", "2099-12-31");
    expect(result).toHaveLength(0);
  });

  it("handles votes without description", () => {
    const votesNoDesc = [
      { title: "Test", startTime: { seconds: 1700000000 } },
    ];
    const result = sortVotes(votesNoDesc, "missing", "1900-01-01", "2099-12-31");
    expect(result).toHaveLength(0);
  });
});
