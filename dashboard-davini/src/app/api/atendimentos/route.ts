import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const dataInicio = sp.get("data_inicio") || null;
  const dataFim = sp.get("data_fim") || null;
  const tipoPaciente = sp.get("tipo_paciente") || null;
  const tipoPagamento = sp.get("tipo_pagamento") || null;
  const motivo = sp.get("motivo") || null;
  const urgencia = sp.get("urgencia") || null;
  const interesseParam = sp.get("interesse");
  const interesse = interesseParam === "true" ? true : interesseParam === "false" ? false : null;
  const q = sp.get("q") || null;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25", 10) || 25));
  const offset = (page - 1) * pageSize;

  try {
    const result = await pool.query(
      `SELECT a.id, a.numero, a.nome_paciente, a.tipo_paciente, a.tipo_pagamento,
              a.convenio_nome, a.motivo, a.urgencia, a.interesse_agendamento,
              a.resumo_conversa, a.origem, a.data_referencia, a.criado_em, a.atualizado_em,
              COALESCE(c.total_comentarios, 0)::int AS total_comentarios,
              COUNT(*) OVER()::int AS total_count
       FROM atendimentos_clinica_davini a
       LEFT JOIN (
         SELECT atendimento_id, COUNT(*) AS total_comentarios
         FROM atendimentos_comentarios
         GROUP BY atendimento_id
       ) c ON c.atendimento_id = a.id
       WHERE ($1::date IS NULL OR a.data_referencia >= $1::date)
         AND ($2::date IS NULL OR a.data_referencia <= $2::date)
         AND ($3::text IS NULL OR a.tipo_paciente = $3)
         AND ($4::text IS NULL OR a.tipo_pagamento = $4)
         AND ($5::text IS NULL OR a.motivo = $5)
         AND ($6::text IS NULL OR a.urgencia = $6)
         AND ($7::boolean IS NULL OR a.interesse_agendamento = $7)
         AND ($8::text IS NULL OR a.nome_paciente ILIKE '%' || $8 || '%' OR a.numero ILIKE '%' || $8 || '%')
       ORDER BY a.atualizado_em DESC
       LIMIT $9 OFFSET $10`,
      [dataInicio, dataFim, tipoPaciente, tipoPagamento, motivo, urgencia, interesse, q, pageSize, offset]
    );

    const totalCount = result.rows[0]?.total_count ?? 0;
    const rows = result.rows.map(({ total_count, ...rest }) => rest);

    return NextResponse.json({
      data: rows,
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    });
  } catch (err) {
    console.error("Erro ao buscar atendimentos:", err);
    return NextResponse.json({ error: "Erro ao buscar atendimentos" }, { status: 500 });
  }
}
