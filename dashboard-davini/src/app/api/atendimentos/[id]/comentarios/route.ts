import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const atendimentoId = parseInt(id, 10);
  if (Number.isNaN(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT id, atendimento_id, autor, comentario, criado_em
         FROM atendimentos_comentarios
         WHERE atendimento_id = $1
         ORDER BY criado_em ASC`,
      [atendimentoId]
    );
    return NextResponse.json({ data: result.rows });
  } catch (err) {
    console.error("Erro ao buscar comentários:", err);
    return NextResponse.json({ error: "Erro ao buscar comentários" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const atendimentoId = parseInt(id, 10);
  if (Number.isNaN(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: { autor?: string; comentario?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const comentario = (body.comentario || "").trim();
  const autor = (body.autor || "Michele").trim().slice(0, 100);
  if (!comentario) {
    return NextResponse.json({ error: "Comentário não pode ser vazio" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `INSERT INTO atendimentos_comentarios (atendimento_id, autor, comentario)
         VALUES ($1, $2, $3)
         RETURNING id, atendimento_id, autor, comentario, criado_em`,
      [atendimentoId, autor, comentario]
    );
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Erro ao salvar comentário:", err);
    return NextResponse.json({ error: "Erro ao salvar comentário" }, { status: 500 });
  }
}
