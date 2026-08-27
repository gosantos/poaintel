import { norm } from "./data";

const STREET_PREFIX =
  /^(RUA|AVENIDA|AV|TRAVESSA|PRACA|LARGO|BECO|ALAMEDA|ESTRADA|RODOVIA|TV|PCA|PC|R)\s+/;
const STOP = new Set(["DE", "DA", "DO", "DAS", "DOS", "E", "A", "O"]);

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let short = a;
  let long = b;
  if (a.length > b.length) {
    short = b;
    long = a;
  }
  const prev = new Uint16Array(short.length + 1);
  const cur = new Uint16Array(short.length + 1);
  for (let i = 0; i <= short.length; i++) prev[i] = i;
  for (let j = 1; j <= long.length; j++) {
    cur[0] = j;
    for (let i = 1; i <= short.length; i++) {
      const cost = short[i - 1] === long[j - 1] ? 0 : 1;
      cur[i] = Math.min(prev[i] + 1, cur[i - 1] + 1, prev[i - 1] + cost);
    }
    prev.set(cur);
  }
  return prev[short.length];
}

export function streetCore(s: string): string {
  return STREET_PREFIX.test(s) ? s.replace(STREET_PREFIX, "") : s;
}

function tokens(s: string): string[] {
  return s.split(/\s+/).filter((t) => t.length >= 2 && !STOP.has(t));
}

function tokenMaxDist(t: string): number {
  if (t.length < 4) return 0;
  if (t.length <= 6) return 1;
  if (t.length <= 10) return 2;
  return 3;
}

export type MatchMethod = "exact" | "contains" | "fuzzy";

export interface StreetHit {
  logradouroNorm: string;
  distance: number;
  method: MatchMethod;
}

export function matchStreets(
  query: string,
  streets: string[],
  limit = 12,
): StreetHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const qCore = streetCore(q);
  const qTokens = tokens(qCore);
  const usableTokens =
    qTokens.length > 0 ? qTokens : qCore.length >= 3 ? [qCore] : [];

  const hits: StreetHit[] = [];
  for (const s of streets) {
    const core = streetCore(s);
    if (s === q || core === qCore) {
      hits.push({ logradouroNorm: s, distance: 0, method: "exact" });
      continue;
    }
    if (s.includes(q) || (qCore.length >= 3 && core.includes(qCore))) {
      hits.push({ logradouroNorm: s, distance: 0.4, method: "contains" });
      continue;
    }
    if (usableTokens.length === 0) continue;

    const sTokens = tokens(core);
    if (sTokens.length === 0) continue;

    let total = 0;
    let ok = true;
    for (const qt of usableTokens) {
      const maxD = tokenMaxDist(qt);
      let best = Infinity;
      for (const st of sTokens) {
        if (st === qt || st.includes(qt) || qt.includes(st)) {
          best = 0;
          break;
        }
        if (maxD === 0) continue;
        const d = levenshtein(qt, st);
        if (d < best) best = d;
      }
      if (best > maxD) {
        ok = false;
        break;
      }
      total += best;
    }
    if (ok) {
      hits.push({
        logradouroNorm: s,
        distance: 1 + total,
        method: "fuzzy",
      });
    }
  }

  hits.sort(
    (a, b) =>
      a.distance - b.distance ||
      a.logradouroNorm.length - b.logradouroNorm.length,
  );

  const hasPrecise = hits.some(
    (h) => h.method === "exact" || h.method === "contains",
  );
  const filtered = hasPrecise
    ? hits.filter((h) => h.method !== "fuzzy" || h.distance <= 1.5)
    : hits;

  return filtered.slice(0, limit);
}
