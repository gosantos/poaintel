import { describe, expect, test } from "bun:test";
import { levenshtein, matchStreets, streetCore } from "../lib/fuzzy";

describe("levenshtein", () => {
  test("is the classic edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

describe("streetCore", () => {
  test("strips a logradouro prefix", () => {
    expect(streetCore("RUA FERNANDO MACHADO")).toBe("FERNANDO MACHADO");
    expect(streetCore("AVENIDA IPIRANGA")).toBe("IPIRANGA");
    expect(streetCore("AV IPIRANGA")).toBe("IPIRANGA");
    expect(streetCore("FERNANDO MACHADO")).toBe("FERNANDO MACHADO");
  });
});

const STREETS = [
  "RUA FERNANDO MACHADO",
  "AVENIDA IPIRANGA",
  "RUA DUQUE DE CAXIAS",
  "RUA JOSE DE ALENCAR",
];

describe("matchStreets", () => {
  test("matches ignoring case, accents, and the RUA prefix", () => {
    const hits = matchStreets("fernando machado", STREETS);
    expect(hits[0]).toMatchObject({
      logradouroNorm: "RUA FERNANDO MACHADO",
      method: "exact",
      distance: 0,
    });
  });

  test("contains-match on a unique fragment", () => {
    const hits = matchStreets("fernando", STREETS);
    expect(hits[0]).toMatchObject({
      logradouroNorm: "RUA FERNANDO MACHADO",
      method: "contains",
    });
  });

  test("fuzzy-matches a one-character typo on a long token", () => {
    const hits = matchStreets("fernndo machado", STREETS);
    expect(hits.some((h) => h.logradouroNorm === "RUA FERNANDO MACHADO")).toBe(
      true,
    );
    expect(
      hits.find((h) => h.logradouroNorm === "RUA FERNANDO MACHADO")?.method,
    ).toBe("fuzzy");
  });

  test("does not match a query shorter than 2 characters", () => {
    expect(matchStreets("f", STREETS)).toEqual([]);
  });

  test("drops distant fuzzy hits when an exact/contains hit exists", () => {
    const hits = matchStreets("fernando machado", [
      ...STREETS,
      "RUA FERNANDA MACHADO SILVA EXTRA LONGA",
    ]);
    expect(hits.every((h) => h.method !== "fuzzy" || h.distance <= 1.5)).toBe(
      true,
    );
  });

  test("respects the result limit", () => {
    expect(matchStreets("rua", STREETS, 1)).toHaveLength(1);
  });
});
