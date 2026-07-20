"use client";

import { Fragment, useState } from "react";
import {
  MOTIVO_LABEL,
  TIPO_PACIENTE_LABEL,
  TIPO_PACIENTE_STYLE,
  TIPO_PAGAMENTO_LABEL,
  TIPO_PAGAMENTO_STYLE,
  formatData,
  formatTelefone,
} from "@/lib/labels";
import type { Atendimento } from "@/lib/types";
import { ComentariosPanel } from "./ComentariosPanel";

function Tag({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function AtendimentosTable({
  atendimentos,
  loading,
}: {
  atendimentos: Atendimento[];
  loading: boolean;
}) {
  const [expandido, setExpandido] = useState<number | null>(null);

  if (loading && atendimentos.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl px-5 py-10 text-center text-sm text-ink-faint">
        Carregando atendimentos…
      </div>
    );
  }

  if (atendimentos.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl px-5 py-10 text-center text-sm text-ink-faint">
        Nenhum atendimento encontrado com esses filtros.
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-2.5 font-medium text-ink-faint text-xs uppercase tracking-wide">Data</th>
            <th className="px-4 py-2.5 font-medium text-ink-faint text-xs uppercase tracking-wide">Paciente</th>
            <th className="px-4 py-2.5 font-medium text-ink-faint text-xs uppercase tracking-wide hidden md:table-cell">
              Telefone
            </th>
            <th className="px-4 py-2.5 font-medium text-ink-faint text-xs uppercase tracking-wide">Tipo</th>
            <th className="px-4 py-2.5 font-medium text-ink-faint text-xs uppercase tracking-wide">Pagamento</th>
            <th className="px-4 py-2.5 font-medium text-ink-faint text-xs uppercase tracking-wide hidden lg:table-cell">
              Motivo
            </th>
            <th className="px-4 py-2.5 font-medium text-ink-faint text-xs uppercase tracking-wide text-center">
              Notas
            </th>
          </tr>
        </thead>
        <tbody>
          {atendimentos.map((a) => (
            <Fragment key={a.id}>
              <tr
                key={a.id}
                onClick={() => setExpandido(expandido === a.id ? null : a.id)}
                className={`border-b border-border last:border-b-0 cursor-pointer hover:bg-bg transition-colors ${
                  a.urgencia === "urgente" ? "bg-alert-soft/40" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                  {formatData(a.data_referencia)}
                </td>
                <td className="px-4 py-2.5 text-ink font-medium">
                  {a.nome_paciente || "—"}
                  {a.interesse_agendamento && (
                    <span className="ml-1.5 text-positive" title="Quer agendar">
                      ●
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-ink-muted hidden md:table-cell">
                  {formatTelefone(a.numero)}
                </td>
                <td className="px-4 py-2.5">
                  <Tag className={TIPO_PACIENTE_STYLE[a.tipo_paciente]}>
                    {TIPO_PACIENTE_LABEL[a.tipo_paciente]}
                  </Tag>
                </td>
                <td className="px-4 py-2.5">
                  <Tag className={TIPO_PAGAMENTO_STYLE[a.tipo_pagamento]}>
                    {TIPO_PAGAMENTO_LABEL[a.tipo_pagamento]}
                    {a.convenio_nome ? ` · ${a.convenio_nome}` : ""}
                  </Tag>
                </td>
                <td className="px-4 py-2.5 text-ink-muted hidden lg:table-cell">
                  {MOTIVO_LABEL[a.motivo] ?? a.motivo}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {a.total_comentarios > 0 ? (
                    <span className="font-mono text-xs text-accent-ink bg-accent-soft rounded-full px-2 py-0.5">
                      {a.total_comentarios}
                    </span>
                  ) : (
                    <span className="text-ink-faint text-xs">—</span>
                  )}
                </td>
              </tr>
              {expandido === a.id && (
                <tr key={`${a.id}-expand`}>
                  <td colSpan={7} className="p-0">
                    <ComentariosPanel atendimentoId={a.id} resumoConversa={a.resumo_conversa} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
