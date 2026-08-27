import { describe, expect, test } from "bun:test";
import { band, bandLabel, norm, slugify, tier, tierLabel } from "../lib/data";

describe("norm", () => {
  test("strips accents, collapses space, uppercases", () => {
    expect(norm("  Moinhos de Vento  ")).toBe("MOINHOS DE VENTO");
    expect(norm("São João")).toBe("SAO JOAO");
    expect(norm("Belém Novo")).toBe("BELEM NOVO");
  });

  test("treats empty as empty string", () => {
    expect(norm("")).toBe("");
  });
});

describe("slugify", () => {
  test("turns a bairro name into a URL slug", () => {
    expect(slugify("Centro Histórico")).toBe("centro-historico");
    expect(slugify("moinhos de vento")).toBe("moinhos-de-vento");
  });
});

describe("tier — época de construção", () => {
  test("maps years to the cells stated in metodologia", () => {
    expect(tier(1949)).toBe("A");
    expect(tier(1969)).toBe("A");
    expect(tier(1970)).toBe("B");
    expect(tier(1989)).toBe("B");
    expect(tier(1990)).toBe("C");
    expect(tier(2009)).toBe("C");
    expect(tier(2010)).toBe("D");
    expect(tier(2019)).toBe("D");
    expect(tier(2020)).toBe("E");
    expect(tier(2024)).toBe("E");
  });

  test("missing year is the unknown cell", () => {
    expect(tier(null)).toBe("?");
    expect(tier(0)).toBe("?");
  });
});

describe("tierLabel", () => {
  test("labels match the metodologia grid", () => {
    expect(tierLabel("A")).toBe("até 1969");
    expect(tierLabel("B")).toBe("1970–89");
    expect(tierLabel("C")).toBe("1990–2009");
    expect(tierLabel("D")).toBe("2010–19");
    expect(tierLabel("E")).toBe("2020+");
    expect(tierLabel("?")).toBe("Sem ano");
  });
});

describe("band — faixa de tamanho", () => {
  test("maps privative m² to the cells stated in metodologia", () => {
    expect(band(49.9)).toBe("S");
    expect(band(50)).toBe("M");
    expect(band(89.9)).toBe("M");
    expect(band(90)).toBe("L");
    expect(band(149.9)).toBe("L");
    expect(band(150)).toBe("XL");
  });
});

describe("bandLabel", () => {
  test("labels match the metodologia grid", () => {
    expect(bandLabel("S")).toBe("< 50 m²");
    expect(bandLabel("M")).toBe("50–89 m²");
    expect(bandLabel("L")).toBe("90–149 m²");
    expect(bandLabel("XL")).toBe("≥ 150 m²");
  });
});
