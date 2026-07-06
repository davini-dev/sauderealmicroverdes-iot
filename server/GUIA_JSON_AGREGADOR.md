# 📊 JSON Agregador de Sensores - VPS Hetzner

## 🎯 Visão Geral

O serviço Node.js agora funciona como um **agregador de sensores**, coletando dados de múltiplos dispositivos (ESP32s) conectados via MQTT e mantendo um estado centralizado em JSON.

---

## 📡 Endpoints HTTP

### 1. **GET `/status`** (Mais completo)
Retorna o estado completo de TODOS os dispositivos e sensores.

**Exemplo:**
```bash
curl https://seu-app.onrender.com/status
```

**Resposta:**
```json
{
  "app": {
    "nome": "MQTT Sensor Aggregator",
    "versao": "1.0.0",
  "ambiente": "VPS Hetzner (Alemanha)",
    "uptime": 3456,
    "memoria_mb": 45
  },
  "mqtt": {
  "servidor": "thingsboard-gateway-host",
    "porta": 1883,
    "protocolo": "mqtt (TCP)",
    "status": "conectado",
    "certificado": "DigiCert Global Root G2"
  },
  "resumo": {
    "totalDispositivos": 2,
    "totalSensores": 6,
    "totalMensagens": 1234,
    "ultimaAtualização": "2026-03-19T14:30:45.123Z"
  },
  "dispositivos": [
    {
      "id": "ESP32_TEMP",
      "nome": "ESP32 Temperatura",
      "status": "online",
      "ultimaAtualização": "2026-03-19T14:30:45.123Z",
      "sensores": {
        "temperatura": {
          "valor": 25.3,
          "unidade": "C",
          "timestamp": "2026-03-19T14:30:45.123Z"
        },
        "umidade": {
          "valor": 68.5,
          "unidade": "%",
          "timestamp": "2026-03-19T14:30:45.123Z"
        },
        "luz": {
          "valor": 75.2,
          "unidade": "%",
          "timestamp": "2026-03-19T14:30:45.123Z"
        }
      }
    },
    {
      "id": "ESP32_UMID",
      "nome": "ESP32 UMID",
      "status": "online",
      "ultimaAtualização": "2026-03-19T14:30:42.456Z",
      "sensores": {
        "umidade": {
          "valor": 70.2,
          "unidade": "%",
          "timestamp": "2026-03-19T14:30:42.456Z"
        },
        "temperatura": {
          "valor": 26.1,
          "unidade": "C",
          "timestamp": "2026-03-19T14:30:42.456Z"
        },
        "luz": {
          "valor": 80.5,
          "unidade": "%",
          "timestamp": "2026-03-19T14:30:42.456Z"
        }
      }
    }
  ]
}
```

---

### 2. **GET `/devices`** (Lista de dispositivos)
Retorna apenas lista de dispositivos conectados.

**Exemplo:**
```bash
curl https://seu-app.onrender.com/devices
```

**Resposta:**
```json
{
  "total": 2,
  "dispositivos": [
    {
      "id": "ESP32_TEMP",
      "nome": "ESP32 Temperatura",
      "status": "online",
      "ultimaAtualização": "2026-03-19T14:30:45.123Z",
      "sensorQuantidade": 3,
      "sensoresConectados": [
        "temperatura",
        "umidade",
        "luz"
      ]
    },
    {
      "id": "ESP32_UMID",
      "nome": "ESP32 UMID",
      "status": "online",
      "ultimaAtualização": "2026-03-19T14:30:42.456Z",
      "sensorQuantidade": 3,
      "sensoresConectados": [
        "umidade",
        "temperatura",
        "luz"
      ]
    }
  ]
}
```

---

### 3. **GET `/sensors`** (Agregação de sensores)
Retorna sensores agrupados por tipo (todos os dispositivos).

**Exemplo:**
```bash
curl https://seu-app.onrender.com/sensors
```

**Resposta:**
```json
{
  "total": 3,
  "sensores": {
    "temperatura": [
      {
        "dispositivo": "ESP32_TEMP",
        "valor": 25.3,
        "unidade": "C",
        "timestamp": "2026-03-19T14:30:45.123Z"
      },
      {
        "dispositivo": "ESP32_UMID",
        "valor": 26.1,
        "unidade": "C",
        "timestamp": "2026-03-19T14:30:42.456Z"
      }
    ],
    "umidade": [
      {
        "dispositivo": "ESP32_TEMP",
        "valor": 68.5,
        "unidade": "%",
        "timestamp": "2026-03-19T14:30:45.123Z"
      },
      {
        "dispositivo": "ESP32_UMID",
        "valor": 70.2,
        "unidade": "%",
        "timestamp": "2026-03-19T14:30:42.456Z"
      }
    ],
    "luz": [
      {
        "dispositivo": "ESP32_TEMP",
        "valor": 75.2,
        "unidade": "%",
        "timestamp": "2026-03-19T14:30:45.123Z"
      },
      {
        "dispositivo": "ESP32_UMID",
        "valor": 80.5,
        "unidade": "%",
        "timestamp": "2026-03-19T14:30:42.456Z"
      }
    ]
  }
}
```

---

### 4. **GET `/health`** (Health check)
Para monitoramento com UptimeRobot.

**Resposta:**
```
OK
```

---

## 🏗️ Fluxo de Dados

