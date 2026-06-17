// ─────────────────────────────────────────────────────────────
//  useLiveData.ts — dados reais via HTTP polling + fallback simulação
//
//  FLUXO REAL:
//    ESP32-S3 → MQTT → Node.js aggregator → /dashboard-data → React (polling 3s)
//
//  FLUXO FALLBACK (sem servidor):
//    Simulação local idêntica à lógica do firmware .ino
//
//  O hook tenta HTTP polling primeiro. Se falhar, ativa simulação.
//  Quando o servidor volta, retorna a dados reais automaticamente.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  TemperatureZone,
  HumidityZone,
  LightZone,
  IrrigationLine,
  PlantGrowth,
} from './sampleData';
import {
  temperatureZones as initialTemp,
  humidityZones    as initialHum,
  lightZones       as initialLight,
  irrigationLines  as initialIrr,
  plantGrowthData  as initialGrowth,
} from './sampleData';

// ─── URL do servidor ─────────────────────────────────────────
// No Docker: /api/ → nginx → server:3000
// Em dev: VITE_API_URL=http://localhost:3000 ou vazio (proxy do Vite)
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : '');

// ─── Tipos do payload /dashboard-data ────────────────────────
interface SensorData {
  valor: number | string;
  unidade: string;
  timestamp: string;
}

interface BandejaData {
  id: string;
  nome: string;
  umidade: number;
  dispositivo: string;
  timestamp: string;
}

interface DashboardData {
  ok: boolean;
  ts: string;
  online: boolean;
  message?: string;
  dispositivo?: {
    id: string;
    nome: string;
    ip: string;
    rssi: number;
    uptime: string;
  };
  sensores?: Record<string, SensorData>;
  bandejas?: Record<string, BandejaData>;
  dispositivos?: Array<{ id: string; online: boolean; lastSeen: string }>;
  app?: { nome: string; uptime: number; mqtt: string };
}

// ─── Simulação (espelha SensorSim do firmware) ───────────────
interface Sim { valor: number; min: number; max: number; delta: number; tend: number; }

function simPasso(s: Sim): number {
  const ruido = (Math.random() * 2 - 1) * s.delta;
  s.tend += (Math.random() * 2 - 1) * 0.01;
  s.tend = Math.max(-0.5, Math.min(0.5, s.tend));
  s.valor = Math.max(s.min, Math.min(s.max, s.valor + ruido + s.tend));
  return s.valor;
}

const tempSims: Sim[] = [
  { valor: 28.4, min: 22, max: 32,    delta: 0.3,  tend: 0.05 },
  { valor: 23.1, min: 18, max: 26,    delta: 0.2,  tend: 0.0  },
  { valor: 31.7, min: 24, max: 35,    delta: 0.35, tend: 0.08 },
  { valor: 20.5, min: 16, max: 24,    delta: 0.15, tend: -0.03 },
];
const humSims: Sim[] = [
  { valor: 78, min: 50, max: 95, delta: 0.8, tend: 0.1  },
  { valor: 65, min: 40, max: 85, delta: 0.7, tend: 0.0  },
  { valor: 42, min: 30, max: 70, delta: 1.2, tend: -0.1 },
  { valor: 72, min: 50, max: 90, delta: 0.6, tend: 0.05 },
];
const luxSims: Sim[] = [
  { valor: 32000, min: 20000, max: 40000, delta: 500, tend: 10 },
  { valor: 8500,  min: 4000,  max: 15000, delta: 300, tend: -5 },
  { valor: 14000, min: 8000,  max: 22000, delta: 400, tend: 5  },
  { valor: 5000,  min: 2000,  max: 10000, delta: 200, tend: 0  },
];
const irrFlowSims: Sim[] = [
  { valor: 12.5, min: 10, max: 16, delta: 0.3, tend: 0 },
  { valor: 4.2,  min: 3,  max: 6,  delta: 0.1, tend: 0 },
  { valor: 18.0, min: 15, max: 22, delta: 0.4, tend: 0 },
  { valor: 0,    min: 0,  max: 0,  delta: 0,   tend: 0 },
];

// ─── Tipo exportado pelo hook ─────────────────────────────────
export interface LiveData {
  temperatureZones: TemperatureZone[];
  humidityZones:    HumidityZone[];
  lightZones:       LightZone[];
  irrigationLines:  IrrigationLine[];
  plantGrowthData:  PlantGrowth[];
  lastUpdated:      string;
  tickCount:        number;
  source:           'servidor' | 'simulacao';
  mqttStatus:       string;
  device: {
    id: string; ip: string; rssi: number;
    uptime: string; modo: string;
  };
  eventos: Array<{ tipo: string; msg: string; ts: string }>;
  enviarComando: (topico: string, valor: string) => Promise<boolean>;
}

