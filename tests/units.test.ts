import { describe, expect, test } from "bun:test";
import { summarizeUnits } from "../lib/units";

describe("summarizeUnits", () => {
  test("averages fullBase of the same apartment and divides by its area", () => {
    const rows = [
      {
        nUnidade: "101",
        area: 80,
        fullBase: 400_000,
        dataEstimativa: "2024-03-01",
        comp: { pct: -5, p50: 5500 },
      },
      {
        nUnidade: "101",
        area: 80,
        fullBase: 480_000,
        dataEstimativa: "2025-03-01",
        comp: { pct: 5, p50: 5500 },
      },
    ];
    expect(summarizeUnits(rows)).toEqual([
      {
        unit: "101",
        area: 80,
        avgBase: 440_000,
        avgRsm2: 5500,
        sales: 2,
        years: ["2024", "2025"],
        comp: { pct: -5, p50: 5500 },
      },
    ]);
  });

  test("does not invent an R$/m² when the unit changed size", () => {
    const rows = [
      {
        nUnidade: "202",
        area: 70,
        fullBase: 350_000,
        dataEstimativa: "2024-01-01",
        comp: null,
      },
      {
        nUnidade: "202",
        area: 90,
        fullBase: 450_000,
        dataEstimativa: "2025-01-01",
        comp: null,
      },
    ];
    const [unit] = summarizeUnits(rows);
    expect(unit?.area).toBeNull();
    expect(unit?.avgRsm2).toBeNull();
    expect(unit?.avgBase).toBe(400_000);
  });

  test("null unit numbers group under —", () => {
    const [unit] = summarizeUnits([
      {
        nUnidade: null,
        area: 50,
        fullBase: 200_000,
        dataEstimativa: "2024-01-01",
        comp: null,
      },
    ]);
    expect(unit?.unit).toBe("—");
  });
});
