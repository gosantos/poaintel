import { client } from "../db/client";
import { TRANSACTIONS_DDL } from "../db/ddl";

async function main() {
  await client.executeMultiple(TRANSACTIONS_DDL);
  console.log("Migração concluída: schema transactions pronto.");
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});