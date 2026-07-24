"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatDataHora, STATUS_ATENDIMENTO_LABEL } from "@/lib/labels";
import type { Atendimento, Comentario, Mensagem } from "@/lib/types";

function HistoricoTab({ resumoConversa }: { resumoConversa: string | null }) {
  if (!resumoConversa) {
    return <p className="text-sm text-ink-faint">Sem resumo de conversa registrado.</p>;
  }
  return <p className="text-sm text-ink-muted whitespace-pre-line leading-relaxed">{resumoConversa}</p>;
}

function ChatTab({ atendimentoId }: { atendimentoId: number }) {
  const { data, isLoading, mutate } = useSWR<{ data: Mensagem[] }>(
    `/api/atendimentos/${atendimentoId}/mensagens`,
    fetcher,
    { refreshInterval: 5000 }
  );
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/atendimentos/${atendimentoId}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: texto, autor: "Michele" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErro(body.error || "Não consegui enviar a mensagem");
        return;
      }
      setTexto("");
      mutate();
    } catch {
      setErro("Falha de conexão ao enviar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {isLoading && <p className="text-sm text-ink-faint">Carregando…</p>}
        {data && data.data.length === 0 && (
          <p className="text-sm text-ink-faint">Nenhuma mensagem ainda.</p>
        )}
        {data?.data.map((m) => (
          <div key={m.id} className={`flex ${m.direcao === "enviada" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.direcao === "enviada" ? "bg-accent text-white" : "bg-surface border border-border text-ink"
              }`}
            >
              <p className="whitespace-pre-line">{m.mensagem}</p>
              <p
                className={`text-[10px] mt-1 font-mono ${
                  m.direcao === "enviada" ? "text-white/70" : "text-ink-faint"
                }`}
              >
                {m.direcao === "enviada" ? m.autor || "Lia" : m.autor || "Paciente"} ·{" "}
                {formatDataHora(m.criado_em)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {erro && <p className="text-sm text-alert-ink bg-alert-soft rounded-lg px-3 py-2">{erro}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Mandar mensagem pro paciente pelo WhatsApp…"
          className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="rounded-lg bg-accent text-white text-sm font-medium px-4 py-1.5 hover:bg-accent-ink transition-colors disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </form>
      <p className="text-[11px] text-ink-faint">
        Vai direto pro WhatsApp do paciente — o bot para de responder automaticamente por 2h, sem
        precisar digitar #humano.
      </p>
    </div>
  );
}

export function ComentariosPanel({
  atendimento,
  onAtendimentoChanged,
}: {
  atendimento: Atendimento;
  onAtendimentoChanged: () => void;
}) {
  const [aba, setAba] = useState<"historico" | "chat">("historico");

  const { data, isLoading, mutate } = useSWR<{ data: Comentario[] }>(
    `/api/atendimentos/${atendimento.id}/comentarios`,
    fetcher
  );
  const [autor, setAutor] = useState("Michele");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [prontmed, setProntmed] = useState(atendimento.prontmed_confirmado);
  const [status, setStatus] = useState(atendimento.status_atendimento);
  const [salvandoCampo, setSalvandoCampo] = useState(false);

  async function patchAtendimento(payload: Record<string, unknown>) {
    setSalvandoCampo(true);
    try {
      await fetch(`/api/atendimentos/${atendimento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onAtendimentoChanged();
    } finally {
      setSalvandoCampo(false);
    }
  }

  async function handleSubmitComentario(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await fetch(`/api/atendimentos/${atendimento.id}/comentarios`, {
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
      {atendimento.consulta_confirmada && (
        <label className="flex items-center gap-2 text-sm text-ink bg-accent-soft border border-accent/20 rounded-lg px-3 py-2 w-fit cursor-pointer">
          <input
            type="checkbox"
            checked={prontmed}
            disabled={salvandoCampo}
            onChange={(e) => {
              setProntmed(e.target.checked);
              patchAtendimento({ prontmed_confirmado: e.target.checked });
            }}
            className="accent-accent w-4 h-4"
          />
          <span className="font-medium">ProntMed</span>
          <span className="text-ink-muted">— já registrei essa consulta no ProntMed</span>
        </label>
      )}

      <div>
        <div className="flex gap-1 border-b border-border mb-3">
          <button
            onClick={() => setAba("historico")}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === "historico"
                ? "border-accent text-accent-ink"
                : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            Histórico
          </button>
          <button
            onClick={() => setAba("chat")}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === "chat"
                ? "border-accent text-accent-ink"
                : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            Chat
          </button>
        </div>

        {aba === "historico" ? (
          <HistoricoTab resumoConversa={atendimento.resumo_conversa} />
        ) : (
          <ChatTab atendimentoId={atendimento.id} />
        )}
      </div>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-1.5">
          Anotações
        </p>

        {isLoading && <p className="text-sm text-ink-faint">Carregando…</p>}
        {data && data.data.length === 0 && <p className="text-sm text-ink-faint">Nenhuma anotação ainda.</p>}

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

        <form onSubmit={handleSubmitComentario} className="flex flex-col sm:flex-row gap-2">
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

      <div className="flex items-center gap-2 pt-1">
        <label className="text-xs text-ink-faint font-mono uppercase tracking-[0.18em]">
          Status do atendimento
        </label>
        <select
          value={status}
          disabled={salvandoCampo}
          onChange={(e) => {
            const novo = e.target.value as typeof status;
            setStatus(novo);
            patchAtendimento({ status_atendimento: novo });
          }}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {Object.entries(STATUS_ATENDIMENTO_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
