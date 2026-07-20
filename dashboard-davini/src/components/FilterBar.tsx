import { MOTIVO_LABEL, TIPO_PACIENTE_LABEL, TIPO_PAGAMENTO_LABEL, URGENCIA_LABEL } from "@/lib/labels";

export type Filtros = {
  tipo_paciente: string;
  tipo_pagamento: string;
  motivo: string;
  urgencia: string;
  interesse: string;
  q: string;
};

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
    >
      <option value="">{placeholder}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function FilterBar({
  filtros,
  onChange,
}: {
  filtros: Filtros;
  onChange: (next: Filtros) => void;
}) {
  function set<K extends keyof Filtros>(key: K, value: string) {
    onChange({ ...filtros, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Buscar por nome ou telefone…"
        value={filtros.q}
        onChange={(e) => set("q", e.target.value)}
        className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent min-w-[200px] flex-1"
      />
      <Select
        value={filtros.tipo_paciente}
        onChange={(v) => set("tipo_paciente", v)}
        options={Object.entries(TIPO_PACIENTE_LABEL)}
        placeholder="Tipo de paciente"
      />
      <Select
        value={filtros.tipo_pagamento}
        onChange={(v) => set("tipo_pagamento", v)}
        options={Object.entries(TIPO_PAGAMENTO_LABEL)}
        placeholder="Pagamento"
      />
      <Select
        value={filtros.motivo}
        onChange={(v) => set("motivo", v)}
        options={Object.entries(MOTIVO_LABEL)}
        placeholder="Motivo"
      />
      <Select
        value={filtros.urgencia}
        onChange={(v) => set("urgencia", v)}
        options={Object.entries(URGENCIA_LABEL)}
        placeholder="Urgência"
      />
      <Select
        value={filtros.interesse}
        onChange={(v) => set("interesse", v)}
        options={[
          ["true", "Quer agendar"],
          ["false", "Sem interesse"],
        ]}
        placeholder="Interesse"
      />
      {(filtros.tipo_paciente || filtros.tipo_pagamento || filtros.motivo || filtros.urgencia || filtros.interesse || filtros.q) && (
        <button
          onClick={() => onChange({ tipo_paciente: "", tipo_pagamento: "", motivo: "", urgencia: "", interesse: "", q: "" })}
          className="text-sm text-ink-faint hover:text-ink transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
