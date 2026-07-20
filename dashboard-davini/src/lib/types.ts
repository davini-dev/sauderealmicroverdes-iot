export type TipoPaciente = "novo" | "retorno" | "indefinido";
export type TipoPagamento = "convenio" | "particular" | "nao_informado";
export type Urgencia = "normal" | "urgente";

export type Atendimento = {
  id: number;
  numero: string;
  nome_paciente: string | null;
  tipo_paciente: TipoPaciente;
  tipo_pagamento: TipoPagamento;
  convenio_nome: string | null;
  motivo: string;
  urgencia: Urgencia;
  interesse_agendamento: boolean;
  resumo_conversa: string | null;
  origem: string;
  data_referencia: string;
  criado_em: string;
  atualizado_em: string;
  total_comentarios: number;
};

export type AtendimentosResponse = {
  data: Atendimento[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type Comentario = {
  id: number;
  atendimento_id: number;
  autor: string;
  comentario: string;
  criado_em: string;
};

export type Stats = {
  periodo: { data_inicio: string; data_fim: string };
  breakdown: Record<string, Record<string, number>>;
  por_dia: { data: string; qtd: number }[];
  precisa_atencao: number;
  comparativo: {
    atual: { total: number; interesse: number };
    anterior: { total: number; interesse: number };
    periodo_anterior: { data_inicio: string; data_fim: string };
  };
};
