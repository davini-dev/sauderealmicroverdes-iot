import type { Stats } from "@/lib/types";

function Card({
  label,
  value,
  sub,
  accentClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accentClass?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3.5">
      <p className="text-xs text-ink-muted mb-1.5">{label}</p>
      <p className={`font-display text-2xl tabular-nums ${accentClass ?? "text-ink"}`}>{value}</p>
      {sub && <p className="text-xs text-ink-faint mt-1">{sub}</p>}
    </div>
  );
}

export function StatCards({ stats }: { stats: Stats }) {
  const b = stats.breakdown;
  const total = (stats.comparativo.atual.total ?? 0) as number;

  const novo = b.tipo_paciente?.novo ?? 0;
  const retorno = b.tipo_paciente?.retorno ?? 0;
  const convenio = b.tipo_pagamento?.convenio ?? 0;
  const particular = b.tipo_pagamento?.particular ?? 0;
  const interesseSim = b.interesse_agendamento?.true ?? 0;
  const interessePct = total > 0 ? Math.round((interesseSim / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card label="Total no período" value={total} accentClass="text-ink" />
      <Card label="Pacientes novos" value={novo} accentClass="text-novo" />
      <Card label="Retorno" value={retorno} accentClass="text-retorno" />
      <Card label="Convênio" value={convenio} accentClass="text-accent" />
      <Card label="Particular" value={particular} accentClass="text-ink" />
      <Card
        label="Interesse em agendar"
        value={`${interessePct}%`}
        sub={`${interesseSim} de ${total}`}
        accentClass="text-positive"
      />
    </div>
  );
}
