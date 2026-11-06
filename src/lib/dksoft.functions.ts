import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://dkapi.dksoft.com.br";

export type UnitSummary = {
  nome: string;
  recebido: number;
  despesas: number;
  matriculas: number;
  cancelamentos: number;
  alunosAtivos: number;
};

const schema = z.object({
  token: z.string().min(4).max(500),
  chunks: z
    .array(z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .min(1)
    .max(13),
  start: z.string(),
  end: z.string(),
});

export const fetchUnitSummary = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => schema.parse(i))
  .handler(async ({ data }): Promise<UnitSummary> => {
    const headers = { Authorization: `Bearer ${data.token}`, Accept: "application/json" };
    const get = async (path: string) => {
      let r: Response;
      try {
        r = await fetch(BASE + path, { headers, signal: AbortSignal.timeout(25000) });
      } catch {
        throw new Error("Servidor da DKSOFT não respondeu. Tente novamente em instantes.");
      }
      if (!r.ok) {
        let msg = `Erro ${r.status}`;
        try {
          const j = (await r.json()) as { mensagem?: string };
          if (j.mensagem) msg = j.mensagem;
        } catch {}
        throw new Error(msg);
      }
      return r.json() as Promise<any>;
    };

    const empresa = await get("/api/v1/empresa");
    let recebido = 0;
    let despesas = 0;
    for (const c of data.chunks) {
      const q = `?data_inicial=${c.start}&data_final=${c.end}`;
      const [rec, pag] = await Promise.all([
        get("/api/v1/financeiro/contas-recebidas" + q),
        get("/api/v1/financeiro/contas-pagas" + q),
      ]);
      for (const x of rec.registros ?? []) recebido += Number(x.valor_pago) || 0;
      for (const x of pag.registros ?? []) despesas += Number(x.valor_pago) || 0;
    }

    // Lista completa de alunos (cadastro desde 2000) para contar ativos e novos no período
    let offset = 0;
    let alunosAtivos = 0;
    let matriculas = 0;
    let cancelamentos = 0;
    const hoje = new Date().toISOString().slice(0, 10);
    for (let page = 0; page < 40; page++) {
      const r = await get(`/api/v1/alunos?data_inicial=2000-01-01&data_final=${hoje}&limite=500&offset=${offset}`);
      for (const a of r.alunos ?? []) {
        const ativo = a.situacao === "A";
        if (ativo) alunosAtivos++;
        const novo = a.data_cadastro >= data.start && a.data_cadastro <= data.end;
        if (novo) matriculas++;
        if (novo && !ativo) cancelamentos++;
      }
      if (!r.tem_mais) break;
      offset += 500;
    }

    return {
      nome: empresa.nome_fantasia ?? "Unidade",
      recebido,
      despesas,
      matriculas,
      cancelamentos,
      alunosAtivos,
    };
  });
