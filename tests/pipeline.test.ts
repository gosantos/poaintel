import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { band, tier } from "../lib/data";
import {
  FINALIDADE,
  PAID_SITUACAO,
  dedupe,
  loadSourceRows,
  parseCsv,
  toInsert,
  type RawRow,
} from "../scripts/pipeline";

function csv(rows: string[][]): string {
  return rows.map((r) => r.join(";")).join("\n");
}

function apt(overrides: Partial<Record<number, string>> = {}): string[] {
  const r = [
    "2024/03/15 00:00:00",
    "2024/03/20 00:00:00",
    "400000",
    "100",
    "APARTAMENTO",
    "RUA FERNANDO MACHADO",
    "813",
    "101",
    "",
    "CENTRO HISTORIC",
    "90020110",
    "200",
    "90",
    "80",
    "2015",
    "12345",
    "1",
    "Impressa",
  ];
  for (const [i, v] of Object.entries(overrides)) {
    if (v !== undefined) r[Number(i)] = v;
  }
  return r;
}

function raw(overrides: Partial<RawRow> = {}): RawRow {
  return {
    year: 2024,
    dataEstimativa: "2024-03-15",
    dataPagamento: "2024-03-20",
    baseDeCalculo: 400_000,
    percTransmitido: 100,
    finalidadeConstrucao: "APARTAMENTO",
    logradouro: "RUA FERNANDO MACHADO",
    nEndereco: "813",
    nUnidade: "101",
    complementoEndereco: "",
    bairro: "CENTRO HISTORIC",
    cep: "90020110",
    areaTotalTerreno: 200,
    areaConstrTotal: 90,
    areaConstrPrivativa: 80,
    anoConstrucao: 2015,
    nMatricula: "12345",
    nZona: "1",
    situacao: "Impressa",
    ...overrides,
  };
}

describe("parseCsv", () => {
  test("keeps apartments and coberturas with positive base and area", () => {
    const text = csv([
      apt(),
      apt({ 4: "APARTAMENTO DE COBERTURA", 7: "501" }),
    ]);
    const rows = parseCsv(text);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.finalidadeConstrucao).sort()).toEqual([
      "APARTAMENTO",
      "APARTAMENTO DE COBERTURA",
    ]);
  });

  test("drops houses, zero base, zero area, and the header", () => {
    const text = csv([
      ["data_estimativa", ...apt().slice(1)],
      apt({ 4: "CASA" }),
      apt({ 2: "0" }),
      apt({ 2: "" }),
      apt({ 13: "0" }),
      apt().slice(0, 10),
    ]);
    expect(parseCsv(text)).toHaveLength(0);
  });

  test("parses the estimate date as ISO and takes the year from it", () => {
    const [row] = parseCsv(csv([apt({ 0: "2023/11/02 12:00:00" })]));
    expect(row?.dataEstimativa).toBe("2023-11-02");
    expect(row?.year).toBe(2023);
  });

  test("defaults perc_transmitido to 100 when blank", () => {
    const [row] = parseCsv(csv([apt({ 3: "" })]));
    expect(row?.percTransmitido).toBe(100);
  });

  test("truncates ano_construcao to an integer", () => {
    const [row] = parseCsv(csv([apt({ 14: "1989.7" })]));
    expect(row?.anoConstrucao).toBe(1989);
  });
});

describe("dedupe", () => {
  test("drops Reestimada lines", () => {
    expect(dedupe([raw({ situacao: "Reestimada" })])).toHaveLength(0);
  });

  test("keeps a paid Impressa or Retificada line", () => {
    expect(PAID_SITUACAO.has("Impressa")).toBe(true);
    expect(PAID_SITUACAO.has("Retificada")).toBe(true);
    expect(
      dedupe([
        raw({ situacao: "Impressa" }),
        raw({
          nUnidade: "102",
          situacao: "Retificada",
          dataPagamento: "2024-04-01",
        }),
      ]),
    ).toHaveLength(2);
  });

  test("drops an unpaid line shadowed by a paid one with the same year and base", () => {
    const paid = raw({ situacao: "Impressa", dataPagamento: "2024-03-20" });
    const unpaid = raw({
      situacao: "Emitida",
      dataPagamento: "",
      dataEstimativa: "2024-01-10",
    });
    expect(dedupe([paid, unpaid])).toEqual([paid]);
  });

  test("keeps an unpaid line when the paid sale has a different base", () => {
    const paid = raw({ baseDeCalculo: 400_000 });
    const unpaid = raw({
      situacao: "Emitida",
      dataPagamento: "",
      baseDeCalculo: 500_000,
    });
    expect(dedupe([paid, unpaid])).toHaveLength(2);
  });

  test("drops a duplicate identity inside the same unit", () => {
    expect(dedupe([raw(), raw()])).toHaveLength(1);
  });

  test("groups by normalized street + number + unit", () => {
    const a = raw({ logradouro: "Rua Fernando Machado" });
    const b = raw({ logradouro: "RUA FERNANDO MACHADO", situacao: "Emitida", dataPagamento: "" });
    expect(dedupe([a, b])).toHaveLength(1);
  });
});

describe("toInsert", () => {
  test("R$/m² is base_de_calculo / area_constr_privativa", () => {
    const row = toInsert(raw({ baseDeCalculo: 400_000, areaConstrPrivativa: 80 }));
    expect(row.rsm2).toBe(5000);
  });

  test("partial transfers are scaled to the full property value", () => {
    const row = toInsert(raw({ baseDeCalculo: 200_000, percTransmitido: 50 }));
    expect(row.fullBase).toBe(400_000);
    expect(row.rsm2).toBe(200_000 / 80);
  });

  test("tier and band follow the metodologia cells", () => {
    const row = toInsert(raw({ anoConstrucao: 2015, areaConstrPrivativa: 80 }));
    expect(row.tier).toBe(tier(2015));
    expect(row.band).toBe(band(80));
    expect(row.tier).toBe("D");
    expect(row.band).toBe("M");
  });

  test("bairroNorm is the lowercased display name, not the truncated CSV value", () => {
    const row = toInsert(raw({ bairro: "CENTRO HISTORIC" }));
    expect(row.bairro).toBe("CENTRO HISTORIC");
    expect(row.bairroNorm).toBe("centro historico");
    expect(row.logradouroNorm).toBe("RUA FERNANDO MACHADO");
  });
});

describe("loadSourceRows", () => {
  test("reads only itbi-YYYY.csv files and dedupes across them", () => {
    const dir = mkdtempSync(join(tmpdir(), "itbi-csv-"));
    try {
      writeFileSync(join(dir, "itbi-2024.csv"), csv([apt()]));
      writeFileSync(join(dir, "readme.txt"), "ignore");
      writeFileSync(join(dir, "itbi-2025.csv"), csv([apt({ 0: "2025/01/01 00:00:00", 1: "2025/01/02 00:00:00" })]));
      const loaded = loadSourceRows(dir, () => {});
      expect(loaded.files).toHaveLength(2);
      expect(loaded.raw).toHaveLength(2);
      expect(loaded.final).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("throws when the directory has no ITBI CSVs", () => {
    const dir = mkdtempSync(join(tmpdir(), "itbi-empty-"));
    try {
      expect(() => loadSourceRows(dir, () => {})).toThrow(/Nenhum CSV/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("universe", () => {
  test("only apartments and coberturas are in the stated finalidade set", () => {
    expect(FINALIDADE).toEqual(
      new Set(["APARTAMENTO", "APARTAMENTO DE COBERTURA"]),
    );
  });
});
