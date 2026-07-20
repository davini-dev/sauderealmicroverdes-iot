import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const dataFim = sp.get("data_fim") || toDateStr(new Date());
  const dataInicio = sp.get("data_inicio") || addDays(dataFim, -6);

  const diffDays =
    Math.round(
      (new Date(dataFim + "T00:00:00Z").getTime() - new Date(dataInicio + "T00:00:00Z").getTime()) /
        86_400_000
    ) + 1;
  const anteriorFim = addDays(dataInicio, -1);
  const anteriorInicio = addDays(anteriorFim, -(diffDays - 1));

  try {
    const [porCategoria, porDia, atual, anterior, precisaAtencao] = await Promise.all([
      pool.query(
        `SELECT 'tipo_paciente' AS categoria, tipo_paciente AS valor, COUNT(*)::int AS qtd
           FROM atendimentos_clinica_davini
           WHERE data_referencia BETWEEN $1 AND $2 GROUP BY tipo_paciente
         UNION ALL
         SELECT 'tipo_pagamento', tipo_pagamento, COUNT(*)::int
           FROM atendimentos_clinica_davini
           WHERE data_referencia BETWEEN $1 AND $2 GROUP BY tipo_pagamento
         UNION ALL
         SELECT 'motivo', motivo, COUNT(*)::int
           FROM atendimentos_clinica_davini
           WHERE data_referencia BETWEEN $1 AND $2 GROUP BY motivo
         UNION ALL
         SELECT 'urgencia', urgencia, COUNT(*)::int
           FROM atendimentos_clinica_davini
           WHERE data_referencia BETWEEN $1 AND $2 GROUP BY urgencia
         UNION ALL
         SELECT 'interesse_agendamento', interesse_agendamento::text, COUNT(*)::int
           FROM atendimentos_clinica_davini
           WHERE data_referencia BETWEEN $1 AND $2 GROUP BY interesse_agendamento`,
        [dataInicio, dataFim]
      ),
      pool.query(
        `SELECT data_referencia::text AS data, COUNT(*)::int AS qtd
           FROM atendimentos_clinica_davini
           WHERE data_referencia BETWEEN $1 AND $2
           GROUP BY data_referencia ORDER BY data_referencia`,
        [dataInicio, dataFim]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE interesse_agendamento)::int AS interesse
           FROM atendimentos_clinica_davini WHERE data_referencia BETWEEN $1 AND $2`,
        [dataInicio, dataFim]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE interesse_agendamento)::int AS interesse
           FROM atendimentos_clinica_davini WHERE data_referencia BETWEEN $1 AND $2`,
        [anteriorInicio, anteriorFim]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS qtd FROM atendimentos_clinica_davini
           WHERE data_referencia BETWEEN $1 AND $2
             AND interesse_agendamento = true AND tipo_pagamento = 'nao_informado'`,
        [dataInicio, dataFim]
      ),
    ]);

    const breakdown: Record<string, Record<string, number>> = {};
    for (const row of porCategoria.rows as { categoria: string; valor: string; qtd: number }[]) {
      breakdown[row.categoria] = breakdown[row.categoria] || {};
      breakdown[row.categoria][row.valor ?? "null"] = row.qtd;
    }

    return NextResponse.json({
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      breakdown,
      por_dia: porDia.rows,
      precisa_atencao: precisaAtencao.rows[0]?.qtd ?? 0,
      comparativo: {
        atual: atual.rows[0] ?? { total: 0, interesse: 0 },
        anterior: anterior.rows[0] ?? { total: 0, interesse: 0 },
        periodo_anterior: { data_inicio: anteriorInicio, data_fim: anteriorFim },
      },
    });
  } catch (err) {
    console.error("Erro ao buscar estatísticas:", err);
    return NextResponse.json({ error: "Erro ao buscar estatísticas" }, { status: 500 });
  }
}
