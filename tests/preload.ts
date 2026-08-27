import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = join(tmpdir(), `itbi-test-${process.pid}`);
mkdirSync(dir, { recursive: true });
process.env.DATABASE_URL = `file:${join(dir, "itbi.db")}`;
