import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const atendimentoId = parseInt(id, 10);
  if (Number.isNaN(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  if ("status_atendimento" in body) {
    if (body.status_atendimento !== "finalizado" && body.status_atendimento !== "nao_finalizado") {
      return NextResponse.json({ error: "status_atendimento inválido" }, { status: 400 });
    }
    values.push(body.status_atendimento);
    sets.push(`status_atendimento = $${values.length}`);
  }

  if ("prontmed_confirmado" in body) {
    values.push(Boolean(body.prontmed_confirmado));
    sets.push(`prontmed_confirmado = $${values.length}`);
  }

  if ("consulta_confirmada" in body) {
    values.push(Boolean(body.consulta_confirmada));
    sets.push(`consulta_confirmada = $${values.length}`);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  sets.push(`atualizado_em = NOW()`);
  values.push(atendimentoId);

  try {
    const result = await pool.query(
      `UPDATE atendimentos_clinica_davini SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING id, status_atendimento, prontmed_confirmado, consulta_confirmada`,
      values
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Atendimento não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar atendimento:", err);
    return NextResponse.json({ error: "Erro ao atualizar atendimento" }, { status: 500 });
  }
}
