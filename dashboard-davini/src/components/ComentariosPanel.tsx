"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDataHora } from "@/lib/labels";
import type { Comentario } from "@/lib/types";

import { fetcher } from "@/lib/fetcher";

export function ComentariosPanel({
  atendimentoId,
  resumoConversa,
}: {
  atendimentoId: number;
  resumoConversa: string | null;
}) {
  const { data, isLoading, mutate } = useSWR<{ data: Comentario[] }>(
    `/api/atendimentos/${atendimentoId}/comentarios`,
    fetcher
  );
  const [autor, setAutor] = useState("Michele");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await fetch(`/api/atendimentos/${atendimentoId}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autor, comentario: texto }),
      });
      setTexto("");
      mutate();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="bg-bg border-t border-border px-5 py-4 space-y-4">
      {resumoConversa && (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-1.5">
            Resumo da conversa
          </p>
          <p className="text-sm text-ink-muted whitespace-pre-line leading-relaxed">{resumoConversa}</p>
        </div>
      )}

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-1.5">
          Anotações
        </p>

        {isLoading && <p className="text-sm text-ink-faint">Carregando…</p>}

        {data && data.data.length === 0 && (
          <p className="text-sm text-ink-faint">Nenhuma anotação ainda.</p>
        )}

        <ul className="space-y-2 mb-3">
          {data?.data.map((c) => (
            <li key={c.id} className="bg-surface border border-border rounded-lg px-3 py-2">
              <div className="flex items-baseline justify-between gap-3 mb-0.5">
                <span className="text-sm font-medium text-ink">{c.autor}</span>
                <span className="font-mono text-[11px] text-ink-faint">{formatDataHora(c.criado_em)}</span>
              </div>
              <p className="text-sm text-ink-muted whitespace-pre-line">{c.comentario}</p>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            placeholder="Seu nome"
            className="sm:w-32 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Adicionar anotação sobre esse atendimento…"
            className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="rounded-lg bg-accent text-white text-sm font-medium px-4 py-1.5 hover:bg-accent-ink transition-colors disabled:opacity-50"
          >
            {enviando ? "Salvando…" : "Adicionar"}
          </button>
        </form>
      </div>
    </div>
  );
}
