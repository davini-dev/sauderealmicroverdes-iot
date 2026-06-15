# 🌱 Instituto Saúde Real — Dashboard IoT

> Painel de monitoramento em tempo real para cultivo de microverdes em Praia Grande, SP.  
> **sauderealmicroverdes.club** · Instituto Saúde Real Microverdes

---

## 📐 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMPO / ESTUFA                           │
│                                                                 │
│  ┌──────────────────────────────┐                              │
│  │   LilyGo T-Display S3        │                              │
│  │   ESP32-S3                   │                              │
│  │                              │                              │
│  │  Sensores simulados:         │                              │
│  │  • DHT22 (temp + umidade)    │                              │
│  │  • LDR   (luminosidade)      │                              │
│  │  • Solo  (umidade substrato) │                              │
│  │                              │                              │
│  │  Display TFT 1.9":           │                              │
│  │  • IP local + broker MQTT    │                              │
│  │  • Uptime do dispositivo     │                              │
│  │  • Últimas 3 publicações     │                              │
│  └──────────┬───────────────────┘                              │
└─────────────┼───────────────────────────────────────────────────┘
              │ MQTT over TLS (porta 8883)
              ▼
┌─────────────────────────┐
│   EMQX Cloud (broker)   │
│   mqtt.emqxsl.com       │
└─────────────┬───────────┘
              │ subscribe tópicos microverdes/#
              ▼
┌──────────────────────────────────────────────────┐
│   Node.js — Render.com                           │
│                                                  │
│   • Recebe mensagens MQTT                        │
│   • Mantém estado em memória                     │
│   • Busca clima Open-Meteo (cache 10 min)        │
│   • WebSocket /ws → push imediato ao dashboard   │
│   • REST GET /dashboard-data  (fallback)         │
│   • REST POST /cmd → publica de volta no MQTT    │
└──────────────────────┬───────────────────────────┘
                       │ WebSocket ws://servidor/ws
                       │ (fallback: polling REST)
                       ▼
┌──────────────────────────────────────────────────┐
│   React + Vite + TypeScript                      │
│   Dashboard Web — sauderealmicroverdes.club      │
│                                                  │
│   useLiveData.ts:                                │
│   • Conecta WebSocket → dados reais              │
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

## 🗂️ Estrutura do Repositório

```
InstitutoSaudeReal-Dashboard/
│
├── firmware/
│   ├── microverdes_esp32c3.ino   # Firmware ESP32-S3 (simulação + MQTT + display)
│   └── User_Setup.h              # Configuração TFT_eSPI para LilyGo T-Display S3
│
├── server/
│   ├── server.js                 # Node.js: MQTT + WebSocket + REST + Open-Meteo
│   ├── package.json
│   └── public/
│       └── index.html            # Dashboard HTML simples (alternativo ao React)
│
├── src/                          # Dashboard React
│   ├── components/
│   │   ├── TemperatureZones.tsx
│   │   ├── HumidityGauges.tsx
│   │   ├── LightLevels.tsx
│   │   ├── IrrigationStatus.tsx
│   │   └── PlantGrowthCharts.tsx
│   ├── data/
│   │   ├── useLiveData.ts        # Hook WebSocket + fallback simulação
│   │   └── sampleData.ts        # Dados iniciais e tipos TypeScript
│   ├── assets/
│   │   └── logo-saude-real.png
│   ├── App.tsx
│   └── main.tsx
│
├── vite.config.ts                # Proxy /ws e /cmd → Node.js em dev
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Como Rodar

### Pré-requisitos

- Node.js ≥ 18
- Conta no [EMQX Cloud](https://www.emqx.com/en/cloud) (free tier funciona)
- Conta no [Render.com](https://render.com) (free tier funciona)
- Arduino IDE ≥ 2.0 com suporte a ESP32-S3

---

### 1. Servidor Node.js (Render.com)

```bash
cd server
npm install
```

Crie um arquivo `.env` (apenas para desenvolvimento local):

```env
MQTT_HOST=seu-broker.emqxsl.com
MQTT_PORT=8883
MQTT_USER=seu_usuario
MQTT_PASS=sua_senha
PORT=3000
```

Rode localmente:

```bash
npm run dev
# Servidor disponível em http://localhost:3000
# WebSocket em      ws://localhost:3000/ws
```

**Deploy no Render.com:**

1. New → Web Service → conecte este repositório
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Adicione as variáveis de ambiente no painel do Render

---

### 2. Dashboard React

```bash
# na raiz do repositório
npm install
```

Crie `.env.local` para apontar para o servidor:

```env
VITE_API_HOST=localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

