import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { sql } from "drizzle-orm";
import { db, client } from "../db/client";
import { TRANSACTIONS_DDL } from "../db/ddl";
import { transactions } from "../db/schema";
import { loadSourceRows, toInsert } from "./pipeline";

const CSV_DIR = process.env.ITBI_CSV_DIR ?? "data/csv";

async function main() {
  const { final } = loadSourceRows(CSV_DIR);

  mkdirSync(dirname("data/itbi.db"), { recursive: true });

  await db.run(sql`DROP TABLE IF EXISTS transactions`);
  await client.executeMultiple(TRANSACTIONS_DDL);

  const rows = final.map(toInsert);
  const BATCH = 30;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await db.transaction(async (tx) => {
      await tx.insert(transactions).values(chunk);
    });
    process.stdout.write(`  inseridos ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`);
  }

  const result = await db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM transactions`);
  console.log(`\nConcluído. ${result[0]?.n ?? 0} transações no banco (data/itbi.db).`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});