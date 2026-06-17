# 🌱 Instituto Saúde Real — Dashboard IoT

> Painel de monitoramento em tempo real para cultivo de microverdes em Praia Grande, SP.
> **sauderealmicroverdes.club** · Instituto Saúde Real Microverdes

---

## 📐 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
|                        CAMPO / ESTUFA                           │
│                                                                 │
│  ┌──────────────────────────────┐                              │
│  │   LilyGo T-Display S3        │                              │
│  │   ESP32-S3                   │                              │
│  │                              │                              │
│  │  Sensores simulados:         │                              │
│  │  • Temperatura (°C)          │                              │
│  │  • Umidade do ar (%)         │                              │
│  │  • Umidade do solo (%)       │                              │
│  │  • Luminosidade (lux)        │                              │
│  │                              │                              │
│  │  Display TFT 1.9":           │                              │
│  │  • IP local + broker MQTT    │                              │
│  │  • Uptime do dispositivo     │                              │
│  │  • Últimas 3 publicações     │                              │
│  └──────────┬───────────────────┘                              │
└─────────────┼───────────────────────────────────────────────────┘
              │ MQTT over TCP (porta 1883)
              ▼
┌─────────────────────────┐
│   Broker MQTT externo   │
│   49.13.124.109:1883    │
│   Auth anônima          │
└─────────────┬───────────┘
              │ subscribe tópicos microverdes/#
              ▼
┌──────────────────────────────────────────────────┐
│   Node.js — server/                              │
│                                                  │
│   • Recebe mensagens MQTT                        │
│   • Mantém estado em memória                     │
│   • REST GET /dashboard-data → dados JSON        │
│   • REST GET /status → estado completo           │
│   • REST POST /cmd → publica comando no MQTT     │
└──────────────────────┬───────────────────────────┘
                       │ HTTP polling (3s)
                       ▼
┌──────────────────────────────────────────────────┐
│   React + Vite + TypeScript                      │
│   Dashboard Web — Nginx                          │
│                                                  │
│   useLiveData.ts:                                │
│   • Polling /api/dashboard-data → dados reais    │
│   • Fallback automático → simulação local        │
│   • Reconecta sem recarregar a página            │
│                                                  │
│   Seções:                                        │
│   🌡️ Temperatura por zona                       │
│   💧 Umidade por zona                           │
│   ☀️ Luminosidade                               │
│   🚿 Sistema de irrigação                       │
│   📈 Crescimento das plantas                    │
│   🖥️ Info do dispositivo ESP32-S3               │
└──────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura

```
greenhouse/
├── src/
│   ├── components/
│   │   ├── TemperatureZones.tsx
│   │   ├── HumidityGauges.tsx
│   │   ├── LightLevels.tsx
│   │   ├── IrrigationStatus.tsx
│   │   └── PlantGrowthCharts.tsx
│   ├── data/
│   │   ├── useLiveData.ts        # Hook HTTP polling + fallback simulação
│   │   └── sampleData.ts         # Dados iniciais e tipos TypeScript
│   ├── assets/
│   │   └── logo-saude-real.png
│   ├── App.tsx
│   └── main.tsx
├── Dockerfile                     # Build multi-stage → Nginx
├── vite.config.ts                 # Proxy /api → server
├── package.json
└── tsconfig.json
```

---

## 🚀 Como Rodar

### Com Docker (recomendado)

```bash
# Na raiz do projeto
docker compose up -d --build

# Dashboard: http://localhost:8080
# API:       http://localhost:3000/status
```

### Desenvolvimento Local

```bash
npm install
npm run dev
```

### Build para produção

```bash
npm run build
# Arquivos em dist/
```

---

## 📡 Tópicos MQTT

| Tópico | Payload | Direção |
|---|---|---|
| `microverdes/sensor/temp` | `27.3` | ESP32 → broker |
| `microverdes/sensor/ar` | `75.1` | ESP32 → broker |
| `microverdes/sensor/umidade` | `68.4` | ESP32 → broker |
| `microverdes/sensor/luz` | `12500` | ESP32 → broker |
| `microverdes/status/neblina` | `ON` / `OFF` | bidirecional |
| `microverdes/cmd/irrigacao` | `ON` / `OFF` | bidirecional |
| `microverdes/bandeja/A1` | `{"nome":"Girassol A1","umidade":72}` | ESP32 → broker |
| `microverdes/device/info` | `{"id":"SR-2026-A3F1","ip":"...","rssi":-58,"uptime":"01h02m","heap_free":280000}` | ESP32 → broker |

### Bandejas

| ID | Nome |
|---|---|
| A1 | Girassol |
| B2 | Rabanete |
| C1 | Ervilha |
| D3 | Brócolis |
| E1 | Mostarda |

---

## 🌐 API (server/)

| Endpoint | Método | Descrição |
|---|---|---|
| `/dashboard-data` | GET | Dados formatados para o dashboard |
| `/status` | GET | Status completo |
| `/devices` | GET | Lista dispositivos |
| `/sensors` | GET | Agregação sensores |
| `/bandejas` | GET | Lista bandejas |
| `/cmd` | POST | Enviar comando MQTT |
| `/health` | GET | Health check |

Exemplo de comando:
```bash
curl -X POST http://localhost:3000/cmd \
  -H "Content-Type: application/json" \
  -d '{"topico":"microverdes/cmd/irrigacao","valor":"ON"}'
```

---

## ⚗️ Variáveis de Ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `VITE_API_URL` | URL base da API (vazio = usar /api do nginx) | `` |

---

## 📦 Stack

| Camada | Tecnologia |
|---|---|
| Hardware | LilyGo T-Display S3 (ESP32-S3) |
| Display | TFT 1.9" ST7789 — TFT_eSPI |
| Broker MQTT | 49.13.124.109:1883 (auth anônima) |
| Backend | Node.js + mqtt.js |
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS 4 |
| Gráficos | Recharts |
| Produção | Docker + Nginx |

---

## 🤝 Parceria Institucional

<div align="center">

<img src="https://www2.praiagrande.sp.gov.br/files/Brasao/PG-logo-horizontal-cor-inovacao-500x196.png" alt="Prefeitura Municipal de Praia Grande SP" width="320"/>

**Prefeitura Municipal de Praia Grande — SP**

</div>

Este projeto é desenvolvido em parceria com a **Prefeitura Municipal de Praia Grande**, no âmbito do programa de apoio à agricultura urbana e economia solidária do município.

A iniciativa integra a política municipal de segurança alimentar e geração de renda para famílias em situação de vulnerabilidade social, com foco na produção sustentável de microverdes no litoral paulista.

### Objetivos da Parceria

- **Inclusão produtiva** — capacitar famílias vulneráveis como produtoras de microverdes
- **Cadeia econômica local** — conectar produtores a compradores comerciais
- **Monitoramento inteligente** — IoT para qualidade, rastreabilidade e eficiência
- **Soberania alimentar** — acesso a alimentos frescos e nutritivos

### Contato Institucional

| | |
|---|---|
| 🌐 Site oficial | [www2.praiagrande.sp.gov.br](https://www2.praiagrande.sp.gov.br) |
| 📍 Endereço | Av. Presidente Kennedy, 9000 — Vila Mirim, Praia Grande — SP |
| 📧 Serviços digitais | servicosdigitais@praiagrande.sp.gov.br |
| 📱 Instagram | [@prefpraiagrande](https://www.instagram.com/prefpraiagrande) |

---

## 📄 Licença

MIT © Instituto Saúde Real Microverdes — Prefeitura de Praia Grande, SP
