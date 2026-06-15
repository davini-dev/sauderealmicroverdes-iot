import { LightZone } from '../data/sampleData';

interface Props {
  zones: LightZone[];
}

export default function LightLevels({ zones }: Props) {
  const getStatusBadge = (status: LightZone['status']) => {
    switch (status) {
      case 'optimal':
        return { label: 'Ideal', className: 'bg-emerald-100 text-emerald-700' };
      case 'low':
        return { label: 'Luz Baixa', className: 'bg-amber-100 text-amber-700' };
      case 'high':
        return { label: 'Luz Alta', className: 'bg-red-100 text-red-700' };
    }
  };

  const getBarColor = (status: LightZone['status']) => {
    switch (status) {
      case 'optimal': return 'bg-emerald-500';
      case 'low': return 'bg-amber-500';
      case 'high': return 'bg-red-500';
    }
  };

  const getLightIcon = (status: LightZone['status']) => {
    switch (status) {
      case 'optimal':
        return (
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        );
      case 'low':
        return (
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        );
      case 'high':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        );
    }
  };

  const avgPercentage = Math.round(zones.reduce((s, z) => s + z.percentage, 0) / zones.length);
  const totalLux = zones.reduce((s, z) => s + z.lux, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500">Média de Luminosidade</p>
            <p className="text-xl font-bold text-slate-800">{avgPercentage}% <span className="text-sm font-normal text-slate-400">({(totalLux / 1000).toFixed(1).replace('.', ',')}k lux no total)</span></p>
          </div>
        </div>
      </div>

      {/* Zone cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {zones.map((zone) => {
          const statusBadge = getStatusBadge(zone.status);
          return (
            <div
              key={zone.id}
              className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 text-sm">{zone.name}</h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                {getLightIcon(zone.status)}
                <div>
                  <p className="text-2xl font-bold text-slate-800">{zone.lux.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-slate-400">lux</p>
                </div>
              </div>

              {/* Light bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0 lux</span>
                  <span>40k lux</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getBarColor(zone.status)}`}
                    style={{ width: `${Math.min(100, (zone.lux / 40000) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">{zone.percentage}% de intensidade</span>
                  {zone.status !== 'optimal' && (
                    <span className="text-amber-600 font-medium">
                      {zone.status === 'low' ? '⬆ precisa de mais' : '⬇ excessivo'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
