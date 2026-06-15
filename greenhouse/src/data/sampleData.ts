export interface TemperatureZone {
  id: string;
  name: string;
  current: number;
  min: number;
  max: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  history: { time: string; temp: number }[];
}

export interface HumidityZone {
  id: string;
  name: string;
  value: number;
  target: number;
}

export interface LightZone {
  id: string;
  name: string;
  lux: number;
  percentage: number;
  status: 'optimal' | 'low' | 'high';
}

export interface IrrigationLine {
  id: string;
  name: string;
  zone: string;
  status: 'running' | 'idle' | 'scheduled' | 'error';
  flowRate: number;
  duration: number;
  lastRun: string;
  nextRun: string;
}

export interface PlantGrowth {
  plant: string;
  weeks: string[];
  heights: number[];
  leafCount: number[];
  color: string;
}

// ── Zonas de Temperatura ──
export const temperatureZones: TemperatureZone[] = [
  {
    id: 'tz-1',
    name: 'Zona Tropical',
    current: 28.4,
    min: 22,
    max: 32,
    target: 27,
    trend: 'up',
    history: [
      { time: '00:00', temp: 24.2 },
      { time: '02:00', temp: 23.8 },
      { time: '04:00', temp: 23.1 },
      { time: '06:00', temp: 23.5 },
      { time: '08:00', temp: 25.0 },
      { time: '10:00', temp: 26.8 },
      { time: '12:00', temp: 28.4 },
      { time: '14:00', temp: 29.1 },
      { time: '16:00', temp: 28.7 },
      { time: '18:00', temp: 27.3 },
      { time: '20:00', temp: 25.9 },
      { time: '22:00', temp: 24.8 },
    ],
  },
  {
    id: 'tz-2',
    name: 'Bancada de Brotos',
    current: 23.1,
    min: 18,
    max: 26,
    target: 22,
    trend: 'stable',
    history: [
      { time: '00:00', temp: 21.0 },
      { time: '02:00', temp: 20.5 },
      { time: '04:00', temp: 20.2 },
      { time: '06:00', temp: 20.8 },
      { time: '08:00', temp: 21.5 },
      { time: '10:00', temp: 22.3 },
      { time: '12:00', temp: 23.1 },
      { time: '14:00', temp: 23.4 },
      { time: '16:00', temp: 23.0 },
      { time: '18:00', temp: 22.4 },
      { time: '20:00', temp: 21.8 },
      { time: '22:00', temp: 21.3 },
    ],
  },
  {
    id: 'tz-3',
    name: 'Berçário de Microverdes',
    current: 31.7,
    min: 24,
    max: 35,
    target: 30,
    trend: 'up',
    history: [
      { time: '00:00', temp: 27.0 },
      { time: '02:00', temp: 26.3 },
      { time: '04:00', temp: 25.8 },
      { time: '06:00', temp: 26.1 },
      { time: '08:00', temp: 28.2 },
      { time: '10:00', temp: 30.0 },
      { time: '12:00', temp: 31.7 },
      { time: '14:00', temp: 33.2 },
      { time: '16:00', temp: 32.8 },
      { time: '18:00', temp: 31.0 },
      { time: '20:00', temp: 29.5 },
      { time: '22:00', temp: 28.1 },
    ],
  },
  {
    id: 'tz-4',
    name: 'Estufa Fria',
    current: 20.5,
    min: 16,
    max: 24,
    target: 21,
    trend: 'down',
    history: [
      { time: '00:00', temp: 21.2 },
      { time: '02:00', temp: 20.8 },
      { time: '04:00', temp: 20.3 },
      { time: '06:00', temp: 19.9 },
      { time: '08:00', temp: 20.0 },
      { time: '10:00', temp: 20.7 },
      { time: '12:00', temp: 20.5 },
      { time: '14:00', temp: 21.0 },
      { time: '16:00', temp: 20.8 },
      { time: '18:00', temp: 20.3 },
      { time: '20:00', temp: 19.8 },
      { time: '22:00', temp: 19.5 },
    ],
  },
];

// ── Zonas de Umidade ──
export const humidityZones: HumidityZone[] = [
  { id: 'hz-1', name: 'Zona Tropical', value: 78, target: 80 },
  { id: 'hz-2', name: 'Bancada de Brotos', value: 65, target: 70 },
  { id: 'hz-3', name: 'Berçário de Microverdes', value: 42, target: 40 },
  { id: 'hz-4', name: 'Estufa Fria', value: 72, target: 75 },
];

// ── Níveis de Luminosidade ──
export const lightZones: LightZone[] = [
  { id: 'lz-1', name: 'Iluminação Principal', lux: 32000, percentage: 85, status: 'optimal' },
  { id: 'lz-2', name: 'Bancada Inferior', lux: 8500, percentage: 35, status: 'low' },
  { id: 'lz-3', name: 'Mesa de Germinação', lux: 14000, percentage: 55, status: 'optimal' },
  { id: 'lz-4', name: 'Área Sombreada', lux: 5000, percentage: 20, status: 'low' },
];

// ── Linhas de Irrigação ──
export const irrigationLines: IrrigationLine[] = [
  {
    id: 'il-1',
    name: 'Gotejamento A',
    zone: 'Zona Tropical',
    status: 'running',
    flowRate: 12.5,
    duration: 15,
    lastRun: '14/01/2026 06:00',
    nextRun: '14/01/2026 18:00',
  },
  {
    id: 'il-2',
    name: 'Sistema de Nebulização',
    zone: 'Estufa Fria',
    status: 'idle',
    flowRate: 4.2,
    duration: 8,
    lastRun: '14/01/2026 08:30',
    nextRun: '14/01/2026 20:30',
  },
  {
    id: 'il-3',
    name: 'Aspersores Suspensos',
    zone: 'Bancada de Brotos',
    status: 'scheduled',
    flowRate: 18.0,
    duration: 10,
    lastRun: '13/01/2026 06:00',
    nextRun: '14/01/2026 06:00',
  },
  {
    id: 'il-4',
    name: 'Gotejamento B',
    zone: 'Berçário de Microverdes',
    status: 'error',
    flowRate: 0,
    duration: 5,
    lastRun: '12/01/2026 07:00',
    nextRun: '15/01/2026 07:00',
  },
];

// ── Crescimento das Plantas ──
export const plantGrowthData: PlantGrowth[] = [
  {
    plant: 'Microverdes de Rabanete',
    weeks: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    heights: [5, 12, 22, 35, 50, 68, 82, 95],
    leafCount: [4, 8, 14, 22, 30, 38, 44, 48],
    color: '#ef4444',
  },
  {
    plant: 'Microverdes de Manjericão',
    weeks: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    heights: [3, 8, 14, 22, 28, 33, 37, 40],
    leafCount: [2, 6, 12, 20, 30, 42, 52, 60],
    color: '#22c55e',
  },
  {
    plant: 'Microverdes de Girassol',
    weeks: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    heights: [4, 10, 18, 30, 45, 62, 78, 90],
    leafCount: [3, 7, 13, 18, 24, 28, 32, 35],
    color: '#3b82f6',
  },
  {
    plant: 'Microverdes de Couve',
    weeks: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    heights: [2, 6, 10, 15, 19, 23, 26, 28],
    leafCount: [4, 10, 18, 28, 40, 50, 58, 64],
    color: '#a855f7',
  },
];