Em produção (Render.com / Vercel / Netlify):

```env
VITE_API_HOST=seu-servidor.onrender.com
VITE_WS_URL=wss://seu-servidor.onrender.com/ws
```

Rode em desenvolvimento:

```bash
npm run dev
# Vite proxy redireciona /ws automaticamente para o Node.js
```

Build para produção:

```bash
npm run build
# Arquivos em dist/ — copie para server/public/ ou sirva via CDN
```

---

### 3. Firmware ESP32-S3

**Bibliotecas necessárias (Arduino IDE → Library Manager):**

| Biblioteca | Autor |
|---|---|
| TFT_eSPI | Bodmer |
| PubSubClient | Nick O'Leary |
| ArduinoJson | Benoit Blanchon |
| Preferences | built-in ESP32 |

**Configuração do TFT_eSPI:**

Substitua o arquivo `User_Setup.h` dentro da pasta da biblioteca:

```
Windows: Documents\Arduino\libraries\TFT_eSPI\User_Setup.h
Mac/Linux: ~/Arduino/libraries/TFT_eSPI/User_Setup.h
```

Use o arquivo `firmware/User_Setup.h` deste repositório.

**Board settings (Arduino IDE):**

| Parâmetro | Valor |
|---|---|
| Board | ESP32S3 Dev Module |
| Flash Size | 16MB |
| PSRAM | OPI PSRAM |
| USB CDC On Boot | Enabled |

**Configuração no `microverdes_esp32c3.ino`:**

```cpp
const char* WIFI_SSID = "SEU_WIFI";
const char* WIFI_PASS = "SUA_SENHA";
```

O broker MQTT e nome do dispositivo são configurados **na tela do display** ao primeiro boot — sem precisar recompilar.

**Primeiro boot — tela de provisionamento:**

```
┌────────────────────────────────────────┐
│ sauderealmicroverdes.club  CONFIGURAÇÃO│
├────────────────────────────────────────┤
│ Broker MQTT (ip:porta):                │
│ ┌──────────────────────────┐          │
│ │ 192.168.0.[_]:1883       │          │
│ └──────────────────────────┘          │
│ Nome dispositivo:                      │
│ ┌────────────┐                        │
│ │ SR-2026-A3F│                        │
│ └────────────┘                        │
│           BTN0=nav  BTN1=confirmar    │
├────────────────────────────────────────┤
│ [1][2][3][4][5][6][7][8][9][0]        │
│ [DEL]  [CLR]  [.]  [:]  [OK→]        │
└────────────────────────────────────────┘
```

Config salva na NVS — persiste após desligar. Para resetar: segure BTN0 durante o boot.

---

## 📡 Tópicos MQTT

| Tópico | Payload | Direção |
|---|---|---|
| `microverdes/sensor/temp` | `27.3` | ESP32 → broker |
| `microverdes/sensor/ar` | `75.1` | ESP32 → broker |
| `microverdes/sensor/umidade` | `68.4` | ESP32 → broker |
| `microverdes/sensor/luz` | `1200` | ESP32 → broker |
| `microverdes/status/neblina` | `ON` / `OFF` | bidirecional |
| `microverdes/cmd/irrigacao` | `ON` / `OFF` | bidirecional |
| `microverdes/bandeja/A1` | `{"nome":"Girassol A1","umidade":72}` | ESP32 → broker |
| `microverdes/device/info` | `{"id":"SR-2026-A3F1","ip":"...","rssi":-58,"uptime":"01h02m","heap_free":280000}` | ESP32 → broker |

---

## 🌦️ Clima — Open-Meteo

