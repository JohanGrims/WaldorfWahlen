import { describe, it, expect } from "vitest";
import {
  formatBerlinTimestamp,
  formatBerlinDate,
  parseBerlinDateTime,
  toBerlinDatetimeLocal,
  tryParseToBerlinDatetimeLocal,
} from "./date";

describe("formatBerlinTimestamp", () => {
  // 2024-01-15 12:00:00 UTC = 2024-01-15 13:00:00 CET (Berlin, winter)
  const winterTimestamp = 1705320000; // 2024-01-15 12:00:00 UTC

  // 2024-07-15 12:00:00 UTC = 2024-07-15 14:00:00 CEST (Berlin, summer)
  const summerTimestamp = 1721044800; // 2024-07-15 12:00:00 UTC

  it("formats a winter date in dd.MM.yyyy HH:mm format", () => {
    const result = formatBerlinTimestamp(winterTimestamp, "dd.MM.yyyy HH:mm");
    expect(result).toBe("15.01.2024 13:00");
  });

  it("formats a summer date with CEST offset", () => {
    const result = formatBerlinTimestamp(summerTimestamp, "dd.MM.yyyy HH:mm");
    expect(result).toBe("15.07.2024 14:00");
  });

  it("formats with comma separator", () => {
    const result = formatBerlinTimestamp(winterTimestamp, "dd.MM.yyyy, HH:mm");
    expect(result).toBe("15.01.2024, 13:00");
  });

  it("formats with German day and month names", () => {
    const result = formatBerlinTimestamp(winterTimestamp, "EEEE, d. MMMM yyyy, HH:mm");
    expect(result).toBe("Montag, 15. Januar 2024, 13:00");
  });

  it("formats summer date with German day name", () => {
    const result = formatBerlinTimestamp(summerTimestamp, "EEEE, d. MMMM yyyy, HH:mm");
    expect(result).toBe("Montag, 15. Juli 2024, 14:00");
  });

  it("handles midnight UTC correctly (next day in Berlin during CET)", () => {
    // 2024-01-15 23:30:00 UTC = 2024-01-16 00:30:00 CET
    const lateUtcTimestamp = 1705361400;
    const result = formatBerlinTimestamp(lateUtcTimestamp, "dd.MM.yyyy HH:mm");
    expect(result).toBe("16.01.2024 00:30");
  });
});

describe("formatBerlinDate", () => {
  it("formats a Date object in Berlin timezone", () => {
    // 2024-01-15 12:00:00 UTC
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    const result = formatBerlinDate(date, "dd.MM.yyyy HH:mm");
    expect(result).toBe("15.01.2024 13:00");
  });
});

describe("parseBerlinDateTime", () => {
  it("parses a datetime-local string as Berlin time", () => {
    // "2024-01-15T13:00" in Berlin (CET = UTC+1) → 12:00 UTC
    const result = parseBerlinDateTime("2024-01-15T13:00");
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(0); // January
    expect(result.getUTCDate()).toBe(15);
  });

  it("handles summer time (CEST) correctly", () => {
    // "2024-07-15T14:00" in Berlin (CEST = UTC+2) → 12:00 UTC
    const result = parseBerlinDateTime("2024-07-15T14:00");
    expect(result.getUTCHours()).toBe(12);
  });
});

describe("toBerlinDatetimeLocal", () => {
  it("converts a timestamp to datetime-local format", () => {
    // 2024-01-15 12:00:00 UTC = 13:00 CET
    const result = toBerlinDatetimeLocal(1705320000);
    expect(result).toBe("2024-01-15T13:00");
  });
});

describe("tryParseToBerlinDatetimeLocal", () => {
  it("parses a valid ISO string", () => {
    const result = tryParseToBerlinDatetimeLocal("2024-01-15T12:00:00Z");
    expect(result).toBe("2024-01-15T13:00");
  });

  it("returns null for invalid input", () => {
    expect(tryParseToBerlinDatetimeLocal("not-a-date")).toBeNull();
    expect(tryParseToBerlinDatetimeLocal(undefined)).toBeNull();
  });

  it("parses a timestamp number (ms)", () => {
    const result = tryParseToBerlinDatetimeLocal(1705320000000);
    expect(result).toBe("2024-01-15T13:00");
  });
});
