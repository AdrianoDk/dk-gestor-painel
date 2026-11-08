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
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    const q = `?data_inicial=${data.start}&data_final=${data.end}`;
    const [rec, pag, mat, can] = await Promise.all([
      get("/api/v1/financeiro/contas-recebidas" + q),
      get("/api/v1/financeiro/contas-pagas" + q),
      get("/api/v1/matriculas/periodo" + q),
      get("/api/v1/cancelamentos/periodo" + q),
    ]);
    let recebido = 0;
    let despesas = 0;
    for (const x of rec.registros ?? []) recebido += Number(x.valor_pago) || 0;
    for (const x of pag.registros ?? []) despesas += Number(x.valor_pago) || 0;
    const matriculas = Number(mat.total_matriculas ?? mat.matriculas?.length ?? 0);
    const cancelamentos = Number(can.total_cancelamentos ?? can.cancelamentos?.length ?? 0);

    // Alunos ativos: lista completa de alunos cadastrados
    let offset = 0;
    let alunosAtivos = 0;
    const hoje = new Date().toISOString().slice(0, 10);
    for (let page = 0; page < 40; page++) {
      const r = await get(`/api/v1/alunos?data_inicial=2000-01-01&data_final=${hoje}&limite=500&offset=${offset}`);
      for (const a of r.alunos ?? []) if (a.situacao === "A") alunosAtivos++;
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
