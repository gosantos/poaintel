import { createHash } from "node:crypto";

export function norm(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function slugify(s: string): string {
  return norm(s).toLowerCase().replace(/\s+/g, "-");
}

export function tier(year: number | null): string {
  if (!year) return "?";
  if (year < 1950) return "pre-1950";
  if (year <= 1969) return "A";
  if (year <= 1989) return "B";
  if (year <= 2009) return "C";
  return "D";
}

export function tierLabel(t: string): string {
  switch (t) {
    case "pre-1950":
      return "Pré-1950";
    case "A":
      return "1950–69";
    case "B":
      return "1970–89";
    case "C":
      return "1990–2009";
    case "D":
      return "2010+";
    default:
      return t;
  }
}

export function band(area: number): string {
  if (area < 50) return "S";
  if (area < 90) return "M";
  if (area < 150) return "L";
  return "XL";
}

export function bandLabel(b: string): string {
  switch (b) {
    case "S":
      return "< 50 m²";
    case "M":
      return "50–89 m²";
    case "L":
      return "90–149 m²";
    case "XL":
      return "≥ 150 m²";
    default:
      return b;
  }
}

export function uid(v: string): number {
  return Number(createHash("md5").update(v).digest("hex").slice(0, 12)) % 0xffffffff;
}