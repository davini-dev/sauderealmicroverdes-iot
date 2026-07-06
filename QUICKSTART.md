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
MQTT_BROKER_URL=thingsboard-gateway-host node claude_mqtt_render_aggregator.js
```

**Greenhouse:**
```bash
cd greenhouse && npm install && npm run dev
```

## Broker MQTT

- **Host:** ThingsBoard Gateway-MQTT
- **Porta:** 1883 (TCP)
- **Autenticação:** usuário `QBlEQkAvzAALcjiCiyxI` e senha em branco

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
