import { describe, expect, test } from "bun:test";
import { ipcaFactor, ipcaPct, ipcaRebased, ipcaYear } from "../lib/ipca";

const IPCA = {
  2020: 4.52,
  2021: 10.06,
  2022: 5.79,
  2023: 4.62,
  2024: 4.83,
  2025: 4.26,
  2026: 3.44,
} as const;

describe("IPCA table (IBGE / BCB SGS 433)", () => {
  test("stores the published annual rates used on the site", () => {
    expect(ipcaYear(2020)?.rate).toBe(IPCA[2020]);
    expect(ipcaYear(2021)?.rate).toBe(IPCA[2021]);
    expect(ipcaYear(2022)?.rate).toBe(IPCA[2022]);
    expect(ipcaYear(2023)?.rate).toBe(IPCA[2023]);
    expect(ipcaYear(2024)?.rate).toBe(IPCA[2024]);
    expect(ipcaYear(2025)?.rate).toBe(IPCA[2025]);
    expect(ipcaYear(2026)?.rate).toBe(IPCA[2026]);
  });

  test("2026 is the partial year through July", () => {
    expect(ipcaYear(2026)?.months).toBe(7);
    expect(ipcaYear(2025)?.months).toBe(12);
  });
});

describe("ipcaFactor", () => {
  test("same year is a factor of 1", () => {
    expect(ipcaFactor(2020, 2020)).toBe(1);
  });

  test("does not apply the base year's own rate", () => {
    expect(ipcaFactor(2020, 2021)).toBeCloseTo(1 + IPCA[2021] / 100);
  });

  test("compounds 2021–2025 onto a 2020 base", () => {
    const expected =
      (1 + IPCA[2021] / 100) *
      (1 + IPCA[2022] / 100) *
      (1 + IPCA[2023] / 100) *
      (1 + IPCA[2024] / 100) *
      (1 + IPCA[2025] / 100);
    expect(ipcaFactor(2020, 2025)).toBeCloseTo(expected);
  });

  test("returns null when the end year precedes the start", () => {
    expect(ipcaFactor(2025, 2024)).toBeNull();
  });

  test("returns null when a year in the range is missing", () => {
    expect(ipcaFactor(2018, 2020)).toBeNull();
  });
});

describe("ipcaPct", () => {
  test("is (factor − 1) × 100", () => {
    const f = ipcaFactor(2020, 2025)!;
    expect(ipcaPct(2020, 2025)).toBeCloseTo((f - 1) * 100);
  });
});

describe("ipcaRebased", () => {
  test("indexes later years off the first positive median", () => {
    const series = [
      { year: 2020, median: 8000 },
      { year: 2021, median: 8100 },
      { year: 2022, median: 8200 },
    ];
    const rebased = ipcaRebased(series);
    expect(rebased[0]).toEqual({ year: 2020, ipca: 8000 });
    expect(rebased[1]?.ipca).toBeCloseTo(8000 * (1 + IPCA[2021] / 100));
    expect(rebased[2]?.ipca).toBeCloseTo(
      8000 * (1 + IPCA[2021] / 100) * (1 + IPCA[2022] / 100),
    );
  });

  test("skips an empty series", () => {
    expect(ipcaRebased([])).toEqual([]);
    expect(ipcaRebased([{ year: 2020, median: 0 }])).toEqual([]);
  });
});
