import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { client, db } from "../db/client";
import { TRANSACTIONS_DDL } from "../db/ddl";
import {
  countTransactions,
  getBairroCell,
  getBairroMovers,
  getBairroYearMatrix,
  getBairrosByMedian,
  getBenchmarks,
  getGroupStats,
  getOverview,
  getPercentiles,
  getRecentTransactions,
  getTierTrend,
  getTopBairros,
  getTrend,
  median,
  pct,
  resetStreetCatalog,
  resolveStreetQuery,
  searchTransactions,
} from "../db/queries";
import { transactions } from "../db/schema";

type Insert = typeof transactions.$inferInsert;

function tx(
  overrides: Partial<Insert> & {
    rsm2: number;
    year: number;
    bairroNorm: string;
  },
): Insert {
  const area = overrides.areaConstrPrivativa ?? 80;
  const rsm2 = overrides.rsm2;
  const perc = overrides.percTransmitido ?? 100;
  const base = overrides.baseDeCalculo ?? rsm2 * area * (perc / 100);
  const bairro = overrides.bairro ?? overrides.bairroNorm.toUpperCase();
  return {
    year: overrides.year,
    dataEstimativa: overrides.dataEstimativa ?? `${overrides.year}-06-15`,
    dataPagamento: overrides.dataPagamento ?? `${overrides.year}-06-20`,
    baseDeCalculo: base,
    percTransmitido: perc,
    fullBase: overrides.fullBase ?? base / (perc / 100),
    rsm2,
    finalidadeConstrucao: overrides.finalidadeConstrucao ?? "APARTAMENTO",
    logradouro: overrides.logradouro ?? "RUA FERNANDO MACHADO",
    logradouroNorm: overrides.logradouroNorm ?? "RUA FERNANDO MACHADO",
    nEndereco: overrides.nEndereco ?? "813",
    nUnidade: overrides.nUnidade ?? "101",
    complementoEndereco: overrides.complementoEndereco ?? null,
    bairro,
    bairroNorm: overrides.bairroNorm,
    cep: overrides.cep ?? "90020110",
    areaTotalTerreno: overrides.areaTotalTerreno ?? 200,
    areaConstrTotal: overrides.areaConstrTotal ?? 90,
    areaConstrPrivativa: area,
    anoConstrucao: overrides.anoConstrucao ?? 2015,
    nMatricula: overrides.nMatricula ?? "1",
    nZona: overrides.nZona ?? "1",
    situacao: overrides.situacao ?? "Impressa",
    tier: overrides.tier ?? "D",
    band: overrides.band ?? "M",
  };
}

async function seed(rows: Insert[]) {
  if (rows.length) await db.insert(transactions).values(rows);
}

beforeEach(async () => {
  resetStreetCatalog();
  await db.run(sql`DROP TABLE IF EXISTS transactions`);
  await client.executeMultiple(TRANSACTIONS_DDL);
});

describe("pct / median", () => {
  test("p50 of an odd list is the middle value", () => {
    expect(median([10, 20, 30])).toBe(20);
    expect(pct([10, 20, 30, 40, 50], 25)).toBe(20);
    expect(pct([10, 20, 30, 40, 50], 75)).toBe(40);
  });

  test("p50 of an even list is the average of the two middle values", () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  test("empty list is NaN", () => {
    expect(Number.isNaN(median([]))).toBe(true);
  });
});

describe("getOverview", () => {
  test("counts only rows with positive base and area", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000 }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 7000, nUnidade: "102" }),
      tx({
        year: 2024,
        bairroNorm: "centro",
        rsm2: 0,
        baseDeCalculo: 0,
        areaConstrPrivativa: 80,
        nUnidade: "103",
      }),
    ]);
    const overview = await getOverview();
    expect(overview.total).toBe(2);
    expect(overview.yearMin).toBe(2024);
    expect(overview.yearMax).toBe(2025);
    expect(overview.meanArea).toBe(80);
  });

  test("median R$/m² of an odd set is the middle value", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 4000, nUnidade: "1" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000, nUnidade: "2" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 9000, nUnidade: "3" }),
    ]);
    expect((await getOverview()).medianRsm2).toBe(5000);
  });

  test("median R$/m² of an even set is the lower middle (SQL OFFSET)", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 1000, nUnidade: "1" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 2000, nUnidade: "2" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 3000, nUnidade: "3" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 4000, nUnidade: "4" }),
    ]);
    expect((await getOverview()).medianRsm2).toBe(2000);
  });
});

describe("getTrend", () => {
  test("median per year averages the two middle values when n is even", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 1000, nUnidade: "1" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 2000, nUnidade: "2" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 3000, nUnidade: "3" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 4000, nUnidade: "4" }),
    ]);
    const [point] = await getTrend({});
    expect(point).toMatchObject({ year: 2024, n: 4, min: 1000, max: 4000 });
    expect(point?.median).toBe(2500);
  });
});

