import { useState } from 'react';
import { PlantGrowth } from '../data/sampleData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Props {
  data: PlantGrowth[];
}

export default function PlantGrowthCharts({ data }: Props) {
  const [metric, setMetric] = useState<'heights' | 'leafCount'>('heights');
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);

  // Transform data for recharts: combine all plants into shared-week format
  const allWeeks = data[0].weeks;
  const combinedData = allWeeks.map((week, i) => {
    const row: Record<string, string | number> = { week };
    data.forEach((p) => {
      row[p.plant] = p[metric][i];
    });
    return row;
  });

  // Filter for single-plant view
  const selectedData = selectedPlant
    ? data.find((p) => p.plant === selectedPlant)
    : null;

  const filteredData = selectedPlant
    ? selectedData!.weeks.map((week, i) => ({
        week,
        [selectedData!.plant]: selectedData![metric][i],
      }))
    : combinedData;

  const metricLabel = metric === 'heights' ? 'Altura (cm)' : 'Quantidade de Folhas';

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setMetric('heights')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              metric === 'heights'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📏 Altura
          </button>
          <button
            onClick={() => setMetric('leafCount')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              metric === 'leafCount'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🍃 Contagem de Folhas
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedPlant(null)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
              !selectedPlant
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Todas as Plantas
          </button>
          {data.map((plant) => (
            <button
              key={plant.plant}
              onClick={() => setSelectedPlant(plant.plant)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
                selectedPlant === plant.plant
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              style={
                selectedPlant === plant.plant
                  ? { backgroundColor: plant.color }
                  : {}
              }
            >
              {plant.plant.replace('Microverdes de ', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-800 mb-1">
          {selectedPlant || 'Todas as Plantas'} — {metricLabel}
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Medições de crescimento semanais ao longo de 8 semanas
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              label={{
                value: metricLabel,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#94a3b8' },
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            />
            {(selectedPlant ? [data.find((p) => p.plant === selectedPlant)!] : data).map(
              (plant) => (
                <Line
                  key={plant.plant}
                  type="monotone"
                  dataKey={plant.plant}
                  stroke={plant.color}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                  name={plant.plant + (metric === 'heights' ? ' (cm)' : ' (folhas)')}
                />
              )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Growth summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {data.map((plant) => {
          const heightGrowth = plant.heights[plant.heights.length - 1] - plant.heights[0];
          const leafGrowth = plant.leafCount[plant.leafCount.length - 1] - plant.leafCount[0];
          const shortName = plant.plant.replace('Microverdes de ', '');
          return (
            <div
              key={plant.plant}
              className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm flex items-center gap-3"
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: plant.color }}
              >
                {shortName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{plant.plant}</p>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-[10px] text-slate-500">
                    +{heightGrowth} cm
                  </span>
                  <span className="text-[10px] text-slate-500">
                    +{leafGrowth} folhas
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