// ─── Helpers ─────────────────────────────────────────────────
function r1(n: number) { return Math.round(n * 10) / 10; }
function r0(n: number) { return Math.round(n); }
function tsNow() {
  const d = new Date();
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
}
function getTrend(old: number, cur: number): TemperatureZone['trend'] {
  return cur - old > 0.15 ? 'up' : cur - old < -0.15 ? 'down' : 'stable';
}

// ─── Mapeia DashboardData → LiveData ─────────────────────────
function mapearDashboard(data: DashboardData) {
  const sensores = data.sensores || {};
  const bandejas = data.bandejas || {};
  const dev = data.dispositivo;

  // ── Temperatura ──
  // Usa sensor "temperatura" para zona 0, simula as demais
  const tempVal = sensores.temperatura?.valor;
  const newTemp: TemperatureZone[] = initialTemp.map((z, i) => {
    let cur: number;
    if (i === 0 && tempVal !== undefined && tempVal !== null) {
      cur = r1(Number(tempVal));
    } else {
      cur = r1(simPasso(tempSims[i]));
    }
    const hist = [...z.history];
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    hist.push({ time: timeStr, temp: cur });
    if (hist.length > 12) hist.shift();
    return { ...z, current: cur, trend: getTrend(z.current, cur), history: hist };
  });

  // ── Umidade ──
  // Usa sensor "umidade_ar" para zona 0, "umidade_solo" para zona 2, simula o resto
  const arVal = sensores.umidade_ar?.valor;
  const soloVal = sensores.umidade_solo?.valor;
  const newHum: HumidityZone[] = initialHum.map((z, i) => {
    if (i === 0 && arVal !== undefined && arVal !== null)
      return { ...z, value: r0(Number(arVal)) };
    if (i === 2 && soloVal !== undefined && soloVal !== null)
      return { ...z, value: r0(Number(soloVal)) };
    return { ...z, value: r0(simPasso(humSims[i])) };
  });

  // ── Luz ──
  const luzVal = sensores.luz?.valor;
  const newLux: LightZone[] = initialLight.map((z, i) => {
    if (i === 0 && luzVal !== undefined && luzVal !== null) {
      const lux = r0(Number(luzVal));
      const pct = Math.min(r0((lux / 40000) * 100), 100);
      return { ...z, lux, percentage: pct, status: pct < 30 ? 'low' as const : pct > 90 ? 'high' as const : 'optimal' as const };
    }
    const lux = r0(simPasso(luxSims[i]));
    const pct = Math.min(r0((lux / 40000) * 100), 100);
    return { ...z, lux, percentage: pct, status: pct < 30 ? 'low' as const : pct > 90 ? 'high' as const : 'optimal' as const };
  });

  // ── Irrigação ──
  const irrVal = sensores.irrigacao?.valor;
  const neblinaVal = sensores.neblina?.valor;
  const newIrr: IrrigationLine[] = initialIrr.map((l, i) => {
    if (i === 0) {
      const on = irrVal === 'ON' || irrVal === 'on' || irrVal === '1';
      return {
        ...l,
        status: on ? 'running' as const : 'idle' as const,
        flowRate: on ? r1(simPasso(irrFlowSims[i])) : 0,
      };
    }
    if (i === 1) {
      const on = neblinaVal === 'ON' || neblinaVal === 'on' || neblinaVal === '1';
      return {
        ...l,
        status: on ? 'running' as const : 'idle' as const,
        flowRate: on ? r1(simPasso(irrFlowSims[i])) : 0,
      };
    }
    return l;
  });

  // ── Device ──
  const device = {
    id:     dev?.id || 'SR-2026-A3F1',
    ip:     dev?.ip || '---',
    rssi:   dev?.rssi ?? -70,
    uptime: dev?.uptime || '---',
    modo:   data.online ? 'real' : 'simulacao',
  };

  // ── MQTT status ──
  const mqttStatus = data.app?.mqtt === 'conectado' ? 'conectado' : 'desconectado';

  return {
    temperatureZones: newTemp,
    humidityZones:    newHum,
    lightZones:       newLux,
    irrigationLines:  newIrr,
    device,
    mqttStatus,
  };
}

