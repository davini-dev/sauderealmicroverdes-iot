import type { Stats } from "@/lib/types";

export function AlertStrip({ stats }: { stats: Stats }) {
  const urgentes = stats.breakdown?.urgencia?.urgente ?? 0;
  const precisaAtencao = stats.precisa_atencao;

  if (precisaAtencao === 0 && urgentes === 0) {
    return (
      <div className="rounded-xl border border-positive/25 bg-positive-soft px-5 py-4 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-positive shrink-0" />
        <p className="text-sm text-ink">
          Nenhum atendimento pendente de atenção no período. Tudo classificado e sem casos urgentes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-alert/25 bg-alert-soft overflow-hidden">
      <div className="px-5 py-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-alert-ink/70 mb-1">
            Precisa de atenção
          </p>
          <p className="font-display text-3xl text-alert-ink">
            {precisaAtencao}{" "}
            <span className="font-sans text-base font-normal text-alert-ink/80">
              paciente{precisaAtencao === 1 ? "" : "s"} quer{precisaAtencao === 1 ? "" : "em"} agendar e
              ainda não informou{precisaAtencao === 1 ? "" : "ram"} convênio ou particular
            </span>
          </p>
        </div>
        {urgentes > 0 && (
          <div className="text-right">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-alert-ink/70 mb-1">
              Urgentes
            </p>
            <p className="font-display text-3xl text-alert-ink tabular-nums">{urgentes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
