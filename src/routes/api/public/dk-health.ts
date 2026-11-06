import { createFileRoute } from "@tanstack/react-router";

// Diagnóstico: verifica se o servidor alcança a API DKSOFT (rota pública, sem token).
export const Route = createFileRoute("/api/public/dk-health")({
  server: {
    handlers: {
      GET: async () => {
        const t = Date.now();
        try {
          const r = await fetch("https://dkapi.dksoft.com.br/api/v1/health", {
            signal: AbortSignal.timeout(15000),
          });
          return Response.json({ ok: r.ok, status: r.status, ms: Date.now() - t });
        } catch (e) {
          return Response.json({ ok: false, erro: String(e), ms: Date.now() - t }, { status: 502 });
        }
      },
    },
  },
});
