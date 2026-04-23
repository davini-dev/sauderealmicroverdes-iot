# Tópicos MQTT - Versão 2.0

## Visão Geral

A versão 2.0 suporta **múltiplos dispositivos** com **sensores em array**. A estrutura de dados foi redesenhada para permitir escalabilidade horizontal.

### Estrutura de Dados

```javascript
{
  deviceId: {
    id: "esp32_01",
    info: {
      ip: "192.168.1.100",
      mac: "AA:BB:CC:DD:EE:FF",
      rssi: -45,
      uptime: 3600,
      heap_free: 128000
    },
    sensores: [
      { tipo: "umidade", valor: 65, ts: "2024-01-15T10:30:00Z" },
      { tipo: "temperatura", valor: 24.5, ts: "2024-01-15T10:30:00Z" },
      { tipo: "luz", valor: 80, ts: "2024-01-15T10:30:00Z" }
    ],
    online: true,
    lastSeen: "2024-01-15T10:30:00Z",
    firstSeen: "2024-01-15T10:00:00Z"
  }
}
```

## Tópicos MQTT

### 1. Status de Conexão do Dispositivo

**Tópico:** `devices/{deviceId}/online`

**Payload:** `"true"` ou `"false"` (ou `"1"` / `"0"`, `"on"` / `"off"`)

**Descrição:** Indica se o dispositivo está online ou offline. Quando um dispositivo publica `true`, ele é marcado como online e passa a aparecer na API.

**Exemplo:**
```
Topic: devices/esp32_01/online
Payload: true
```

### 2. Informações do Dispositivo

**Tópico:** `devices/{deviceId}/info`

**Payload:** JSON com informações do dispositivo

**Descrição:** Envia informações gerais do dispositivo (IP, MAC, RSSI, uptime, memória livre, etc).

**Exemplo:**
```json
{
  "id": "esp32_01",
  "ip": "192.168.1.100",
  "mac": "AA:BB:CC:DD:EE:FF",
  "rssi": -45,
  "uptime": 3600,
  "heap_free": 128000,
  "model": "ESP32-C3",
  "firmware": "1.0.0"
}
```

### 3. Sensor Individual

**Tópico:** `devices/{deviceId}/sensor/{sensorType}`

**Payload:** Valor do sensor (número ou string)

**Descrição:** Publica o valor de um sensor específico. Cada publicação atualiza ou cria um sensor no array.

**Exemplo:**
```
Topic: devices/esp32_01/sensor/umidade
Payload: 65

Topic: devices/esp32_01/sensor/temperatura
Payload: 24.5

Topic: devices/esp32_01/sensor/luz
Payload: 80
```

### 4. Array Completo de Sensores

**Tópico:** `devices/{deviceId}/sensors`

**Payload:** JSON com array de sensores

**Descrição:** Publica todos os sensores de uma vez. Substitui o array anterior.

**Exemplo:**
```json
[
  { "tipo": "umidade", "valor": 65, "unidade": "%" },
  { "tipo": "temperatura", "valor": 24.5, "unidade": "°C" },
  { "tipo": "luz", "valor": 80, "unidade": "%" },
  { "tipo": "ar", "valor": 55, "unidade": "%" }
]
```

### 5. Comandos para Dispositivo

**Tópico:** `devices/{deviceId}/cmd/{comando}`

**Payload:** Valor do comando

**Descrição:** Envia comandos para o dispositivo. O servidor publica neste tópico, o dispositivo se inscreve e executa.

**Exemplo:**
```
Topic: devices/esp32_01/cmd/irrigacao
Payload: ON

Topic: devices/esp32_01/cmd/neblina
Payload: OFF

Topic: esp32_01/cmd/reset
Payload: 1
```

## Exemplos de Uso

### Exemplo 1: Dispositivo ESP32 Publicando Dados

```cpp
// Conectar e publicar status online
client.publish("devices/esp32_01/online", "true");

// Publicar informações do dispositivo
String info = "{\"ip\":\"192.168.1.100\",\"mac\":\"AA:BB:CC:DD:EE:FF\",\"uptime\":3600}";
client.publish("devices/esp32_01/info", info);

// Publicar sensores individuais
client.publish("devices/esp32_01/sensor/umidade", "65");
client.publish("devices/esp32_01/sensor/temperatura", "24.5");
client.publish("devices/esp32_01/sensor/luz", "80");

// OU publicar array completo
String sensores = "[{\"tipo\":\"umidade\",\"valor\":65},{\"tipo\":\"temperatura\",\"valor\":24.5}]";
client.publish("devices/esp32_01/sensors", sensores);
```

### Exemplo 2: Servidor Node.js Recebendo Dados

