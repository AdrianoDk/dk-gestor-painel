export type Preset = "hoje" | "custom";

export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string) {
  const [y = 1970, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export const MAX_DAYS = 31;

/** Quantidade de dias corridos, incluindo as duas datas. */
export function daysInclusive(start: string, end: string) {
  return Math.round((parseISO(end).getTime() - parseISO(start).getTime()) / 86400000) + 1;
}

export function validateRange(start: string, end: string): string | null {
  if (!start || !end || start > end) return "A data inicial deve ser antes da data final.";
  if (daysInclusive(start, end) > MAX_DAYS) return `Filtre no máximo ${MAX_DAYS} dias por vez.`;
  return null;
}

export type RoyaltyBase = "recebido" | "liquido";

export function calcRoyalty(opts: {
  recebido: number;
  despesas: number;
  percentual: number;
  taxaFixa: number;
  base: RoyaltyBase;
}) {
  const baseValor =
    opts.base === "recebido" ? opts.recebido : Math.max(0, opts.recebido - opts.despesas);
  const variavel = (baseValor * opts.percentual) / 100;
  return { baseValor, variavel, total: variavel + opts.taxaFixa };
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
