const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const brlPrecise = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const num0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function money(n: number): string {
  return brl.format(n);
}

export function moneyPrecise(n: number): string {
  return brlPrecise.format(n);
}

export function rsm2(n: number): string {
  return `${num0.format(n)}/m²`;
}

export function formatNumber(n: number): string {
  return num0.format(n);
}

export function formatPct(n: number, digits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: "always",
  }).format(n / 100);
}

export function formatArea(n: number): string {
  return `${num1.format(n)} m²`;
}

export function shortDate(iso: string): string {
  const m = iso.slice(5, 7);
  const y = iso.slice(0, 4);
  return `${m}/${y}`;
}

export function fullDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function compact(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}