describe("getBenchmarks", () => {
  test("a cell needs 3 sales before it becomes a benchmark", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000, nUnidade: "1", tier: "D", band: "M" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 6000, nUnidade: "2", tier: "D", band: "M" }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 8000, nUnidade: "3", tier: "A", band: "S" }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 9000, nUnidade: "4", tier: "A", band: "S" }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 10000, nUnidade: "5", tier: "A", band: "S" }),
    ]);
    const cells = await getBenchmarks("centro");
    expect(cells.find((c) => c.tier === "D" && c.band === "M")).toBeUndefined();
    const cell = cells.find((c) => c.tier === "A" && c.band === "S");
    expect(cell).toMatchObject({ n: 3, p50: 9000 });
    expect(cell?.p25).toBe(8500);
    expect(cell?.p75).toBe(9500);
  });

  test("getBairroCell returns the matching cell or null", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000, nUnidade: "1", tier: "D", band: "M" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 6000, nUnidade: "2", tier: "D", band: "M" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 7000, nUnidade: "3", tier: "D", band: "M" }),
    ]);
    expect(await getBairroCell("centro", "D", "M")).toMatchObject({ n: 3, p50: 6000 });
    expect(await getBairroCell("centro", "A", "S")).toBeNull();
  });
});

describe("searchTransactions", () => {
  test("filters by street, number, year and area", async () => {
    await seed([
      tx({
        year: 2024,
        bairroNorm: "centro",
        rsm2: 5000,
        logradouroNorm: "RUA FERNANDO MACHADO",
        nEndereco: "813",
        areaConstrPrivativa: 80,
      }),
      tx({
        year: 2025,
        bairroNorm: "centro",
        rsm2: 6000,
        nUnidade: "202",
        logradouroNorm: "AVENIDA IPIRANGA",
        nEndereco: "100",
        areaConstrPrivativa: 40,
        band: "S",
      }),
    ]);
    const byStreet = await searchTransactions({ ruaNorm: "FERNANDO" });
    expect(byStreet).toHaveLength(1);
    expect(byStreet[0]?.logradouroNorm).toBe("RUA FERNANDO MACHADO");

    const byNumber = await searchTransactions({
      ruaNorm: "FERNANDO",
      numero: "813",
    });
    expect(byNumber).toHaveLength(1);

    const missNumber = await searchTransactions({
      ruaNorm: "FERNANDO",
      numero: "999",
    });
    expect(missNumber).toHaveLength(0);

    const byYear = await searchTransactions({ years: [2025] });
    expect(byYear).toHaveLength(1);

    const byArea = await searchTransactions({ minM2: 50, maxM2: 90 });
    expect(byArea).toHaveLength(1);
    expect(byArea[0]?.areaConstrPrivativa).toBe(80);
  });

  test("ruaNorms uses exact IN matching", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000, logradouroNorm: "RUA FERNANDO MACHADO" }),
      tx({
        year: 2024,
        bairroNorm: "centro",
        rsm2: 6000,
        nUnidade: "2",
        logradouroNorm: "AVENIDA IPIRANGA",
      }),
    ]);
    const rows = await searchTransactions({
      ruaNorms: ["AVENIDA IPIRANGA"],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.logradouroNorm).toBe("AVENIDA IPIRANGA");
  });
});

describe("countTransactions", () => {
  test("counts the same universe as search", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000 }),
      tx({ year: 2025, bairroNorm: "auxiliadora", rsm2: 8000, nUnidade: "2" }),
    ]);
    expect(await countTransactions({ bairroNorm: "centro" })).toBe(1);
    expect(await countTransactions({})).toBe(2);
  });
});

describe("getPercentiles", () => {
  test("uses rank floor((n−1)·p), not interpolated pct()", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 10, nUnidade: "1" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 20, nUnidade: "2" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 30, nUnidade: "3" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 40, nUnidade: "4" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 50, nUnidade: "5" }),
    ]);
    expect(await getPercentiles()).toEqual({
      p10: 10,
      p25: 20,
      p50: 30,
      p75: 40,
      p90: 40,
      n: 5,
    });
  });
});

describe("getTopBairros / getBairrosByMedian", () => {
  test("ranks by volume and by median with a minimum n", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", bairro: "CENTRO HISTORIC", rsm2: 5000, nUnidade: "1" }),
      tx({ year: 2024, bairroNorm: "centro", bairro: "CENTRO HISTORIC", rsm2: 7000, nUnidade: "2" }),
      tx({ year: 2024, bairroNorm: "centro", bairro: "CENTRO HISTORIC", rsm2: 6000, nUnidade: "3" }),
      tx({ year: 2024, bairroNorm: "auxiliadora", bairro: "AUXILIADORA", rsm2: 9000, nUnidade: "1" }),
    ]);
    const top = await getTopBairros(10);
    expect(top[0]?.bairroNorm).toBe("centro");
    expect(top[0]?.n).toBe(3);
    expect(top[0]?.medianRsm2).toBe(6000);

    const high = await getBairrosByMedian("desc", 8, 3);
    expect(high).toHaveLength(1);
    expect(high[0]?.bairroNorm).toBe("centro");
    expect(high[0]?.medianRsm2).toBe(6000);
  });
});

