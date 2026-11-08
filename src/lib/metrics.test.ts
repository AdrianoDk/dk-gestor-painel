import { describe, expect, it } from "vitest";
import { calcRoyalty, validateRange } from "./metrics";

describe("pdescribe("período limitado a 31 dias", () => {
  it("aceita exatamente 31 dias incluindo as duas datas", () => {
    expect(validateRange("2026-10-01", "2026-10-31")).toBeNull();
  });
  it("recusa 32 dias", () => {
    expect(validateRange("2026-10-01", "2026-11-01")).toContain("31 dias");
  });
  it("recusa data inicial depois da final", () => {
    expect(validateRange("2026-11-05", "2026-11-01")).not.toBeNull();
  });
});

oyalties", () => {
  it("percentual sobre recebido mais taxa fixa", () => {
    expect(calcRoyalty({ recebido: 10000, despesas: 4000, percentual: 8, taxaFixa: 500, base: "recebido" }).total).toBe(1300);
  });
  it("percentual sobre líquido", () => {
    expect(calcRoyalty({ recebido: 10000, despesas: 4000, percentual: 10, taxaFixa: 0, base: "liquido" }).total).toBe(600);
  });
});
