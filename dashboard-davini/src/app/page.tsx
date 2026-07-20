"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { TopBar } from "@/components/TopBar";
import { AlertStrip } from "@/components/AlertStrip";
import { StatCards } from "@/components/StatCards";
import { WeeklyBars } from "@/components/WeeklyBars";
import { ComparativoFooter } from "@/components/ComparativoFooter";
import { FilterBar, type Filtros } from "@/components/FilterBar";
import { AtendimentosTable } from "@/components/AtendimentosTable";
import type { AtendimentosResponse, Stats } from "@/lib/types";

import { fetcher } from "@/lib/fetcher";
const POLL_MS = 30_000;

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const FILTROS_VAZIOS: Filtros = {
  tipo_paciente: "",
  tipo_pagamento: "",
  motivo: "",
  urgencia: "",
  interesse: "",
  q: "",
};

export default function DashboardPage() {
  const [dataFim, setDataFim] = useState(() => toDateStr(new Date()));
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toDateStr(d);
  });
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [page, setPage] = useState(1);

  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  const statsUrl = `/api/atendimentos/stats?data_inicio=${dataInicio}&data_fim=${dataFim}`;
  const { data: stats, error: statsError } = useSWR<Stats>(statsUrl, fetcher, {
    refreshInterval: POLL_MS,
    onSuccess: () => setAtualizadoEm(new Date()),
  });

  const atendimentosUrl = useMemo(() => {
    const params = new URLSearchParams({
      data_inicio: dataInicio,
      data_fim: dataFim,
      page: String(page),
      pageSize: "25",
    });
    if (filtros.tipo_paciente) params.set("tipo_paciente", filtros.tipo_paciente);
    if (filtros.tipo_pagamento) params.set("tipo_pagamento", filtros.tipo_pagamento);
    if (filtros.motivo) params.set("motivo", filtros.motivo);
    if (filtros.urgencia) params.set("urgencia", filtros.urgencia);
    if (filtros.interesse) params.set("interesse", filtros.interesse);
    if (filtros.q) params.set("q", filtros.q);
    return `/api/atendimentos?${params.toString()}`;
  }, [dataInicio, dataFim, filtros, page]);

  const { data: atendimentosResp, error: atendimentosError, isLoading } = useSWR<AtendimentosResponse>(
    atendimentosUrl,
    fetcher,
    { refreshInterval: POLL_MS, keepPreviousData: true }
  );

  function handlePeriodo(inicio: string, fim: string) {
    setDataInicio(inicio);
    setDataFim(fim);
    setPage(1);
  }

  function handleFiltros(next: Filtros) {
    setFiltros(next);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-bg pb-10">
      <TopBar
        dataInicio={dataInicio}
        dataFim={dataFim}
        onChangePeriodo={handlePeriodo}
        atualizadoEm={atualizadoEm}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {(statsError || atendimentosError) && (
          <div className="rounded-xl border border-alert/25 bg-alert-soft px-4 py-3 text-sm text-alert-ink">
            Não consegui falar com o banco agora ({(statsError || atendimentosError)?.message}). Tentando de novo automaticamente…
          </div>
        )}

        {stats && <AlertStrip stats={stats} />}

        {stats && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 items-stretch">
            <div className="xl:col-span-3">
              <StatCards stats={stats} />
            </div>
            <WeeklyBars stats={stats} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterBar filtros={filtros} onChange={handleFiltros} />
        </div>

        <AtendimentosTable atendimentos={atendimentosResp?.data ?? []} loading={isLoading} />

        {atendimentosResp && atendimentosResp.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-border-strong text-ink-muted disabled:opacity-40 hover:bg-surface transition-colors"
            >
              Anterior
            </button>
            <span className="font-mono text-xs text-ink-faint">
              {page} de {atendimentosResp.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(atendimentosResp.totalPages, p + 1))}
              disabled={page >= atendimentosResp.totalPages}
              className="px-3 py-1.5 rounded-lg border border-border-strong text-ink-muted disabled:opacity-40 hover:bg-surface transition-colors"
            >
              Próxima
            </button>
          </div>
        )}

        {stats && <ComparativoFooter stats={stats} />}
      </div>
    </div>
  );
}
