import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

async function getNumeroDoAtendimento(atendimentoId: number): Promise<string | null> {
  const result = await pool.query(
    `SELECT numero FROM atendimentos_clinica_davini WHERE id = $1`,
    [atendimentoId]
  );
  return result.rows[0]?.numero ?? null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const atendimentoId = parseInt(id, 10);
  if (Number.isNaN(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  try {
    const numero = await getNumeroDoAtendimento(atendimentoId);
    if (!numero) {
      return NextResponse.json({ error: "Atendimento não encontrado" }, { status: 404 });
    }

    const result = await pool.query(
      `SELECT id, numero, direcao, autor, mensagem, origem, criado_em
         FROM atendimentos_mensagens
         WHERE numero = $1
         ORDER BY criado_em ASC
         LIMIT 200`,
      [numero]
    );

    return NextResponse.json({ data: result.rows });
  } catch (err) {
    console.error("Erro ao buscar mensagens:", err);
    return NextResponse.json({ error: "Erro ao buscar mensagens" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const atendimentoId = parseInt(id, 10);
  if (Number.isNaN(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: { mensagem?: string; autor?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const mensagem = (body.mensagem || "").trim();
  if (!mensagem) {
    return NextResponse.json({ error: "Mensagem não pode ser vazia" }, { status: 400 });
  }
  if (mensagem.length > 2000) {
    return NextResponse.json({ error: "Mensagem deve ter no máximo 2000 caracteres" }, { status: 400 });
  }
  const autor = (body.autor || "Michele").trim().slice(0, 100) || "Michele";

  const webhookUrl = process.env.N8N_DASHBOARD_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_DASHBOARD_WEBHOOK_SECRET;
  if (!webhookUrl || !webhookSecret) {
    return NextResponse.json(
      { error: "Envio de mensagem não configurado (N8N_DASHBOARD_WEBHOOK_URL/SECRET ausentes)" },
      { status: 500 }
    );
  }

  try {
    const numero = await getNumeroDoAtendimento(atendimentoId);
    if (!numero) {
      return NextResponse.json({ error: "Atendimento não encontrado" }, { status: 404 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const resp = await fetch(webhookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-dashboard-secret": webhookSecret,
      },
      body: JSON.stringify({ numero, mensagem, autor }),
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      return NextResponse.json(
        { error: errBody.error || "Falha ao enviar mensagem pelo n8n" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
    const error = err instanceof Error && err.name === "AbortError"
      ? "O envio demorou mais que o esperado; tente novamente"
      : "Erro ao enviar mensagem";
    return NextResponse.json({ error }, { status: 502 });
  }
}
