export const TIPO_PACIENTE_LABEL: Record<string, string> = {
  novo: "Novo",
  retorno: "Retorno",
  indefinido: "Indefinido",
};

export const TIPO_PAGAMENTO_LABEL: Record<string, string> = {
  convenio: "Convênio",
  particular: "Particular",
  nao_informado: "Não informado",
};

export const MOTIVO_LABEL: Record<string, string> = {
  agendamento: "Agendamento",
  duvida_valores: "Dúvida de valores",
  duvida_horario: "Dúvida de horário",
  duvida_convenio: "Dúvida de convênio",
  resultado_exame: "Resultado de exame",
  reclamacao: "Reclamação",
  outro: "Outro",
};

export const URGENCIA_LABEL: Record<string, string> = {
  normal: "Normal",
  urgente: "Urgente",
};

// classes Tailwind (texto + fundo) por categoria — usa os tokens definidos em globals.css
export const TIPO_PACIENTE_STYLE: Record<string, string> = {
  novo: "text-novo bg-novo-soft",
  retorno: "text-retorno bg-retorno-soft",
  indefinido: "text-indefinido bg-indefinido-soft",
};

export const TIPO_PAGAMENTO_STYLE: Record<string, string> = {
  convenio: "text-accent-ink bg-accent-soft",
  particular: "text-ink-muted bg-indefinido-soft",
  nao_informado: "text-ink-faint bg-indefinido-soft",
};

export function formatData(dataStr: string): string {
  const [ano, mes, dia] = dataStr.slice(0, 10).split("-");
  return `${dia}/${mes}`;
}

export function formatDataHora(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTelefone(numero: string): string {
  const digits = numero.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const parte1 = digits.slice(4, 9);
    const parte2 = digits.slice(9);
    return `(${ddd}) ${parte1}-${parte2}`;
  }
  return numero;
}
