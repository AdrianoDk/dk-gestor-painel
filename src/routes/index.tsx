import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Building2, Calculator, KeyRound, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp,
  UserMinus, UserPlus, Users, Trophy, X, Eye, EyeOff,
} from "lucide-react";
import { fetchUnitSummary, type UnitSummary } from "@/lib/dksoft.functions";
import { brl, calcRoyalty, presetRange, splitPeriod, type Preset, type RoyaltyBase } from "@/lib/metrics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dk Gestor Franquias — Painel do franqueador" },
      { name: "description", content: "Acompanhe recebimentos, despesas, matrículas e ranking das unidades da sua franquia." },
      { property: "og:title", content: "Dk Gestor Franquias" },
      { property: "og:description", content: "Painel do franqueador com ranking das unidades e calculadora de royalties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Unit = { id: string; apelido: string; token: string };
type Result = { status: "loading" } | { status: "ok"; data: UnitSummary } | { status: "error"; msg: string };
type Metric = "recebido" | "liquido" | "matriculas" | "alunosAtivos" | "cancelamentos";

const STORE = "dk-gestor-unidades";
const METRICS: { key: Metric; label: string }[] = [
  { key: "recebido", label: "Recebido" },
  { key: "liquido", label: "Resultado" },
  { key: "matriculas", label: "Matrículas" },
  { key: "alunosAtivos", label: "Alunos" },
  { key: "cancelamentos", label: "Menos cancel." },
];

function metricValue(d: UnitSummary, m: Metric) {
  if (m === "liquido") return d.recebido - d.despesas;
  if (m === "cancelamentos") return -d.cancelamentos;
  return d[m];
}

function Dashboard() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [preset, setPreset] = useState<Preset>("hoje");
  const [custom, setCustom] = useState(() => presetRange("semana"));
  const [results, setResults] = useState<Record<string, Result>>({});
  const [metric, setMetric] = useState<Metric>("recebido");
  const [selected, setSelected] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem(STORE) || "[]") as Unit[];
      setUnits(u);
      if (u.length === 0) setShowTokens(true);
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(STORE, JSON.stringify(units));
  }, [units, loaded]);

  const range = preset === "custom" ? custom : presetRange(preset);
  const rangeValid = range.start <= range.end && splitPeriod(range.start, range.end).length <= 13;

  async function load() {
    if (!rangeValid) return;
    const chunks = splitPeriod(range.start, range.end);
    setResults(Object.fromEntries(units.map((u) => [u.id, { status: "loading" } as Result])));
    // até 2 unidades em paralelo para respeitar o limite da API
    const queue = [...units];
    const worker = async () => {
      while (queue.length) {
        const u = queue.shift()!;
        try {
          const data = await fetchUnitSummary({ data: { token: u.token, chunks, start: range.start, end: range.end } });
          setResults((r) => ({ ...r, [u.id]: { status: "ok", data } }));
        } catch (e) {
          setResults((r) => ({ ...r, [u.id]: { status: "error", msg: e instanceof Error ? e.message : "Falha" } }));
        }
      }
    };
    await Promise.all([worker(), worker()]);
  }

  useEffect(() => {
    if (loaded && units.length) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, units.length, range.start, range.end]);

  const okUnits = units
    .map((u) => ({ u, r: results[u.id] }))
    .filter((x): x is { u: Unit; r: { status: "ok"; data: UnitSummary } } => x.r?.status === "ok");

  const totals = okUnits.reduce(
    (t, { r }) => ({
      recebido: t.recebido + r.data.recebido,
      despesas: t.despesas + r.data.despesas,
      matriculas: t.matriculas + r.data.matriculas,
      cancelamentos: t.cancelamentos + r.data.cancelamentos,
      alunosAtivos: t.alunosAtivos + r.data.alunosAtivos,
    }),
    { recebido: 0, despesas: 0, matriculas: 0, cancelamentos: 0, alunosAtivos: 0 },
  );

  const ranking = useMemo(
    () => [...okUnits].sort((a, b) => metricValue(b.r.data, metric) - metricValue(a.r.data, metric)),
    [okUnits, metric],
  );

  const loading = units.some((u) => results[u.id]?.status === "loading");
  const selUnit = units.find((u) => u.id === selected) ?? null;
  const selRes = selUnit ? results[selUnit.id] : undefined;
  const fmtDate = (s: string) => s.split("-").reverse().join("/");

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight sm:text-xl">Dk Gestor Franquias</h1>
              <p className="text-xs opacity-80">{units.length} unidade(s) · {fmtDate(range.start)} a {fmtDate(range.end)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading || !units.length} className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground/15 px-3 py-2 text-sm font-medium hover:bg-primary-foreground/25 disabled:opacity-50">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button onClick={() => setShowTokens(true)} className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90">
              <KeyRound className="size-4" /> Unidades
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {([["hoje", "Hoje"], ["semana", "Última semana"], ["25dias", "Últimos 25 dias"], ["custom", "Período"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setPreset(k)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${preset === k ? "bg-primary-foreground text-primary" : "bg-primary-foreground/10 hover:bg-primary-foreground/20"}`}>
                {l}
              </button>
            ))}
            {preset === "custom" && (
              <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1">
                <input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="bg-transparent text-sm outline-none [color-scheme:dark]" />
                <span className="text-xs opacity-70">até</span>
                <input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="bg-transparent text-sm outline-none [color-scheme:dark]" />
              </div>
            )}
          </div>
          {!rangeValid && <p className="mt-2 text-sm text-accent">Período inválido (máximo de 1 ano e data inicial antes da final).</p>}
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Kpi icon={TrendingUp} label="Recebido" value={brl(totals.recebido)} tone="text-success" />
            <Kpi icon={TrendingDown} label="Despesas" value={brl(totals.despesas)} tone="text-destructive" />
            <Kpi icon={UserPlus} label="Matrículas" value={totals.matriculas} tone="text-primary" />
            <Kpi icon={UserMinus} label="Cancelamentos" value={totals.cancelamentos} tone="text-destructive" />
            <Kpi icon={Users} label="Alunos ativos" value={totals.alunosAtivos} tone="text-primary" />
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold"><Trophy className="size-5 text-gold" /> Ranking das unidades</h2>
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                {METRICS.map((m) => (
                  <button key={m.key} onClick={() => setMetric(m.key)} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${metric === m.key ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {units.length === 0 ? (
              <Empty onAdd={() => setShowTokens(true)} />
            ) : (
              <ol className="space-y-2">
                {ranking.map(({ u, r }, i) => {
                  const liq = r.data.recebido - r.data.despesas;
                  const medal = i === 0 ? "bg-gold" : i === 1 ? "bg-silver" : i === 2 ? "bg-bronze" : "bg-muted";
                  return (
                    <li key={u.id}>
                      <button onClick={() => setSelected(u.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary ${selected === u.id ? "border-primary bg-secondary" : "bg-card"}`}>
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${medal} ${i > 2 ? "text-muted-foreground" : "text-foreground"}`}>{i + 1}º</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{u.apelido || r.data.nome}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {brl(r.data.recebido)} recebido · {r.data.matriculas} matr. · {r.data.alunosAtivos} alunos
                          </p>
                        </div>
                        <span className={`hidden shrink-0 text-right text-sm font-semibold sm:block ${liq >= 0 ? "text-success" : "text-destructive"}`}>
                          {brl(liq)}
                          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">resultado</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {units.filter((u) => results[u.id]?.status !== "ok").map((u) => {
                  const r = results[u.id];
                  return (
                    <li key={u.id} className="flex items-center gap-3 rounded-xl border border-dashed p-3 text-sm">
                      <span className="grid size-9 place-items-center rounded-full bg-muted">
                        {r?.status === "loading" ? <RefreshCw className="size-4 animate-spin text-muted-foreground" /> : "–"}
                      </span>
                      <span className="flex-1 font-medium">{u.apelido || "Unidade"}</span>
                      <span className={r?.status === "error" ? "text-destructive" : "text-muted-foreground"}>
                        {r?.status === "error" ? r.msg : "Carregando…"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <UnitPanel units={units} selected={selected} setSelected={setSelected} unit={selUnit} res={selRes} />
          <RoyaltyCalc data={selRes?.status === "ok" ? selRes.data : totals} label={selUnit && selRes?.status === "ok" ? (selUnit.apelido || selRes.data.nome) : "Todas as unidades"} />
        </aside>
      </main>

      {showTokens && <TokenManager units={units} setUnits={setUnits} onClose={() => setShowTokens(false)} />}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className={`size-4 ${tone}`} /> {label}
      </div>
      <p className="mt-2 truncate font-display text-lg font-semibold sm:text-xl">{value}</p>
    </div>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <KeyRound className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 font-medium">Nenhuma unidade cadastrada</p>
      <p className="text-sm text-muted-foreground">Adicione o token de cada unidade para começar.</p>
      <button onClick={onAdd} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Adicionar unidade</button>
    </div>
  );
}

function UnitPanel({ units, selected, setSelected, unit, res }: {
  units: Unit[]; selected: string | null; setSelected: (s: string | null) => void; unit: Unit | null; res?: Result;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Building2 className="size-5 text-primary" /> Dados da unidade</h2>
      <select value={selected ?? ""} onChange={(e) => setSelected(e.target.value || null)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="">Selecione uma unidade…</option>
        {units.map((u) => <option key={u.id} value={u.id}>{u.apelido || "Unidade sem nome"}</option>)}
      </select>
      {unit && res?.status === "ok" && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Row label="Nome no sistema" value={res.data.nome} wide />
          <Row label="Recebido" value={brl(res.data.recebido)} />
          <Row label="Despesas" value={brl(res.data.despesas)} />
          <Row label="Resultado" value={brl(res.data.recebido - res.data.despesas)} />
          <Row label="Matrículas" value={res.data.matriculas} />
          <Row label="Cancelamentos" value={res.data.cancelamentos} />
          <Row label="Alunos ativos" value={res.data.alunosAtivos} />
        </dl>
      )}
      {unit && res?.status === "loading" && <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>}
      {unit && res?.status === "error" && <p className="mt-4 text-sm text-destructive">{res.msg}</p>}
      {!unit && <p className="mt-3 text-sm text-muted-foreground">Toque numa unidade do ranking para ver os detalhes.</p>}
    </div>
  );
}

function Row({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-muted p-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold">{value}</dd>
    </div>
  );
}

function RoyaltyCalc({ data, label }: { data: { recebido: number; despesas: number }; label: string }) {
  const [percentual, setPercentual] = useState(8);
  const [taxaFixa, setTaxaFixa] = useState(0);
  const [base, setBase] = useState<RoyaltyBase>("recebido");
  const r = calcRoyalty({ ...data, percentual, taxaFixa, base });
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold"><Calculator className="size-5 text-accent" /> Calculadora de royalties</h2>
      <p className="mb-4 text-xs text-muted-foreground">{label}</p>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {([["recebido", "Sobre recebido"], ["liquido", "Sobre resultado"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setBase(k)} className={`rounded-md py-1.5 text-xs font-semibold ${base === k ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-muted-foreground">Percentual (%)
          <input type="number" min={0} step={0.5} value={percentual} onChange={(e) => setPercentual(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">Taxa fixa (R$)
          <input type="number" min={0} step={10} value={taxaFixa} onChange={(e) => setTaxaFixa(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
      </div>
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Base de cálculo</span><span>{brl(r.baseValor)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>{percentual}% da base</span><span>{brl(r.variavel)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Taxa fixa</span><span>{brl(taxaFixa)}</span></div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-hero p-4 text-primary-foreground">
        <span className="text-sm font-medium">Royalties a receber</span>
        <span className="font-display text-xl font-semibold">{brl(r.total)}</span>
      </div>
    </div>
  );
}

function TokenManager({ units, setUnits, onClose }: { units: Unit[]; setUnits: (u: Unit[]) => void; onClose: () => void }) {
  const [apelido, setApelido] = useState("");
  const [token, setToken] = useState("");
  const [reveal, setReveal] = useState(false);
  const add = () => {
    if (!token.trim()) return;
    setUnits([...units, { id: crypto.randomUUID(), apelido: apelido.trim(), token: token.trim() }]);
    setApelido("");
    setToken("");
  };
  const mask = (t: string) => (t.length > 8 ? `${t.slice(0, 4)}••••••${t.slice(-4)}` : "••••••");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 shadow-card sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tokens das unidades</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 hover:bg-muted"><X className="size-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Os tokens ficam salvos apenas neste aparelho e são usados só para consultar a DKSOFT.</p>
        <div className="space-y-2 rounded-xl bg-muted p-3">
          <input placeholder="Nome da unidade (opcional)" value={apelido} onChange={(e) => setApelido(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input placeholder="Token de integração" type={reveal ? "text" : "password"} value={token} onChange={(e) => setToken(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="w-full rounded-lg border bg-background px-3 py-2 pr-9 text-sm" autoComplete="off" />
              <button type="button" onClick={() => setReveal(!reveal)} className="absolute right-2 top-2 text-muted-foreground" aria-label="Mostrar token">
                {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <button onClick={add} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Adicionar</button>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {units.map((u) => (
            <li key={u.id} className="flex items-center gap-2 rounded-xl border p-3">
              <input value={u.apelido} placeholder="Unidade sem nome" onChange={(e) => setUnits(units.map((x) => (x.id === u.id ? { ...x, apelido: e.target.value } : x)))} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />
              <code className="text-xs text-muted-foreground">{mask(u.token)}</code>
              <button onClick={() => confirm("Remover esta unidade?") && setUnits(units.filter((x) => x.id !== u.id))} aria-label="Remover" className="rounded-lg p-1.5 text-destructive hover:bg-muted"><Trash2 className="size-4" /></button>
            </li>
          ))}
          {units.length === 0 && <li className="text-center text-sm text-muted-foreground">Nenhuma unidade ainda.</li>}
        </ul>
      </div>
    </div>
  );
}
