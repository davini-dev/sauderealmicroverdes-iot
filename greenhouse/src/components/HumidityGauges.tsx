import { HumidityZone } from '../data/sampleData';

interface Props {
  zones: HumidityZone[];
}

export default function HumidityGauges({ zones }: Props) {
  const getHumidityColor = (value: number, target: number) => {
    const diff = Math.abs(value - target);
    if (diff <= 5) return { ring: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (diff <= 10) return { ring: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { ring: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' };
  };

  const getZoneEmoji = (name: string) => {
    if (name.includes('Tropical')) return '🌴';
    if (name.includes('Brotos')) return '🌱';
    if (name.includes('Berçário')) return '🌵';
    if (name.includes('Fria')) return '🌸';
    return '💧';
  };

  // SVG circular gauge — radius = 40, circumference = 2*PI*40 ≈ 251.33
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {zones.map((zone) => {
        const colors = getHumidityColor(zone.value, zone.target);
        const dashOffset = circumference - (zone.value / 100) * circumference;

        return (
          <div
            key={zone.id}
            className="flex flex-col items-center rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm"
          >
            <span className="text-2xl mb-2">{getZoneEmoji(zone.name)}</span>
            <h4 className="text-xs font-semibold text-slate-700 mb-3 text-center">{zone.name}</h4>

            {/* Circular gauge */}
            <div className="relative w-24 h-24 mb-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                />
                {/* Value circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke={colors.ring}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${colors.text}`}>{zone.value}</span>
                <span className="text-[10px] text-slate-400">%</span>
              </div>
            </div>

            {/* Target indicator */}
            <div className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}>
              Alvo: {zone.target}%
            </div>

            {/* Status label */}
            <div className="mt-2 flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.ring }}
              />
              <span className="text-[10px] text-slate-500">
                {Math.abs(zone.value - zone.target) <= 5
                  ? 'Ideal'
                  : Math.abs(zone.value - zone.target) <= 10
                  ? 'Pequeno desvio'
                  : 'Requer ajuste'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
