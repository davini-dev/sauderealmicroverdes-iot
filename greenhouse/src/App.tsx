import { useState } from 'react';
import logoSaudeReal from './assets/logo-saude-real.png';
import TemperatureZones from './components/TemperatureZones';
import HumidityGauges from './components/HumidityGauges';
import LightLevels from './components/LightLevels';
import IrrigationStatus from './components/IrrigationStatus';
import PlantGrowthCharts from './components/PlantGrowthCharts';
import { useLiveData } from './data/useLiveData';

type Tab = 'overview' | 'temperature' | 'humidity' | 'light' | 'irrigation' | 'growth';

const tabs: { key: Tab; label: string; emoji: string }[] = [
  { key: 'overview',    label: 'Visão Geral',  emoji: '🏠' },
  { key: 'temperature', label: 'Temperatura',  emoji: '🌡️' },
  { key: 'humidity',    label: 'Umidade',      emoji: '💧' },
  { key: 'light',       label: 'Luminosidade', emoji: '☀️' },
  { key: 'irrigation',  label: 'Irrigação',    emoji: '🚿' },
  { key: 'growth',      label: 'Crescimento',  emoji: '📈' },
];

function RssiBar({ rssi }: { rssi: number }) {
  const level = rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -75 ? 2 : 1;
  const color  = level >= 3 ? 'bg-emerald-500' : level === 2 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <span className="flex items-end gap-[2px] h-4">
      {[1,2,3,4].map(i => (
        <span key={i} className={`w-1 rounded-sm transition-all duration-500 ${i <= level ? color : 'bg-slate-600'}`}
          style={{ height: `${4 + i*3}px` }} />
      ))}
    </span>
  );
}

function DevicePanel({ device, source, mqttStatus }: {
  device: ReturnType<typeof useLiveData>['device'];
  source: 'servidor' | 'simulacao';
  mqttStatus: string;
}) {
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${source === 'servidor' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Dispositivo ESP32-S3 · LilyGo T-Display
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-amber-400 font-mono">
          {device.modo}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Device ID</p>
          <p className="text-xs font-mono font-bold text-emerald-400">{device.id}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">IP Local</p>
          <p className="text-xs font-mono text-slate-200">{device.ip}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Uptime</p>
          <p className="text-xs font-mono text-amber-400">{device.uptime}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">WiFi RSSI</p>
          <div className="flex items-center gap-2">
            <RssiBar rssi={device.rssi} />
            <span className="text-xs font-mono text-slate-300">{device.rssi} dBm</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">MQTT</p>
          <p className={`text-xs font-mono ${mqttStatus === 'conectado' ? 'text-emerald-400' : 'text-red-400'}`}>
            {mqttStatus === 'conectado' ? '🟢 Conectado' : '🔴 Desconectado'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const live = useLiveData(3000);
  const { temperatureZones, humidityZones, lightZones, irrigationLines, plantGrowthData } = live;

  const avgTemp     = temperatureZones.reduce((s, z) => s + z.current, 0) / temperatureZones.length;
  const avgHumidity = humidityZones.reduce((s, z) => s + z.value, 0) / humidityZones.length;
  const activeIrr   = irrigationLines.filter(l => l.status === 'running').length;
  const alertCount  = irrigationLines.filter(l => l.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-20 min-w-0">
            <div className="flex items-center gap-3 min-w-0 shrink">
              <img src={logoSaudeReal} alt="Saúde Real" className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 object-contain rounded-lg" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight truncate">Instituto Saúde Real Microverdes</h1>
                <p className="text-[10px] sm:text-xs text-slate-500 leading-tight font-medium truncate">Painel de Monitoramento de Estufa</p>
              </div>
            </div>
            <nav className="hidden lg:flex items-center gap-1 shrink-0">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeTab === tab.key ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}>
                  <span>{tab.emoji}</span>{tab.label}
                </button>
              ))}
            </nav>
            <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className={`w-1.5 h-1.5 rounded-full ${live.source === 'servidor' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {live.source === 'servidor' ? 'Dados Reais' : 'Simulação'} · tick #{live.tickCount}
              </div>
              <p className="text-[10px] text-slate-400">{live.lastUpdated}</p>
            </div>
          </div>
        </div>
        <div className="lg:hidden border-t border-slate-100 overflow-x-auto">
          <div className="flex gap-1 px-4 py-1.5">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  activeTab === tab.key ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-500'
                }`}>
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <DevicePanel device={live.device} source={live.source} mqttStatus={live.mqttStatus} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon:'🌡️', label:'Temp. Média',     value:`${avgTemp.toFixed(1).replace('.',',')}°C`,  alert:false },
            { icon:'💧', label:'Umidade Média',   value:`${avgHumidity.toFixed(0)}%`,               alert:false },
            { icon:'🚿', label:'Irrigação Ativa', value:`${activeIrr} ${activeIrr===1?'linha':'linhas'}`, alert:false },
            { icon:'🔔', label:'Alertas',         value:`${alertCount}`,                             alert:alertCount>0 },
          ].map(card => (
            <div key={card.label} className="rounded-xl bg-white border border-slate-200/60 p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
                <span>{card.icon}</span>{card.label}
              </div>
              <p className={`text-2xl font-bold tabular-nums ${card.alert ? 'text-red-600' : 'text-slate-800'}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {(activeTab==='overview'||activeTab==='temperature') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">🌡️ Zonas de Temperatura</h2>
                {activeTab==='overview' && <button onClick={()=>setActiveTab('temperature')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Ver detalhes →</button>}
              </div>
              <TemperatureZones zones={temperatureZones} />
            </section>
          )}
          {(activeTab==='overview'||activeTab==='humidity') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">💧 Níveis de Umidade</h2>
                {activeTab==='overview' && <button onClick={()=>setActiveTab('humidity')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Ver detalhes →</button>}
              </div>
              <HumidityGauges zones={humidityZones} />
            </section>
          )}
          {(activeTab==='overview'||activeTab==='light') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">☀️ Luminosidade</h2>
                {activeTab==='overview' && <button onClick={()=>setActiveTab('light')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Ver detalhes →</button>}
              </div>
              <LightLevels zones={lightZones} />
            </section>
          )}
          {(activeTab==='overview'||activeTab==='irrigation') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">🚿 Status do Sistema de Irrigação</h2>
                {activeTab==='overview' && <button onClick={()=>setActiveTab('irrigation')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Ver detalhes →</button>}
              </div>
              <IrrigationStatus lines={irrigationLines} />
            </section>
          )}
          {(activeTab==='overview'||activeTab==='growth') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">📈 Crescimento das Plantas</h2>
                {activeTab==='overview' && <button onClick={()=>setActiveTab('growth')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Ver detalhes →</button>}
              </div>
              <PlantGrowthCharts data={plantGrowthData} />
            </section>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200/60 bg-white/50 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            <strong className="font-semibold text-slate-700">Instituto Saúde Real Microverdes</strong>
            {' '}· {temperatureZones.length} zonas · {irrigationLines.length} linhas de irrigação
          </p>
          <p className="text-xs text-slate-400">
            {live.source === 'servidor' ? 'Dados reais (ESP32-S3)' : 'Simulação local'} · tick #{live.tickCount} · {live.lastUpdated}
          </p>
        </div>
      </footer>
    </div>
  );
}
