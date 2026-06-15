import { IrrigationLine } from '../data/sampleData';

interface Props {
  lines: IrrigationLine[];
}

export default function IrrigationStatus({ lines }: Props) {
  const getStatusConfig = (status: IrrigationLine['status']) => {
    switch (status) {
      case 'running':
        return {
          badge: 'Em Execução',
          badgeClass: 'bg-blue-100 text-blue-700',
          dotClass: 'bg-blue-500 animate-pulse',
          icon: (
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          ),
        };
      case 'idle':
        return {
          badge: 'Parado',
          badgeClass: 'bg-slate-100 text-slate-600',
          dotClass: 'bg-slate-400',
          icon: (
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ),
        };
      case 'scheduled':
        return {
          badge: 'Agendado',
          badgeClass: 'bg-purple-100 text-purple-700',
          dotClass: 'bg-purple-500',
          icon: (
            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'error':
        return {
          badge: 'Alerta',
          badgeClass: 'bg-red-100 text-red-700',
          dotClass: 'bg-red-500 animate-pulse',
          icon: (
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ),
        };
    }
  };

  const runningCount = lines.filter((l) => l.status === 'running').length;
  const errorCount = lines.filter((l) => l.status === 'error').length;
  const totalFlow = lines.reduce((s, l) => s + l.flowRate, 0);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Em Execução</p>
          <p className="text-xl font-bold text-blue-800">{runningCount}</p>
          <p className="text-[10px] text-blue-500">linhas ativas</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Vazão Total</p>
          <p className="text-xl font-bold text-emerald-800">{totalFlow.toFixed(1).replace('.', ',')}</p>
          <p className="text-[10px] text-emerald-500">L/min no total</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3">
          <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide">Avisos</p>
          <p className="text-xl font-bold text-red-800">{errorCount}</p>
          <p className="text-[10px] text-red-500">requer atenção</p>
        </div>
      </div>

      {/* Individual lines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {lines.map((line) => {
          const config = getStatusConfig(line.status);
          return (
            <div
              key={line.id}
              className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {config.icon}
                  <h4 className="font-semibold text-slate-800 text-sm">{line.name}</h4>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.badgeClass}`}>
                  {config.badge}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-3">{line.zone}</p>

              {/* Flow visualization */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-slate-800">{line.flowRate.toString().replace('.', ',')}</span>
                  <span className="text-xs text-slate-400 mb-1">L/min</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-lg font-semibold text-slate-600">{line.duration}</span>
                  <span className="text-xs text-slate-400 mb-0.5">min</span>
                </div>
              </div>

              {/* Animated flow bar */}
              <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                {line.status === 'running' && (
                  <div
                    className="absolute inset-y-0 bg-blue-400 rounded-full animate-pulse"
                    style={{ width: `${Math.min(100, (line.flowRate / 20) * 100)}%` }}
                  />
                )}
                {line.status === 'error' && (
                  <div className="absolute inset-y-0 bg-red-400 rounded-full w-full opacity-20" />
                )}
                {line.status === 'idle' && (
                  <div className="absolute inset-y-0 bg-slate-300 rounded-full w-0" />
                )}
                {line.status === 'scheduled' && (
                  <div className="absolute inset-y-0 bg-purple-300 rounded-full w-1/3 opacity-50" />
                )}
              </div>

              {/* Schedule info */}
              <div className="space-y-1 text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>Última rega</span>
                  <span className="text-slate-600">{line.lastRun}</span>
                </div>
                <div className="flex justify-between">
                  <span>Próxima rega</span>
                  <span className="text-slate-600">{line.nextRun}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
