"use client";

import { useRouter } from "next/navigation";

const PRESETS = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 14 dias", days: 14 },
  { label: "Últimos 30 dias", days: 30 },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function TopBar({
  dataInicio,
  dataFim,
  onChangePeriodo,
  atualizadoEm,
}: {
  dataInicio: string;
  dataFim: string;
  onChangePeriodo: (inicio: string, fim: string) => void;
  atualizadoEm: Date | null;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function applyPreset(days: number) {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - (days - 1));
    onChangePeriodo(toDateStr(inicio), toDateStr(fim));
  }

  return (
    <div className="border-b border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-1">
            Clínica Médica Dra. Elaine Davini
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-ink">
            Atendimentos
            <span className="text-ink-faint font-sans text-base ml-3 font-normal">
              {dataInicio.split("-").reverse().slice(0, 2).join("/")} —{" "}
              {dataFim.split("-").reverse().slice(0, 2).join("/")}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {atualizadoEm && (
            <span className="font-mono text-xs text-ink-faint hidden sm:inline">
              atualizado às{" "}
              {atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <div className="flex rounded-lg border border-border-strong overflow-hidden text-sm">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className="px-3 py-1.5 hover:bg-accent-soft transition-colors border-r border-border-strong last:border-r-0 text-ink-muted hover:text-accent-ink"
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-ink-faint hover:text-ink transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