describe("getTierTrend", () => {
  test("median R$/m² by sale year inside each construction tier", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 4000, nUnidade: "1", tier: "A" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000, nUnidade: "2", tier: "A" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 6000, nUnidade: "3", tier: "A" }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 5000, nUnidade: "4", tier: "A" }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 6000, nUnidade: "5", tier: "A" }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 7000, nUnidade: "6", tier: "A" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 9000, nUnidade: "7", tier: "E" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 11000, nUnidade: "8", tier: "E" }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 12000, nUnidade: "9", tier: "E" }),
      tx({ year: 2025, bairroNorm: "centro", rsm2: 14000, nUnidade: "10", tier: "E" }),
    ]);
    const rows = await getTierTrend();
    expect(rows.find((r) => r.year === 2024 && r.tier === "A")).toMatchObject({
      n: 3,
      median: 5000,
    });
    expect(rows.find((r) => r.year === 2025 && r.tier === "A")).toMatchObject({
      n: 3,
      median: 6000,
    });
    expect(rows.find((r) => r.year === 2024 && r.tier === "E")).toMatchObject({
      n: 2,
      median: 10000,
    });
    expect(rows.find((r) => r.year === 2025 && r.tier === "E")).toMatchObject({
      n: 2,
      median: 13000,
    });
  });
});

describe("getGroupStats", () => {
  test("median R$/m² by construction tier", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 4000, nUnidade: "1", tier: "A" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000, nUnidade: "2", tier: "A" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 6000, nUnidade: "3", tier: "A" }),
      tx({ year: 2024, bairroNorm: "centro", rsm2: 9000, nUnidade: "4", tier: "D" }),
    ]);
    const stats = await getGroupStats("tier");
    expect(stats.find((s) => s.key === "A")).toMatchObject({ n: 3, medianRsm2: 5000 });
    expect(stats.find((s) => s.key === "D")).toMatchObject({ n: 1, medianRsm2: 9000 });
  });
});

describe("getBairroMovers", () => {
  test("YoY is (med1/med0 − 1) × 100 and requires minN in both years", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", bairro: "CENTRO", rsm2: 4000, nUnidade: "1" }),
      tx({ year: 2024, bairroNorm: "centro", bairro: "CENTRO", rsm2: 6000, nUnidade: "2" }),
      tx({ year: 2025, bairroNorm: "centro", bairro: "CENTRO", rsm2: 5000, nUnidade: "3" }),
      tx({ year: 2025, bairroNorm: "centro", bairro: "CENTRO", rsm2: 7000, nUnidade: "4" }),
      tx({ year: 2024, bairroNorm: "lami", bairro: "LAMI", rsm2: 2000, nUnidade: "1" }),
      tx({ year: 2025, bairroNorm: "lami", bairro: "LAMI", rsm2: 8000, nUnidade: "2" }),
    ]);
    const movers = await getBairroMovers(2024, 2025, 2);
    expect(movers).toHaveLength(1);
    expect(movers[0]?.bairroNorm).toBe("centro");
    expect(movers[0]?.med0).toBe(5000);
    expect(movers[0]?.med1).toBe(6000);
    expect(movers[0]?.yoy).toBeCloseTo(20);
  });
});

describe("getBairroYearMatrix", () => {
  test("keeps year cells that meet both n thresholds", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", bairro: "CENTRO", rsm2: 4000, nUnidade: "1" }),
      tx({ year: 2024, bairroNorm: "centro", bairro: "CENTRO", rsm2: 6000, nUnidade: "2" }),
      tx({ year: 2025, bairroNorm: "centro", bairro: "CENTRO", rsm2: 8000, nUnidade: "3" }),
    ]);
    const matrix = await getBairroYearMatrix(2, 3);
    expect(matrix).toHaveLength(1);
    expect(matrix[0]).toMatchObject({
      bairroNorm: "centro",
      year: 2024,
      n: 2,
      nAll: 3,
      medianRsm2: 5000,
    });
  });
});

describe("getRecentTransactions", () => {
  test("returns the latest sales in a bairro", async () => {
    await seed([
      tx({
        year: 2024,
        bairroNorm: "centro",
        rsm2: 4000,
        dataEstimativa: "2024-01-01",
        nUnidade: "1",
      }),
      tx({
        year: 2025,
        bairroNorm: "centro",
        rsm2: 5000,
        dataEstimativa: "2025-12-01",
        nUnidade: "2",
      }),
      tx({
        year: 2025,
        bairroNorm: "auxiliadora",
        rsm2: 9000,
        dataEstimativa: "2025-12-31",
        nUnidade: "1",
      }),
    ]);
    const recent = await getRecentTransactions("centro", 10);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.dataEstimativa).toBe("2025-12-01");
  });
});

describe("resolveStreetQuery", () => {
  test("maps a typed query onto catalog streets", async () => {
    await seed([
      tx({ year: 2024, bairroNorm: "centro", rsm2: 5000, logradouro: "Rua Fernando Machado", logradouroNorm: "RUA FERNANDO MACHADO" }),
    ]);
    const hits = await resolveStreetQuery("fernando machado");
    expect(hits[0]).toMatchObject({
      logradouroNorm: "RUA FERNANDO MACHADO",
      logradouro: "Rua Fernando Machado",
      method: "exact",
    });
  });
});
