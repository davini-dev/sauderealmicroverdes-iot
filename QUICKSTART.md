# 🚀 Quick Start — Saúde Real Microverdes IoT

## Docker (recomendado)

```bash
docker compose up -d --build
```

Acessos:
- Dashboard: http://localhost:8080
- API: http://localhost:3000/status

## Sem Docker

**Server:**
```bash
cd server && npm install
MQTT_BROKER_URL=49.13.124.109 MQTT_BROKER_PORT=1883 node claude_mqtt_render_aggregator.js
```

**Greenhouse:**
```bash
cd greenhouse && npm install && npm run dev
```

## Broker MQTT

- **Host:** ThingsBoard Gateway-MQTT (`49.13.124.109`)
- **Porta:** 1883 (TCP)
- **Autenticação:** usuário `QBlEQkAvzAALcjiCiyxI` e senha em branco
- **Telemetria:** publicação automática em `v1/devices/me/telemetry` a cada 3s quando há dispositivos online
- **Logs:** saída estruturada com timestamps ISO e níveis `[INFO]`, `[WARN]` e `[ERROR]`

## Tópicos

```
microverdes/sensor/temp       → Temperatura (°C)
microverdes/sensor/ar         → Umidade do ar (%)
microverdes/sensor/luz        → Luminosidade (lux)
microverdes/sensor/umidade    → Umidade do solo (%)
microverdes/status/neblina    → Neblina (ON/OFF)
microverdes/cmd/irrigacao     → Irrigação (ON/OFF)
microverdes/device/info       → Info dispositivo (JSON)
microverdes/bandeja/{A1..E1}  → Bandeja (JSON)
```

## API

```bash
curl http://localhost:3000/dashboard-data
curl http://localhost:3000/status
curl -X POST http://localhost:3000/cmd \
  -H "Content-Type: application/json" \
  -d '{"topico":"microverdes/cmd/irrigacao","valor":"ON"}'
```