```
ESP32_1 (MQTT)          ESP32_2 (MQTT)
├─ sensores/umidade     ├─ sensores/umidade
├─ sensores/temperatura ├─ sensores/temperatura
└─ sensores/luz         └─ sensores/luz
    ↓                       ↓
    └───────────┬───────────┘
                ↓
    Broker MQTT ThingsBoard Gateway-MQTT
                ↓
    Node.js (VPS Hetzner)
    ├─ Recebe MQTT
    ├─ Agrega em JSON
    └─ Mantém estado
                ↓
    HTTP Endpoints
    ├─ /status  (completo)
    ├─ /devices (dispositivos)
    ├─ /sensors (agregação)
    └─ /health  (check)
                ↓
    Frontend / Dashboard / API
```

---

## 📝 Estrutura de Dados Interna

```javascript
// Estado interno do agregador
{
  dispositivos: {
    "ESP32_TEMP": {
      id: "ESP32_TEMP",
      nome: "ESP32 Temperatura",
      status: "online",
      ultimaAtualização: "2026-03-19T14:30:45.123Z",
      sensores: {
        temperatura: { valor: 25.3, unidade: "C", timestamp: "..." },
        umidade: { valor: 68.5, unidade: "%", timestamp: "..." },
        luz: { valor: 75.2, unidade: "%", timestamp: "..." }
      }
    },
    "ESP32_UMID": { ... }
  },
  ultimaAtualizacao: "2026-03-19T14:30:45.123Z",
  totalMensagens: 1234
}
```

---

## 🔄 Ciclo de Vida

### 1️⃣ Dispositivo se conecta (ESP32)
```
ESP32 publica em:
- sensores/umidade
- sensores/temperatura
- sensores/luz
```

### 2️⃣ Node.js recebe e agrega
```javascript
// Mensagem recebida
{
  "valor": 25.3,
  "unidade": "C",
  "timestamp": 1234,
  "sensor": "ESP32_TEMP"
}

// Atualiza estado interno
estado.dispositivos["ESP32_TEMP"].sensores.temperatura = {
  valor: 25.3,
  unidade: "C",
  timestamp: "2026-03-19T14:30:45.123Z"
}
```

### 3️⃣ Frontend acessa via HTTP
```bash
curl /status
→ JSON com todos os dispositivos e sensores
```

---

## 🔍 Exemplos de Uso

### Obter temperatura de um dispositivo específico
```javascript
fetch('/status')
  .then(r => r.json())
  .then(data => {
    const temp = data.dispositivos[0].sensores.temperatura.valor;
    console.log(`Temperatura: ${temp}°C`);
  });
```

### Agregar temperaturas de todos os dispositivos
```javascript
fetch('/sensors')
  .then(r => r.json())
  .then(data => {
    const temperaturas = data.sensores.temperatura;
    const media = temperaturas.reduce((a, b) => a + b.valor, 0) / temperaturas.length;
    console.log(`Temperatura média: ${media.toFixed(2)}°C`);
  });
```

### Listar dispositivos conectados
```javascript
fetch('/devices')
  .then(r => r.json())
  .then(data => {
    data.dispositivos.forEach(dev => {
      console.log(`${dev.id}: ${dev.sensorQuantidade} sensores`);
    });
  });
```

---

## ✨ Recursos Principais

✅ **Multi-dispositivos** - Suporta N dispositivos ESP32 simultaneamente  
✅ **Agregação automática** - Agrupa sensores por tipo  
✅ **Timestamp completo** - Cada leitura tem data/hora  
✅ **Status em tempo real** - JSON sempre atualizado  
✅ **Endpoints RESTful** - 4 endpoints diferentes para diferentes necessidades  
✅ **TLS/SSL** - Conexão MQTT segura (porta 8883)  

---

## 🚀 Deploy no Render

```bash
# Package.json
"start": "node claude_mqtt_render_aggregator.js"

# Environment variables
MQTT_BROKER_URL=thingsboard-gateway-host
MQTT_BROKER_PORT=1883
MQTT_USER=QBlEQkAvzAALcjiCiyxI
MQTT_PASSWORD=
NODE_ENV=production
```

---

## 📊 Caso de Uso Real

**Sistema de Microverdes em Praia Grande, SP:**

```
Estufa 1 (ESP32_ESTUFA1)
├─ Umidade: 68.5%
├─ Temperatura: 25.3°C
└─ Luz: 75.2%

Estufa 2 (ESP32_ESTUFA2)
├─ Umidade: 70.2%
├─ Temperatura: 26.1°C
└─ Luz: 80.5%

Pomar (ESP32_POMAR)
├─ Umidade: 72.1%
├─ Temperatura: 24.8°C
└─ Luz: 78.3%

         ↓ (Node.js agrega)

Dashboard Web:
┌─────────────────────────────┐
│ Status: 3 dispositivos      │
│ 9 sensores monitorando      │
│                             │
│ 📊 Resumo:                  │
│ Temp média: 25.4°C          │
│ Umidade média: 70.3%        │
│ Luz média: 78.0%            │
└─────────────────────────────┘
```

---

## 🔧 Próximos Passos

1. Implementar dashboard em React/Vue
2. Adicionar autenticação (JWT)
3. Implementar banco de dados (histórico)
4. Criar alertas (temperatura muito alta, etc)
5. Integração com Telegram/WhatsApp

---

**Arquivo:** `claude_mqtt_render_aggregator.js`  
**Endpoints:** 4 (/status, /devices, /sensors, /health)  
**Protocolo:** MQTTS (TLS/SSL) porta 8883  
**Dispositivos:** Ilimitado  
**Sensores por dispositivo:** Ilimitado  
**Status:** ✅ Pronto para produção
