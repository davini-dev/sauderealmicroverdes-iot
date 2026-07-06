# 🌱 Saúde Real Microverdes IoT

Automação completa de monitoramento para microverdes usando ESP32, MQTT e React.

## 📋 Arquitetura

```
ESP32-S3 (LilyGo T-Display)
    ↓ WiFi + MQTT (TCP 1883)
ThingsBoard via Gateway-MQTT (broker padrão do projeto)
    ↓
server/ (Node.js — aggregator + HTTP API)
    ↓ /dashboard-data
greenhouse/ (React + Nginx — dashboard web)
```

Toda a stack roda na VPS do Instituto Saúde Real na Hetzner, na Alemanha, com ThingsBoard Edge rodando integrado ao ThingsBoard CE.

## ✨ Características

- ✅ Leitura de sensores: temperatura, umidade do ar, umidade do solo, luminosidade
- ✅ Controle de irrigação e neblina (ON/OFF via MQTT)
- ✅ 5 bandejas monitoradas individualmente (A1, B2, C1, D3, E1)
- ✅ Dashboard web em tempo real (polling 3s)
- ✅ Fallback automático para simulação se servidor indisponível
- ✅ Docker Compose para deploy local
- ✅ Broker MQTT via ThingsBoard/Gateway-MQTT como padrão do projeto
- ✅ Stack hospedada na VPS do Instituto Saúde Real na Hetzner, na Alemanha
- ✅ ThingsBoard Edge integrado ao ThingsBoard CE em produção

## 🚀 Quick Start

### Com Docker (recomendado)

```bash
# Clonar
git clone <repo> && cd sauderealmicroverdes-iot

# Subir tudo
docker compose up -d --build

# Ver logs
docker compose logs -f server

# Parar
docker compose down
```

Acessos:
- **Dashboard**: http://localhost:8080
- **API**: http://localhost:3000/status

### Sem Docker (desenvolvimento)

**Server:**
```bash
cd server
npm install
MQTT_BROKER_URL=<thingsboard-gateway-host> MQTT_BROKER_PORT=1883 node claude_mqtt_render_aggregator.js
```

**Greenhouse:**
```bash
cd greenhouse
npm install
npm run dev
```

## 📁 Estrutura

```
.
├── arduino/
│   └── microverdes.ino          # Firmware ESP32-S3 (LilyGo T-Display)
├── server/
│   ├── claude_mqtt_render_aggregator.js  # Aggregator + HTTP API
│   ├── Dockerfile
│   └── package.json
├── greenhouse/
│   ├── src/                     # React + TypeScript + Tailwind
│   │   ├── App.tsx
│   │   ├── components/          # TemperatureZones, HumidityGauges, etc.
│   │   └── data/
│   │       ├── useLiveData.ts   # Hook: polling /dashboard-data
│   │       └── sampleData.ts    # Dados iniciais / simulação
│   ├── Dockerfile               # Build multi-stage → Nginx
│   └── vite.config.ts
├── docker-compose.yml
└── docs/                        # Documentação auxiliar
```

## 📡 Tópicos MQTT

O ESP32 publica nos seguintes tópicos:

| Tópico | Direção | Payload | Descrição |
|---|---|---|---|
| `microverdes/sensor/temp` | ESP32 → | `"27.5"` | Temperatura (°C) |
| `microverdes/sensor/ar` | ESP32 → | `"72.3"` | Umidade do ar (%) |
| `microverdes/sensor/luz` | ESP32 → | `"12500"` | Luminosidade (lux) |
| `microverdes/sensor/umidade` | ESP32 → | `"65.8"` | Umidade do solo (%) |
| `microverdes/status/neblina` | ESP32 → | `"ON"/"OFF"` | Status neblina |
| `microverdes/cmd/irrigacao` | ESP32 ↔ | `"ON"/"OFF"` | Comando irrigação |
| `microverdes/device/info` | ESP32 → | JSON | Info do dispositivo |
| `microverdes/bandeja/{id}` | ESP32 → | JSON | Umidade por bandeja |

Bandejas: `A1` (Girassol), `B2` (Rabanete), `C1` (Ervilha), `D3` (Brócolis), `E1` (Mostarda)

## 🔧 Configuração

### Variáveis de Ambiente (Server)

| Variável | Padrão | Descrição |
|---|---|---|
| `MQTT_BROKER_URL` | `thingsboard-gateway-host` | Host do broker MQTT do ThingsBoard |
| `MQTT_BROKER_PORT` | `1883` | Porta TCP |
| `PORT` | `3000` | Porta HTTP do servidor |

### ESP32 (Arduino)

Editar no `.ino`:
```cpp
const char* WIFI_SSID = "Internet";
const char* WIFI_PASS = "12345678";
// Broker do ThingsBoard Gateway-MQTT configurado via numpad no boot ou hardcoded
```

## 🌐 API Endpoints

| Endpoint | Método | Descrição |
|---|---|---|
| `/status` | GET | Status completo (dispositivos, sensores, bandejas) |
| `/dashboard-data` | GET | Dados formatados para o dashboard |
| `/devices` | GET | Lista de dispositivos |
| `/sensors` | GET | Agregação de sensores |
| `/bandejas` | GET | Lista de bandejas com umidade |
| `/cmd` | POST | Envia comando MQTT (`{"topico":"microverdes/cmd/irrigacao","valor":"ON"}`) |
| `/health` | GET | Health check (`OK`) |

## 🐳 Docker Compose

```yaml
services:
  server:       # Node.js — porta 3000
  greenhouse:   # Nginx + React — porta 8080
```

O greenhouse faz proxy reverso de `/api/*` para o server.

## 📝 Licença

MIT

## 👤 Autor

Instituto Saúde Real Microverdes — IoT para cultivo sustentável
