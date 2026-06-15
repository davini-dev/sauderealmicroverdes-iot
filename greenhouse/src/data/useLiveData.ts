// ─────────────────────────────────────────────────────────────
//  useLiveData.ts — dados reais via WebSocket + fallback simulação
//
//  FLUXO REAL:
//    ESP32-S3 → MQTT → Node.js → WebSocket → React (instantâneo)
//
//  FLUXO FALLBACK (sem servidor ou WS offline):
//    Simulação local idêntica à lógica do firmware .ino
//
//  O hook tenta WebSocket primeiro. Se falhar em 3s ou cair,
//  ativa simulação automaticamente. Quando WS reconecta,
//  volta para dados reais sem recarregar a página.
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
// Em dev: usa proxy do Vite (vite.config.ts → server.proxy)
// Em prod: mesmo origin do React build
const WS_URL = import.meta.env.VITE_WS_URL
  || (window.location.protocol === 'https:' ? 'wss://' : 'ws://')
  + (import.meta.env.VITE_API_HOST || window.location.host)
  + '/ws';

const API_URL = import.meta.env.VITE_API_URL
  || window.location.origin;

// ─── Tipos do payload do servidor ────────────────────────────
interface SensorValor { valor: number | null; ts: string | null; }
interface DeviceInfo  {
  id: string | null; ip: string | null; mac: string | null;
  rssi: number | null; uptime: string | null; uptimeMs: number | null;
  heapFree: number | null; sensores: string | null; modo: string | null; ts: string | null;
}
interface ServerState {
  type:     string;
  ts:       string;
  mqtt:     string;
  sensores: { umidade: SensorValor; temp: SensorValor; ar: SensorValor; luz: SensorValor; neblina: { valor: string | null; ts: string | null }; irrigacao: { valor: string | null; ts: string | null } };
  bandejas: Record<string, { nome: string; umidade: number; ts: string }>;
  device:   DeviceInfo;
  eventos:  Array<{ tipo: string; msg: string; ts: string }>;
  clima:    { atual: Record<string, number> | null; previsao: Record<string, unknown> | null; idadeMinutos: number };
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
  source:           'websocket' | 'simulacao';
  mqttStatus:       string;
  device: {
    id: string; ip: string; rssi: number;
    uptime: string; heapFree: number; modo: string;
  };
  clima: {
    temp: number | null; humidade: number | null;
    chuva: number | null; vento: number | null;
    descricao: string | null; idadeMinutos: number;
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

const WMO_TEXT: Record<number, string> = {
  0:'Sol aberto',1:'Predom. limpo',2:'Parc. nublado',3:'Nublado',
  45:'Neblina',51:'Garoa leve',61:'Chuva leve',63:'Chuva',80:'Chuvas',95:'Tempestade',
};

// ─── HOOK PRINCIPAL ───────────────────────────────────────────
export function useLiveData(): LiveData {
  const wsRef       = useRef<WebSocket | null>(null);
  const tickRef     = useRef(0);
  const histRef     = useRef(initialTemp.map(z => [...z.history]));
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [source,     setSource]     = useState<'websocket' | 'simulacao'>('simulacao');
  const [mqttStatus, setMqttStatus] = useState('desconectado');
  const [eventos,    setEventos]    = useState<LiveData['eventos']>([]);
  const [clima,      setClima]      = useState<LiveData['clima']>({
    temp: null, humidade: null, chuva: null, vento: null, descricao: null, idadeMinutos: 0,
  });
  const [device, setDevice] = useState<LiveData['device']>({
    id: 'SR-2026-A3F1', ip: '---', rssi: -70,
    uptime: '00h 00m 00s', heapFree: 280000, modo: 'simulacao',
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
      return (await res.json()).ok === true;
    } catch { return false; }
  }, []);

  // ── Aplica estado real recebido do servidor ───────────────
  const aplicarEstadoReal = useCallback((state: ServerState) => {
    tickRef.current += 1;
    setTickCount(tickRef.current);
    setLastUpd(tsNow());
    setMqttStatus(state.mqtt);
    setEventos(state.eventos || []);

    // clima
    if (state.clima?.atual) {
      const c = state.clima.atual;
      setClima({
        temp:         c.temperature_2m        ?? null,
        humidade:     c.relative_humidity_2m  ?? null,
        chuva:        c.rain                  ?? null,
        vento:        c.wind_speed_10m         ?? null,
        descricao:    WMO_TEXT[c.weather_code] ?? null,
        idadeMinutos: state.clima.idadeMinutos ?? 0,
      });
    }

    // device
    if (state.device?.id) {
      setDevice({
        id:       state.device.id       || 'SR-2026-A3F1',
        ip:       state.device.ip       || '---',
        rssi:     state.device.rssi     ?? -70,
        uptime:   state.device.uptime   || '---',
        heapFree: state.device.heapFree ?? 0,
        modo:     state.device.modo     || 'real',
      });
    }

    // temperatura — monta zonas com histórico deslizante
    const s = state.sensores;
    const newTemp = tempZones.map((z, i) => {
      const raw = i === 0 ? s.temp?.valor : null;
      // usa valor do sensor principal para zona 0, simula o resto
      const cur = raw !== null && raw !== undefined ? raw : r1(simPasso(tempSims[i]));
      const hist = histRef.current[i];
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
      hist.push({ time: timeStr, temp: cur });
      if (hist.length > 12) hist.shift();
      return { ...z, current: cur, trend: getTrend(z.current, cur), history: [...hist] };
    });
    histRef.current = newTemp.map(z => [...z.history]);
    setTempZones(newTemp);

    // umidade — zona 0 usa sensor real, demais mantêm simulação
    setHumZones(prev => prev.map((z, i) => {
      if (i === 0 && s.ar?.valor !== null && s.ar?.valor !== undefined)
        return { ...z, value: r0(s.ar.valor) };
      return z;
    }));

    // irrigação — atualiza status baseado no comando atual
    const irrOn = s.irrigacao?.valor === 'ON';
    setIrrLines(prev => prev.map((l, i) =>
      i === 0 ? { ...l, status: irrOn ? 'running' as const : 'idle' as const } : l
    ));
  }, [tempZones]);

  // ── Tick de simulação (usado quando WS offline) ───────────
  const tickSim = useCallback(() => {
    tickRef.current += 1;
    setTickCount(tickRef.current);
    setLastUpd(tsNow());

    setTempZones(prev => prev.map((z, i) => {
      const cur = r1(simPasso(tempSims[i]));
      const hist = histRef.current[i];
      hist.push({ time: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), temp: cur });
      if (hist.length > 12) hist.shift();
      return { ...z, current: cur, trend: getTrend(z.current, cur), history: [...hist] };
    }));
    setHumZones(prev => prev.map((z, i) => ({ ...z, value: r0(simPasso(humSims[i])) })));
    setLuxZones(prev => prev.map((z, i) => {
      const lux = r0(simPasso(luxSims[i]));
      const pct = Math.min(r0((lux / 40000) * 100), 100);
      return { ...z, lux, percentage: pct, status: pct < 30 ? 'low' : pct > 90 ? 'high' : 'optimal' };
    }));
    setIrrLines(prev => prev.map((l, i) =>
      l.status === 'running' ? { ...l, flowRate: r1(simPasso(irrFlowSims[i])) } : l
    ));
  }, []);

