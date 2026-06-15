import { useState } from 'react';
import { TemperatureZone } from '../data/sampleData';
import { cn } from '../utils/cn';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  zones: TemperatureZone[];
}

export default function TemperatureZones({ zones }: Props) {
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const getTrendIcon = (trend: TemperatureZone['trend']) => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        );
    }
  };

  const getTempBg = (temp: number, min: number, max: number) => {
    if (temp < min) return 'from-sky-500 to-sky-600';
    if (temp > max) return 'from-red-500 to-red-600';
    return 'from-emerald-500 to-emerald-600';
  };

  const getZoneEmoji = (name: string) => {
    if (name.includes('Tropical')) return '🌴';
    if (name.includes('Brotos')) return '🌱';
    if (name.includes('Berçário')) return '🌵';
    if (name.includes('Fria')) return '🌸';
    return '🌿';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {zones.map((zone) => (
        <div
          key={zone.id}
          className={cn(
            'relative rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer',
            expandedZone === zone.id && 'ring-2 ring-emerald-400/50 md:col-span-2'
          )}
          onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getZoneEmoji(zone.name)}</span>
              <h3 className="font-semibold text-slate-800 text-sm">{zone.name}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {getTrendIcon(zone.trend)}
              <span className="text-xs text-slate-400">{zone.trend === 'up' ? '+0,8°' : zone.trend === 'down' ? '-0,3°' : '0,0°'}</span>
            </div>
          </div>

          <div className={cn(
            'rounded-xl bg-gradient-to-br p-4 text-white mb-3',
            getTempBg(zone.current, zone.min, zone.max)
          )}>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold leading-none">{zone.current.toFixed(1).replace('.', ',')}</span>
              <span className="text-lg opacity-80">°C</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs opacity-90">
              <span>Alvo: {zone.target}°C</span>
              <span className="opacity-60">|</span>
              <span>{zone.min}° – {zone.max}°</span>
            </div>
          </div>

          {/* Progress bar showing where current temp falls in the range */}
          <div className="mb-1 flex justify-between text-[10px] text-slate-400">
            <span>{zone.min}°</span>
            <span>{zone.max}°</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, ((zone.current - zone.min) / (zone.max - zone.min)) * 100))}%`,
                background: zone.current > zone.max
                  ? 'linear-gradient(90deg, #ef4444, #f87171)'
                  : zone.current < zone.min
                  ? 'linear-gradient(90deg, #38bdf8, #0ea5e9)'
                  : 'linear-gradient(90deg, #10b981, #34d399)',
              }}
            />
          </div>

          {/* Expanded: mini temperature chart */}
          {expandedZone === zone.id && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Tendência das últimas 24 horas</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={zone.history}>
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={2} axisLine={false} tickLine={false} />
                  <YAxis domain={[zone.min - 2, zone.max + 2]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value: unknown) => [`${Number(value).toFixed(1).replace('.', ',')}°C`, 'Temperatura']}
                  />
                  <ReferenceLine y={zone.target} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
                  <Line type="monotone" dataKey="temp" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-400 text-center mt-1">Linha tracejada amarela = temperatura alvo ({zone.target}°C)</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
