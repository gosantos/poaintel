import { describe, expect, test } from "bun:test";
import {
  BAIRRO_DISPLAY,
  bairroDisplay,
  resolveBairroNorm,
} from "../lib/bairros";
import { slugify } from "../lib/data";

describe("bairroDisplay", () => {
  test("expands the 15-character CSV truncations", () => {
    expect(bairroDisplay("ABERTA DOS MORR")).toBe("Aberta dos Morros");
    expect(bairroDisplay("CENTRO HISTORIC")).toBe("Centro Histórico");
    expect(bairroDisplay("MOINHOS VENTO")).toBe("Moinhos de Vento");
    expect(bairroDisplay("CEL AP BORGES")).toBe("Cel. Aparício Borges");
    expect(bairroDisplay("LOMBA PINHEIRO")).toBe("Lomba do Pinheiro");
  });

  test("collapses aliases of the same bairro", () => {
    expect(bairroDisplay("PASSO DAS PEDRA")).toBe("Passo das Pedras");
    expect(bairroDisplay("PASSO PEDRAS")).toBe("Passo das Pedras");
    expect(bairroDisplay("VILA SAO JOSE")).toBe("Vila São José");
    expect(bairroDisplay("VL SAO JOSE")).toBe("Vila São José");
  });

  test("empty raw value is Não informado", () => {
    expect(bairroDisplay("")).toBe("Não informado");
  });

  test("unknown raw values pass through", () => {
    expect(bairroDisplay("BAIRRO NOVO")).toBe("BAIRRO NOVO");
  });
});

describe("resolveBairroNorm", () => {
  const catalog = [
    { bairroNorm: "centro historico", bairro: "CENTRO HISTORIC" },
    { bairroNorm: "moinhos de vento", bairro: "MOINHOS VENTO" },
  ];

  test("matches the stored norm, ignoring case and accents", () => {
    expect(resolveBairroNorm("Centro Histórico", catalog)).toBe(
      "centro historico",
    );
  });

  test("matches the display name when the stored raw value is truncated", () => {
    expect(resolveBairroNorm("Moinhos de Vento", catalog)).toBe(
      "moinhos de vento",
    );
  });

  test("missing input is undefined", () => {
    expect(resolveBairroNorm(undefined, catalog)).toBeUndefined();
  });
});

describe("slugify of display names", () => {
  test("every mapped bairro has a hyphenated slug", () => {
    for (const name of Object.values(BAIRRO_DISPLAY)) {
      if (!name) continue;
      expect(slugify(name)).toMatch(/^[a-z0-9.]+(?:-[a-z0-9.]+)*$/);
    }
  });
});
