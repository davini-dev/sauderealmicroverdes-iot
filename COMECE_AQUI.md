# 🌱 Saúde Real Microverdes IoT — Comece Aqui

Sistema completo de monitoramento para microverdes com ESP32, MQTT e dashboard React.

## 📋 Arquitetura

```
ESP32-S3 (LilyGo T-Display)
    ↓ WiFi + MQTT (TCP 1883)
Broker MQTT: ThingsBoard via Gateway-MQTT (padrão)
    ↓
server/ (Node.js — aggregator + HTTP API)
    ↓ /dashboard-data
greenhouse/ (React + Nginx — dashboard web)
```

## 🚀 Quick Start com Docker

```bash
# Clonar
git clone <repo> && cd sauderealmicroverdes-iot

# Subir tudo
docker compose up -d --build

# Ver logs
docker compose logs -f server

# Acessar
# Dashboard: http://localhost:8080
# API:       http://localhost:3000/status
```

## 📁 Estrutura

```
.
├── arduino/microverdes.ino          # Firmware ESP32-S3
├── server/                          # Node.js aggregator + API
│   ├── claude_mqtt_render_aggregator.js
│   ├── Dockerfile
│   └── package.json
├── greenhouse/                      # React dashboard
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/              # TemperatureZones, HumidityGauges, etc.
│   │   └── data/
│   │       ├── useLiveData.ts       # Hook: polling /dashboard-data
│   │       └── sampleData.ts
│   ├── Dockerfile
│   └── vite.config.ts
├── docker-compose.yml
└── docs/                            # Documentação auxiliar
```

## 🔧 Desenvolvimento Local (sem Docker)

**Server:**
```bash
cd server
npm install
MQTT_BROKER_URL=thingsboard-gateway-host MQTT_BROKER_PORT=1883 node claude_mqtt_render_aggregator.js
```

**Greenhouse:**
```bash
cd greenhouse
npm install
npm run dev
```

## 📡 Tópicos MQTT

| Tópico | Payload | Descrição |
|---|---|---|
| `microverdes/sensor/temp` | `"27.5"` | Temperatura (°C) |
| `microverdes/sensor/ar` | `"72.3"` | Umidade do ar (%) |
| `microverdes/sensor/luz` | `"12500"` | Luminosidade (lux) |
| `microverdes/sensor/umidade` | `"65.8"` | Umidade do solo (%) |
| `microverdes/status/neblina` | `"ON"/"OFF"` | Status neblina |
| `microverdes/cmd/irrigacao` | `"ON"/"OFF"` | Comando irrigação |
| `microverdes/device/info` | JSON | Info do dispositivo |
| `microverdes/bandeja/{id}` | JSON | Umidade por bandeja |

Bandejas: `A1` (Girassol), `B2` (Rabanete), `C1` (Ervilha), `D3` (Brócolis), `E1` (Mostarda)

## 🌐 API Endpoints

| Endpoint | Descrição |
|---|---|
| `GET /status` | Status completo |
| `GET /dashboard-data` | Dados para dashboard |
| `GET /devices` | Lista dispositivos |
| `GET /sensors` | Agregação sensores |
| `GET /bandejas` | Lista bandejas |
| `POST /cmd` | Enviar comando MQTT |
| `GET /health` | Health check |

## 🐳 Docker Compose

```bash
docker compose up -d          # Subir
docker compose up -d --build  # Reconstruir
docker compose logs -f server # Logs
docker compose down           # Parar
```

Portas:
- **8080** — Dashboard React (Nginx)
- **3000** — API Node.js

## 📝 Licença

MIT — Instituto Saúde Real Microverdes