// ─── HOOK PRINCIPAL ───────────────────────────────────────────
export function useLiveData(pollMs = 3000): LiveData {
  const tickRef     = useRef(0);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [source, setSource] = useState<'servidor' | 'simulacao'>('simulacao');
  const [mqttStatus, setMqttStatus] = useState('desconectado');
  const [eventos, setEventos] = useState<LiveData['eventos']>([]);
  const [device, setDevice] = useState<LiveData['device']>({
    id: 'SR-2026-A3F1', ip: '---', rssi: -70,
    uptime: '00h 00m 00s', modo: 'simulacao',
  });

  const [tempZones, setTempZones] = useState<TemperatureZone[]>(initialTemp);
  const [humZones,  setHumZones]  = useState<HumidityZone[]>(initialHum);
  const [luxZones,  setLuxZones]  = useState<LightZone[]>(initialLight);
  const [irrLines,  setIrrLines]  = useState<IrrigationLine[]>(initialIrr);
  const [lastUpd,   setLastUpd]   = useState(tsNow());
  const [tickCount, setTickCount] = useState(0);

  // ── Envia comando HTTP → servidor → MQTT ──────────────────
  const enviarComando = useCallback(async (topico: string, valor: string) => {
    try {
      const res = await fetch(`${API_URL}/cmd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topico, valor }),
      });
      const json = await res.json();
      return json.ok === true;
    } catch { return false; }
  }, []);

  // ── Tick de simulação (usando quando servidor offline) ────
  const tickSim = useCallback(() => {
    tickRef.current += 1;
    setTickCount(tickRef.current);
    setLastUpd(tsNow());

    setTempZones(prev => prev.map((z, i) => {
      const cur = r1(simPasso(tempSims[i]));
      const hist = [...z.history];
      hist.push({ time: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), temp: cur });
      if (hist.length > 12) hist.shift();
      return { ...z, current: cur, trend: getTrend(z.current, cur), history: hist };
    }));
    setHumZones(prev => prev.map((z, i) => ({ ...z, value: r0(simPasso(humSims[i])) })));
    setLuxZones(prev => prev.map((z, i) => {
      const lux = r0(simPasso(luxSims[i]));
      const pct = Math.min(r0((lux / 40000) * 100), 100);
      return { ...z, lux, percentage: pct, status: pct < 30 ? 'low' as const : pct > 90 ? 'high' as const : 'optimal' as const };
    }));
    setIrrLines(prev => prev.map((l, i) =>
      l.status === 'running' ? { ...l, flowRate: r1(simPasso(irrFlowSims[i])) } : l
    ));
  }, []);

  // ── Busca dados do servidor ───────────────────────────────
  const buscarServidor = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard-data`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DashboardData = await res.json();

      if (!data.ok || !data.online) {
        // Servidor online mas nenhum dispositivo conectado
        // Mantém simulação mas marca source = servidor
        tickSim();
        setSource('servidor');
        setMqttStatus(data.app?.mqtt || 'desconectado');
        return;
      }

      // Dados reais disponíveis
      const mapped = mapearDashboard(data);
      tickRef.current += 1;

      setTempZones(mapped.temperatureZones);
      setHumZones(mapped.humidityZones);
      setLuxZones(mapped.lightZones);
      setIrrLines(mapped.irrigationLines);
      setDevice(mapped.device);
      setMqttStatus(mapped.mqttStatus);
      setTickCount(tickRef.current);
      setLastUpd(tsNow());
      setSource('servidor');

    } catch {
      // Servidor inacessível → simulação
      tickSim();
      setSource('simulacao');
    }
  }, [tickSim]);

  // ── Inicia simulação ──────────────────────────────────────
  const iniciarSimulacao = useCallback(() => {
    if (simTimerRef.current) return;
    simTimerRef.current = setInterval(tickSim, pollMs);
  }, [tickSim, pollMs]);

  // ── Para simulação ────────────────────────────────────────
  const pararSimulacao = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  // ── Mount / unmount ───────────────────────────────────────
  useEffect(() => {
    // Primeira busca imediata
    buscarServidor();

    // Polling contínuo
    pollTimerRef.current = setInterval(buscarServidor, pollMs);

    // Simulação como fallback se polling falhar
    iniciarSimulacao();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pararSimulacao();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    temperatureZones: tempZones,
    humidityZones:    humZones,
    lightZones:       luxZones,
    irrigationLines:  irrLines,
    plantGrowthData:  initialGrowth,
    lastUpdated:      lastUpd,
    tickCount,
    source,
    mqttStatus,
    device,
    eventos,
    enviarComando,
  };
}
