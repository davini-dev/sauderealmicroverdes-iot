import { formatData } from "@/lib/labels";
import type { Stats } from "@/lib/types";

export function WeeklyBars({ stats }: { stats: Stats }) {
  const dias = stats.por_dia;
  const max = Math.max(1, ...dias.map((d) => d.qtd));

  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3.5">
      <p className="text-xs text-ink-muted mb-3">Atendimentos por dia</p>
      <div className="flex items-stretch gap-2 h-28">
        {dias.length === 0 && <p className="text-xs text-ink-faint self-center">Sem dados no período</p>}
        {dias.map((d) => (
          <div key={d.data} className="flex-1 flex flex-col items-center">
            <div className="flex-1 w-full flex flex-col justify-end items-center">
              <span className="font-mono text-[11px] text-ink-muted tabular-nums mb-1">{d.qtd}</span>
              <div
                className="w-full rounded-t bg-accent/80 min-h-[3px] transition-all"
                style={{ height: `${Math.max(3, (d.qtd / max) * 100)}%` }}
                title={`${d.qtd} atendimento${d.qtd === 1 ? "" : "s"}`}
              />
            </div>
            <span className="font-mono text-[10px] text-ink-faint mt-1.5">{formatData(d.data)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