Dados climáticos de Praia Grande, SP buscados automaticamente via [Open-Meteo API](https://open-meteo.com):

- **Gratuito** — sem cadastro, sem API key
- Cache de **10 minutos** no servidor
- Coordenadas: `-24.0059, -46.4028`
- Exibe: temperatura, umidade, chuva, vento, previsão 5 dias
- Alerta automático quando umidade externa > 80% (risco de fungos)

---

## ⚡ WebSocket — Protocolo

O servidor envia um payload JSON a cada mensagem MQTT recebida:

```jsonc
{
  "type": "state",
  "ts": "2026-05-13T14:32:01.000Z",
  "mqtt": "conectado",
  "sensores": {
    "temp":     { "valor": 27.3, "ts": "..." },
    "ar":       { "valor": 75.1, "ts": "..." },
    "umidade":  { "valor": 68.4, "ts": "..." },
    "luz":      { "valor": 1200, "ts": "..." },
    "neblina":  { "valor": "OFF", "ts": "..." },
    "irrigacao":{ "valor": "ON",  "ts": "..." }
  },
  "bandejas": {
    "A1": { "nome": "Girassol A1", "umidade": 72, "ts": "..." }
  },
  "device": {
    "id": "SR-2026-A3F1", "ip": "192.168.0.42",
    "rssi": -58, "uptime": "01h02m33s", "heap_free": 280000
  },
  "eventos": [
    { "tipo": "warn", "msg": "Umidade do ar 86%...", "ts": "..." }
  ],
  "clima": {
    "atual": { "temperature_2m": 25, "relative_humidity_2m": 81, ... },
    "previsao": { ... },
    "idadeMinutos": 3
  }
}
```

O hook `useLiveData.ts` lida com reconexão automática e ativa simulação local como fallback quando o servidor está offline.

---

## 🛠️ Variáveis de Ambiente

### Servidor Node.js

| Variável | Descrição | Exemplo |
|---|---|---|
| `MQTT_HOST` | Host do broker EMQX | `broker.emqxsl.com` |
| `MQTT_PORT` | Porta TLS | `8883` |
| `MQTT_USER` | Usuário MQTT | `microverdes` |
| `MQTT_PASS` | Senha MQTT | `senha123` |
| `PORT` | Porta HTTP/WS | `3000` |

### Dashboard React (Vite)

| Variável | Descrição | Exemplo |
|---|---|---|
| `VITE_API_HOST` | Host do servidor | `meu-server.onrender.com` |
| `VITE_WS_URL` | URL WebSocket completa | `wss://meu-server.onrender.com/ws` |
| `VITE_API_URL` | URL REST base | `https://meu-server.onrender.com` |

---

## 📦 Stack

| Camada | Tecnologia |
|---|---|
| Hardware | LilyGo T-Display S3 (ESP32-S3) |
| Display | TFT 1.9" ST7789 — biblioteca TFT_eSPI |
| Broker MQTT | EMQX Cloud (free tier) |
| Backend | Node.js + Express + ws + mqtt.js |
| Deploy backend | Render.com |
| Clima | Open-Meteo API |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Gráficos | Recharts |

---

## 🤝 Parceria Institucional

<div align="center">

<img src="https://www2.praiagrande.sp.gov.br/files/Brasao/PG-logo-horizontal-cor-inovacao-500x196.png" alt="Prefeitura Municipal de Praia Grande SP" width="320"/>

**Prefeitura Municipal de Praia Grande — SP**

</div>

Este projeto é desenvolvido em parceria com a **Prefeitura Municipal de Praia Grande**, no âmbito do programa de apoio à agricultura urbana e economia solidária do município.

A iniciativa integra a política municipal de segurança alimentar e geração de renda para famílias em situação de vulnerabilidade social, com foco na produção sustentável de microverdes no litoral paulista.

### Objetivos da Parceria

- **Inclusão produtiva** — capacitar famílias vulneráveis como produtoras de microverdes com suporte tecnológico
- **Cadeia econômica local** — conectar produtores a compradores comerciais: VillaMar Shopping, Hampton by Hilton, restaurantes da orla e terminal de cruzeiros de Praia Grande
- **Monitoramento inteligente** — uso de IoT para garantir qualidade, rastreabilidade e eficiência na produção
- **Soberania alimentar** — ampliar o acesso a alimentos frescos e nutritivos na Estância Balneária

### Contato Institucional

| | |
|---|---|
| 🌐 Site oficial | [www2.praiagrande.sp.gov.br](https://www2.praiagrande.sp.gov.br) |
| 📍 Endereço | Av. Presidente Kennedy, 9000 — Vila Mirim, Praia Grande — SP |
| 📧 Serviços digitais | servicosdigitais@praiagrande.sp.gov.br |
| 📱 Instagram | [@prefpraiagrande](https://www.instagram.com/prefpraiagrande) |

---

## 📍 Sobre o Projeto

O **Instituto Saúde Real** é uma iniciativa municipal em Praia Grande, SP, que conecta famílias produtoras de microverdes a compradores comerciais locais — shopping, hotéis, restaurantes da orla e terminal de cruzeiros.

Este dashboard faz parte da infraestrutura de monitoramento da produção, permitindo acompanhar temperatura, umidade, luminosidade e irrigação em tempo real diretamente do celular ou computador.

---

## 📄 Licença

MIT © Instituto Saúde Real Microverdes — Prefeitura de Praia Grande, SP