  // ── Inicia simulação ──────────────────────────────────────
  const iniciarSimulacao = useCallback(() => {
    setSource('simulacao');
    if (simTimerRef.current) return;
    simTimerRef.current = setInterval(tickSim, 3000);
  }, [tickSim]);

  // ── Para simulação ────────────────────────────────────────
  const pararSimulacao = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  // ── Conecta WebSocket ─────────────────────────────────────
  const conectarWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('[WS] conectando a', WS_URL);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    // timeout: se não conectar em 4s → fallback simulação
    const timeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn('[WS] timeout — ativando simulação');
        ws.close();
        iniciarSimulacao();
      }
    }, 4000);

    ws.onopen = () => {
      clearTimeout(timeout);
      console.log('[WS] conectado!');
      setSource('websocket');
      pararSimulacao();
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'state') aplicarEstadoReal(data);
        if (data.type === 'mqtt_status') setMqttStatus(data.mqtt);
      } catch { /* ignora payload inválido */ }
    };

    ws.onclose = () => {
      console.warn('[WS] desconectado — ativando simulação');
      setSource('simulacao');
      iniciarSimulacao();
      // tenta reconectar em 5s
      reconnRef.current = setTimeout(conectarWS, 5000);
    };

    ws.onerror = () => {
      console.warn('[WS] erro de conexão');
      ws.close();
    };
  }, [aplicarEstadoReal, iniciarSimulacao, pararSimulacao]);

  // ── Mount / unmount ───────────────────────────────────────
  useEffect(() => {
    conectarWS();
    return () => {
      wsRef.current?.close();
      pararSimulacao();
      if (reconnRef.current) clearTimeout(reconnRef.current);
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
    clima,
    eventos,
    enviarComando,
  };
}
