import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const url = process.env.DATABASE_URL ?? "file:data/itbi.db";

if (url.startsWith("file:")) {
  const path = url.slice("file:".length);
  if (!path.startsWith(":")) {
    mkdirSync(dirname(path), { recursive: true });
  }
}

export const client = createClient({ url });

export const db = drizzle(client);