import { describe, expect, test } from "bun:test";
import { searchSchema } from "../lib/search";

describe("searchSchema", () => {
  test("accepts a street and number", () => {
    const parsed = searchSchema.parse({ rua: "  Fernando Machado ", numero: "813" });
    expect(parsed.rua).toBe("Fernando Machado");
    expect(parsed.numero).toBe("813");
  });

  test("accepts a trailing letter on the number", () => {
    expect(searchSchema.parse({ numero: "813A" }).numero).toBe("813A");
  });

  test("rejects a non-numeric number", () => {
    const result = searchSchema.safeParse({ numero: "abc" });
    expect(result.success).toBe(false);
  });

  test("empty number becomes absent", () => {
    expect(searchSchema.parse({ numero: "" }).numero).toBeUndefined();
  });

  test("parses a comma-separated year list, max 7", () => {
    expect(searchSchema.parse({ ano: "2024, 2025" }).ano).toEqual(["2024", "2025"]);
    expect(searchSchema.parse({ ano: 2024 }).ano).toEqual(["2024"]);
    expect(searchSchema.safeParse({ ano: "20" }).success).toBe(false);
    expect(
      searchSchema.safeParse({
        ano: "2020,2021,2022,2023,2024,2025,2026,2027",
      }).success,
    ).toBe(false);
  });

  test("area bounds must be finite and non-negative", () => {
    expect(searchSchema.parse({ minM2: "50", maxM2: "90" })).toMatchObject({
      minM2: 50,
      maxM2: 90,
    });
    expect(searchSchema.safeParse({ minM2: "-1" }).success).toBe(false);
  });

  test("porUnidade accepts true, 'true', '1', and 'on'", () => {
    expect(searchSchema.parse({ porUnidade: true }).porUnidade).toBe(true);
    expect(searchSchema.parse({ porUnidade: "true" }).porUnidade).toBe(true);
    expect(searchSchema.parse({ porUnidade: "1" }).porUnidade).toBe(true);
    expect(searchSchema.parse({ porUnidade: "on" }).porUnidade).toBe(true);
    expect(searchSchema.parse({ porUnidade: "false" }).porUnidade).toBe(false);
  });

  test("rejects an empty rua", () => {
    expect(searchSchema.safeParse({ rua: "  " }).success).toBe(false);
  });
});
