import { existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { describe, expect, test } from "bun:test";
import { bairroDisplay } from "../lib/bairros";
import { band, norm, tier } from "../lib/data";
import { FINALIDADE } from "../scripts/pipeline";

const DB_PATH = "data/itbi.db";
const hasProd = existsSync(DB_PATH);

describe.skipIf(!hasProd)("imported ITBI data matches the stated methodology", () => {
  const client = createClient({ url: `file:${DB_PATH}` });

  test("every row is an apartment/cobertura with positive base and area", async () => {
    const bad = await client.execute(`
      SELECT COUNT(*) AS n FROM transactions
      WHERE finalidade_construcao NOT IN ('APARTAMENTO', 'APARTAMENTO DE COBERTURA')
         OR base_de_calculo <= 0
         OR area_constr_privativa <= 0
    `);
    expect(Number(bad.rows[0]?.n)).toBe(0);
  });

  test("R$/m² is base_de_calculo / area_constr_privativa on every row", async () => {
    const bad = await client.execute(`
      SELECT COUNT(*) AS n FROM transactions
      WHERE ABS(rsm2 - base_de_calculo / area_constr_privativa) > 0.0001
    `);
    expect(Number(bad.rows[0]?.n)).toBe(0);
  });

  test("full_base scales partial transfers to 100%", async () => {
    const bad = await client.execute(`
      SELECT COUNT(*) AS n FROM transactions
      WHERE perc_transmitido > 0
        AND ABS(full_base - base_de_calculo / (perc_transmitido / 100.0)) > 0.01
    `);
    expect(Number(bad.rows[0]?.n)).toBe(0);
  });

  test("no Reestimada rows survive dedupe", async () => {
    const bad = await client.execute(
      `SELECT COUNT(*) AS n FROM transactions WHERE situacao = 'Reestimada'`,
    );
    expect(Number(bad.rows[0]?.n)).toBe(0);
  });

  test("year is the year of data_estimativa and sits in 2020–2026", async () => {
    const bad = await client.execute(`
      SELECT COUNT(*) AS n FROM transactions
      WHERE year != CAST(substr(data_estimativa, 1, 4) AS INTEGER)
         OR year < 2020
         OR year > 2026
    `);
    expect(Number(bad.rows[0]?.n)).toBe(0);
  });

  test("tier matches ano_construcao for every distinct year", async () => {
    const rs = await client.execute(`
      SELECT DISTINCT ano_construcao, tier FROM transactions
    `);
    expect(rs.rows.length).toBeGreaterThan(0);
    for (const row of rs.rows) {
      const year = row.ano_construcao == null ? null : Number(row.ano_construcao);
      expect(row.tier).toBe(tier(year));
    }
  });

  test("band matches area_constr_privativa for every row", async () => {
    const rs = await client.execute(`
      SELECT DISTINCT area_constr_privativa, band FROM transactions
    `);
    expect(rs.rows.length).toBeGreaterThan(0);
    for (const row of rs.rows) {
      expect(row.band).toBe(band(Number(row.area_constr_privativa)));
    }
  });

  test("logradouro_norm is norm(logradouro)", async () => {
    const rs = await client.execute(`
      SELECT DISTINCT logradouro, logradouro_norm FROM transactions
    `);
    for (const row of rs.rows) {
      expect(row.logradouro_norm).toBe(norm(String(row.logradouro)));
    }
  });

  test("bairro_norm is the lowercased display name of the raw CSV value", async () => {
    const rs = await client.execute(`
      SELECT DISTINCT bairro, bairro_norm FROM transactions
    `);
    expect(rs.rows.length).toBeGreaterThan(0);
    for (const row of rs.rows) {
      const raw = String(row.bairro);
      expect(row.bairro_norm).toBe(norm(bairroDisplay(raw)).toLowerCase());
    }
  });

  test("the cadastro is non-empty and only the stated finalidades", async () => {
    const rs = await client.execute(`
      SELECT COUNT(*) AS n,
             COUNT(DISTINCT finalidade_construcao) AS kinds
      FROM transactions
    `);
    expect(Number(rs.rows[0]?.n)).toBeGreaterThan(0);
    const kinds = await client.execute(
      `SELECT DISTINCT finalidade_construcao AS f FROM transactions`,
    );
    for (const row of kinds.rows) {
      expect(FINALIDADE.has(String(row.f))).toBe(true);
    }
  });
});
