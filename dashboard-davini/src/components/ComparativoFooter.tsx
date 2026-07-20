import type { Stats } from "@/lib/types";

function delta(atual: number, anterior: number): { pct: number | null; up: boolean } {
  if (anterior === 0) return { pct: atual > 0 ? 100 : null, up: atual > 0 };
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  return { pct, up: pct >= 0 };
}

function Metric({
  label,
  value,
  deltaPct,
  deltaUp,
  invertColor = false,
}: {
  label: string;
  value: string;
  deltaPct: number | null;
  deltaUp: boolean;
  invertColor?: boolean;
}) {
  const positive = invertColor ? !deltaUp : deltaUp;
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50 mb-1">{label}</p>
      <p className="font-display text-2xl text-white tabular-nums">
        {value}
        {deltaPct !== null && (
          <span className={`font-sans text-sm ml-2 ${positive ? "text-emerald-400" : "text-rose-400"}`}>
            {deltaUp ? "↑" : "↓"} {Math.abs(deltaPct)}%
          </span>
        )}
      </p>
    </div>
  );
}

export function ComparativoFooter({ stats }: { stats: Stats }) {
  const { atual, anterior, periodo_anterior } = stats.comparativo;
  const totalDelta = delta(atual.total, anterior.total);

  const interesseAtualPct = atual.total > 0 ? Math.round((atual.interesse / atual.total) * 100) : 0;
  const interesseAnteriorPct =
    anterior.total > 0 ? Math.round((anterior.interesse / anterior.total) * 100) : 0;
  const interesseDelta = delta(interesseAtualPct, interesseAnteriorPct);

  return (
    <div className="rounded-xl bg-ink px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <Metric label="Total de atendimentos" value={String(atual.total)} deltaPct={totalDelta.pct} deltaUp={totalDelta.up} />
        <Metric
          label="Interesse em agendar"
          value={`${interesseAtualPct}%`}
          deltaPct={interesseDelta.pct}
          deltaUp={interesseDelta.up}
        />
        <Metric label="Precisa de atenção" value={String(stats.precisa_atencao)} deltaPct={null} deltaUp={false} />
        <Metric label="Urgentes" value={String(stats.breakdown?.urgencia?.urgente ?? 0)} deltaPct={null} deltaUp={false} />
        <p className="font-mono text-[11px] text-white/40">
          vs. {periodo_anterior.data_inicio.split("-").reverse().slice(0, 2).join("/")} –{" "}
          {periodo_anterior.data_fim.split("-").reverse().slice(0, 2).join("/")}
        </p>
      </div>
    </div>
  );
}
