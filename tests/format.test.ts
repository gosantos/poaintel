import { describe, expect, test } from "bun:test";
import {
  compact,
  formatArea,
  formatNumber,
  formatPct,
  fullDate,
  money,
  moneyPrecise,
  rsm2,
  shortDate,
} from "../lib/format";

describe("money", () => {
  test("formats BRL with no cents", () => {
    expect(money(1234.56)).toBe("R$\u00a01.235");
    expect(money(0)).toBe("R$\u00a00");
  });
});

describe("moneyPrecise", () => {
  test("keeps two decimal places", () => {
    expect(moneyPrecise(1234.56)).toBe("R$\u00a01.234,56");
  });
});

describe("rsm2", () => {
  test("is integer BRL per square meter", () => {
    expect(rsm2(8500.4)).toBe("8.500/m²");
  });
});

describe("formatNumber / formatArea", () => {
  test("uses pt-BR grouping", () => {
    expect(formatNumber(12345)).toBe("12.345");
    expect(formatArea(75.25)).toBe("75,3 m²");
  });
});

describe("formatPct", () => {
  test("always shows a sign and treats input as percentage points", () => {
    expect(formatPct(5)).toBe("+5%");
    expect(formatPct(-3.2, 1)).toBe("-3,2%");
    expect(formatPct(0)).toBe("+0%");
  });
});

describe("dates", () => {
  test("shortDate is month/year from ISO", () => {
    expect(shortDate("2024-06-15")).toBe("06/2024");
  });

  test("fullDate is day/month/year from ISO", () => {
    expect(fullDate("2024-06-15")).toBe("15/06/2024");
  });
});

describe("compact", () => {
  test("abbreviates thousands in pt-BR", () => {
    expect(compact(12345)).toBe("12,3\u00a0mil");
  });
});
