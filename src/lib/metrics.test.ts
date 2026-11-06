import { describe, expect, it } from "vitest";
import { calcRoyalty, presetRange, splitPeriod } from "./metrics";

describe("períodos", () => {
  const today = new Date(2026, 10, 6);
  it("última semana cobre 7 dias incluindo hoje", () => {
    expect(presetRange("semana", today)).toEqual({ start: "2026-10-31", end: "2026-11-06" });
  });
  it("últimos 25 dias cobre 25 dias incluindo hoje", () => {
    expect(presetRange("25dias", today)).toEqual({ start: "2026-10-13", end: "2026-11-06" });
  });
  it("divide períodos acima de 31 dias", () => {
    expect(splitPeriod("2026-01-01", "2026-03-01")).toEqual([
      { start: "2026-01-01", end: "2026-01-31" },
      { start: "2026-02-01", end: "2026-03-01" },
    ]);
  });
});

describe("royalties", () => {
  it("percentual sobre recebido mais taxa fixa", () => {
    expect(calcRoyalty({ recebido: 10000, despesas: 4000, percentual: 8, taxaFixa: 500, base: "recebido" }).total).toBe(1300);
  });
  it("percentual sobre líquido", () => {
    expect(calcRoyalty({ recebido: 10000, despesas: 4000, percentual: 10, taxaFixa: 0, base: "liquido" }).total).toBe(600);
  });
});
