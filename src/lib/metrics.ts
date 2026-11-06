export type Preset = "hoje" | "semana" | "25dias" | "custom";

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

/** Hoje = só hoje; Última semana = 7 dias incluindo hoje; Últimos 25 dias = 25 dias incluindo hoje. */
export function presetRange(p: Exclude<Preset, "custom">, today = new Date()) {
  const end = toISO(today);
  if (p === "hoje") return { start: end, end };
  if (p === "semana") return { start: toISO(addDays(today, -6)), end };
  return { start: toISO(addDays(today, -24)), end };
}

/** Divide o período em blocos de no máximo 31 dias (limite da API). */
export function splitPeriod(start: string, end: string, maxDays = 31) {
  const out: { start: string; end: string }[] = [];
  let cur = parseISO(start);
  const last = parseISO(end);
  while (cur <= last) {
    let chunkEnd = addDays(cur, maxDays - 1);
    if (chunkEnd > last) chunkEnd = last;
    out.push({ start: toISO(cur), end: toISO(chunkEnd) });
    cur = addDays(chunkEnd, 1);
  }
  return out;
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