```javascript
// GET /devices - Lista todos os dispositivos online
// Retorna apenas dispositivos com online: true

// GET /devices/esp32_01 - Detalhes de um dispositivo específico

// GET /devices/esp32_01/sensors - Apenas os sensores

// POST /cmd - Enviar comando
// Body: { deviceId: "esp32_01", comando: "irrigacao", valor: "ON" }
// Publica em: devices/esp32_01/cmd/irrigacao
```

### Exemplo 3: Cliente MQTT Monitorando

```bash
# Monitorar todos os dispositivos online
mosquitto_sub -h broker.emqx.io -t "devices/+/online"

# Monitorar sensores de um dispositivo específico
mosquitto_sub -h broker.emqx.io -t "devices/esp32_01/sensor/+"

# Monitorar todos os sensores de todos os dispositivos
mosquitto_sub -h broker.emqx.io -t "devices/+/sensor/+"
```

## Compatibilidade com Versão Anterior

A versão 2.0 mantém compatibilidade com os tópicos legados:

- `sensores/umidade` → Cria/atualiza dispositivo "default"
- `sensores/temperatura` → Cria/atualiza dispositivo "default"
- `sensores/luz` → Cria/atualiza dispositivo "default"
- `microverdes/sensor/umidade` → Cria/atualiza dispositivo "default"
- `microverdes/sensor/temp` → Cria/atualiza dispositivo "default"
- `microverdes/sensor/ar` → Cria/atualiza dispositivo "default"
- `microverdes/sensor/luz` → Cria/atualiza dispositivo "default"
- `microverdes/device/info` → Atualiza dispositivo "default"

## Endpoints da API

### GET /status
Retorna informações do servidor (uptime, conexão MQTT, etc).

### GET /devices
Retorna lista de dispositivos **online**.

**Resposta:**
```json
{
  "ok": true,
  "ts": "2024-01-15T10:30:00Z",
  "total": 3,
  "online": 2,
  "offline": 1,
  "devices": [
    {
      "id": "esp32_01",
      "info": { ... },
      "sensores": [ ... ],
      "online": true,
      "lastSeen": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /devices/:deviceId
Retorna detalhes de um dispositivo específico.

### GET /devices/:deviceId/sensors
Retorna apenas os sensores de um dispositivo.

### GET /dashboard-data
Retorna dados para dashboard (compatibilidade).

### POST /cmd
Envia comando para um dispositivo.

**Body:**
```json
{
  "deviceId": "esp32_01",
  "comando": "irrigacao",
  "valor": "ON"
}
```

### GET /eventos
Retorna lista de eventos do sistema.

## Lógica de Exibição

- **Quando há dispositivos online:** Retorna lista de dispositivos com seus sensores
- **Quando NÃO há dispositivos online:** Retorna apenas informações do servidor (uptime, status MQTT, etc)
- **Dispositivos offline:** Não aparecem na lista `/devices`, mas podem ser consultados diretamente via `/devices/:deviceId`

## Migração da Versão 1.0

Se você está usando a versão 1.0, pode:

1. **Continuar usando os tópicos antigos** - Eles funcionarão e criarão um dispositivo "default"
2. **Migrar gradualmente** - Comece a usar os novos tópicos com novos dispositivos
3. **Usar ambos** - Os dois formatos funcionam simultaneamente

Exemplo de migração:

```cpp
// Versão 1.0 (ainda funciona)
client.publish("sensores/umidade", "65");

// Versão 2.0 (novo)
client.publish("devices/esp32_01/sensor/umidade", "65");
```

## Boas Práticas

1. **Use IDs únicos para dispositivos:** `esp32_01`, `esp32_02`, etc
2. **Publique status online ao conectar:** `devices/{deviceId}/online` = `true`
3. **Publique status offline ao desconectar:** Usar MQTT Last Will (LWT)
4. **Use QoS 1 para dados importantes:** `client.publish(topic, payload, { qos: 1 })`
5. **Publique sensores regularmente:** A cada 5-10 segundos é recomendado
6. **Use nomes descritivos para sensores:** `umidade`, `temperatura`, `luz`, `ar`, etc
7. **Inclua unidades nos dados:** `{ "tipo": "temperatura", "valor": 24.5, "unidade": "°C" }`

## Troubleshooting

### Dispositivo não aparece em /devices
- Verifique se publicou `devices/{deviceId}/online` = `true`
- Verifique se o MQTT broker está recebendo as mensagens
- Verifique logs do servidor

### Sensores não aparecem
- Verifique o formato do tópico: `devices/{deviceId}/sensor/{tipo}`
- Verifique se o valor é válido (número ou string)
- Verifique se o dispositivo está online

### Comando não funciona
- Verifique se o dispositivo está online
- Verifique se o dispositivo está inscrito no tópico `devices/{deviceId}/cmd/+`
- Verifique logs do dispositivo

## Referências

- [MQTT Specification](https://mqtt.org/)
- [EMQX Cloud Documentation](https://docs.emqx.com/en/cloud/latest/)
- [PubSubClient Arduino Library](https://github.com/knolleary/pubsubclient)
