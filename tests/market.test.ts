import { describe, expect, test } from "bun:test";
import { pctChange, sharePct, spreadRatio, vsBenchmark } from "../lib/market";

describe("pctChange", () => {
  test("is (to/from − 1) × 100", () => {
    expect(pctChange(100, 125)).toBe(25);
    expect(pctChange(8000, 7600)).toBeCloseTo(-5);
  });

  test("refuses a zero or missing base so YoY cannot divide by zero", () => {
    expect(pctChange(0, 100)).toBeNull();
    expect(pctChange(null, 100)).toBeNull();
    expect(pctChange(undefined, 100)).toBeNull();
  });
});

describe("vsBenchmark", () => {
  test("is how far a sale sits from the cell p50", () => {
    expect(vsBenchmark(11000, 10000)?.p50).toBe(10000);
    expect(vsBenchmark(11000, 10000)?.pct).toBeCloseTo(10);
    expect(vsBenchmark(9000, 10000)?.pct).toBeCloseTo(-10);
  });

  test("cells without a positive p50 have no comparison", () => {
    expect(vsBenchmark(10000, 0)).toBeNull();
    expect(vsBenchmark(10000, undefined)).toBeNull();
  });
});

describe("sharePct", () => {
  test("is part of total as percentage points", () => {
    expect(sharePct(25, 100)).toBe(25);
    expect(sharePct(10, 0)).toBe(0);
  });
});

describe("spreadRatio", () => {
  test("is p90 / p10, the amplitude stated on insights", () => {
    expect(spreadRatio(4000, 12000)).toBe(3);
    expect(spreadRatio(0, 12000)).toBeNull();
  });
});
