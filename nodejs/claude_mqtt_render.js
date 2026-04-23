/*
  Claude Code + MQTT TLS/SSL + Render.com
  Versão 2.0: Suporte a múltiplos dispositivos com sensores em array
  
  Estrutura de dados:
  - Dispositivos são armazenados em um mapa (Map)
  - Cada dispositivo tem um array de sensores
  - Dispositivos aparecem apenas quando online (via MQTT)
  - Quando nenhum dispositivo está online, mostra apenas info do servidor

  Dependências:
  npm install mqtt dotenv express cors

  Variáveis de ambiente (.env):
  MQTT_BROKER_URL=mqtt.seu-id.emqx.cloud
  MQTT_BROKER_PORT=8883
  MQTT_USER=esp32
  MQTT_PASSWORD=mhda
  PORT=3000
*/

require('dotenv').config();
const mqtt = require('mqtt');
const express = require('express');
const cors = require('cors');
const path = require('path');

// ==================== APP HTTP ====================
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// ==================== CERTIFICADO SSL/TLS ====================
// Certificado DigiCert Global Root G2 (EMQX Cloud)
const CA_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBHMjCCASIwDQYJKoZI
hvcNAQEBBQADggEPADCCAQoCggEBALs3zTTce2vJsmiQrUpx/0a6IQoIjfUZVMn7
iNvzrvI6iZE8+uqrBhpr76wt6F4JJEi6Ypp+1qOofeAUdSAFrFCznGMabDDc2h8Z
sddewv3X4MuUgzeu7B9DTd17LNK9LqUv5Km4rTrUmaT2JembaQBgkmD/TyFJGPdn
kKthBpyP8rrptOmSMmu18/foXRvNjBWrlQSVSfM1LZbjSW3d9+P7SUu0rFUHqY+V
s7Qju0xtRfD2qbKVMLT9TFWMJ0pXFHyCnc1zktMWygYMjFDRjx4JvhehxiHK/YPl
ELyDpQrEZyj2cxQUPUZ2w4cUiSE0Ta8PRQymSKG6u5zFsTODKYUCAwEAAaNCMEAw
DwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAYYwHQYDVR0OBBYEFEhiVCAY
lebjbuYP+vq5Eu0GF485MA0GCSqGSIb3DQEBCwUAA4IBAQBAZ4iUb3IIY+sxXepp
GNWJfTzFi0p/6b7bKxf/sF9zdyoiEzmBZ0KEI/JFZzXsiL/4j7BhDDSkriBMhMbb
8DXhe1nfpkKrxwQIhn82dCRa2mwNFFE1vvJJ3bYf++ElLtKxVB6mPlbO0I7tMbUX
w+qmypXC0/UxVjCdKVxR8gp3Nc5LTFkqGDIxQ0aeHgm+F6HmIcr9g+UQvIOlCsRn
KPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMWLSn/pvtsrF9+wX3N3KjITOYFnQoQj8kVnNeyIv/iPsGEMNKSuIEyExtv4
NeF22d+mQrvHRAiGfzZ0JFrabA0UWTW98kndth/Jsw1HKj2ZL7tcu7XUIOGZX1NG
Fdtom/DzMNU+MeKNhJ7jitralj41E6Vf8PlwUHBHQRFXGU7Aj64GxJUTFy8bJZ91
8rGOmaFvE7FBcf6IKshPECBV1/MUReXgRPTqh5Uykw7+U0b6LJ3/iyK5S9kJRaTe
pLiaWN0bfVKfjllDiIGknibVb63dDcY3fe0Dkhvld1927jyNxF1WW6LZZm6zNTfl
MrY=
-----END CERTIFICATE-----`;

// ==================== MQTT CONFIG COM TLS/SSL ====================
const BROKER_URL = process.env.MQTT_BROKER_URL || 'xda56908.ala.us-east-1.emqxsl.com';
const BROKER_PORT = parseInt(process.env.MQTT_BROKER_PORT || '8883', 10);

const MQTT_OPTIONS = {
  clientId: 'claude_render_' + Date.now(),
  username: process.env.MQTT_USER || 'esp32',
  password: process.env.MQTT_PASSWORD || 'mhda',

  protocol: 'mqtts',
  port: BROKER_PORT,
  ca: [CA_CERTIFICATE],
  rejectUnauthorized: true,

  clean: true,
  reconnectPeriod: 5000,
  keepalive: 120,
  connectTimeout: 10000,

  will: {
    topic: 'status/claude_render',
    payload: JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString()
    }),
    qos: 1,
    retain: true
  }
};

// ==================== ESTADO ====================
// Mapa de dispositivos: { deviceId: { info, sensores[], online, lastSeen } }
let devices = new Map();

// Informações do servidor
let serverInfo = {
  startTime: new Date(),
  uptime: 0,
  mqttStatus: 'desconectado',
  conexaoAtiva: false
};

let eventos = [];

// ==================== UTIL ====================
function addEvento(tipo, msg) {
  eventos.unshift({ tipo, msg, ts: new Date().toISOString() });
  if (eventos.length > 50) eventos.pop();
}

/**
 * Registra ou atualiza um dispositivo
 * @param {string} deviceId - ID único do dispositivo
 * @param {object} data - Dados do dispositivo
 */
function updateDevice(deviceId, data) {
  if (!devices.has(deviceId)) {
    devices.set(deviceId, {
      id: deviceId,
      info: {},
      sensores: [],
      online: false,
      lastSeen: null,
      firstSeen: new Date().toISOString()
    });
  }

  const device = devices.get(deviceId);
  const agora = new Date().toISOString();

  if (data.info) {
    device.info = { ...device.info, ...data.info };
  }

  if (data.sensor) {
    // Adicionar ou atualizar sensor no array
    const sensorIndex = device.sensores.findIndex(s => s.tipo === data.sensor.tipo);
    if (sensorIndex >= 0) {
      device.sensores[sensorIndex] = { ...data.sensor, ts: agora };
    } else {
      device.sensores.push({ ...data.sensor, ts: agora });
    }
  }

  if (data.online !== undefined) {
    device.online = data.online;
  }

  device.lastSeen = agora;

  return device;
}

/**
 * Retorna apenas os dispositivos que estão online
 */
function getOnlineDevices() {
  const online = [];
  devices.forEach((device, deviceId) => {
    if (device.online) {
      online.push({ id: deviceId, ...device });
    }
  });
  return online;
}

/**
 * Retorna informações do servidor
 */
function getServerInfo() {
  return {
    status: 'online',
    app: 'microverdes-iot-tls',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    startTime: serverInfo.startTime.toISOString(),
    conexao: {
      mqtt: serverInfo.conexaoAtiva ? 'conectado (TLS/SSL 8883)' : 'desconectado',
      certificado: 'DigiCert Global Root G2',
      broker: BROKER_URL
    },
    dispositivos: {
      total: devices.size,
      online: getOnlineDevices().length,
      offline: devices.size - getOnlineDevices().length
    }
  };
}

// ==================== MQTT CONNECTION ====================
console.log('\n╔════════════════════════════════════════════════╗');
console.log('║  🌱 Microverdes IoT v2.0 + Render + EMQX      ║');
console.log('║  Suporte a múltiplos dispositivos              ║');
console.log('╚════════════════════════════════════════════════╝\n');

console.log(`📡 Configuração MQTT:`);
console.log(`   Protocolo: mqtts (TLS/SSL)`);
console.log(`   Servidor: ${BROKER_URL}`);
console.log(`   Porta: ${BROKER_PORT}`);
console.log(`   Usuário: ${MQTT_OPTIONS.username}`);
console.log(`   Certificado: DigiCert Global Root G2`);
console.log(`   Validação: ${MQTT_OPTIONS.rejectUnauthorized ? 'SIM' : 'NÃO'}\n`);

const brokerUrl = `mqtts://${BROKER_URL}:${BROKER_PORT}`;
console.log(`🔗 Conectando a: ${brokerUrl}\n`);

const client = mqtt.connect(brokerUrl, MQTT_OPTIONS);

client.on('connect', () => {
  console.log('✅ Conectado ao EMQX Cloud com TLS/SSL!');
  console.log(`   🔒 Conexão segura (cifra: TLS 1.2+)`);
  console.log(`   📅 ${new Date().toLocaleTimeString('pt-BR')}\n`);

  serverInfo.conexaoAtiva = true;
  serverInfo.mqttStatus = 'conectado';

  const statusPayload = {
    status: 'online',
    timestamp: new Date().toISOString(),
    conexao: 'mqtts://8883',
    certificado: 'DigiCert Global Root G2',
    hostname: process.env.RENDER_EXTERNAL_HOSTNAME || 'local'
  };

  client.publish(
    'status/claude_render',
    JSON.stringify(statusPayload),
    { retain: true }
  );

  // Inscrever em tópicos dinâmicos para múltiplos dispositivos
  client.subscribe([
    // Tópicos legados (compatibilidade)
    'sensores/umidade',
    'sensores/temperatura',
    'sensores/luz',
    'irrigacao/status',

    // Tópicos do segundo arquivo (compatibilidade)
    'microverdes/sensor/umidade',
    'microverdes/sensor/temp',
    'microverdes/sensor/ar',
    'microverdes/sensor/luz',
    'microverdes/status/neblina',
    'microverdes/cmd/irrigacao',
    'microverdes/bandeja/+',
    'microverdes/device/info',

    // NOVOS: Tópicos para múltiplos dispositivos
    'devices/+/online',           // devices/{deviceId}/online -> "true" ou "false"
    'devices/+/info',             // devices/{deviceId}/info -> JSON com info do dispositivo
    'devices/+/sensor/+',         // devices/{deviceId}/sensor/{sensorType} -> valor
    'devices/+/sensors',          // devices/{deviceId}/sensors -> JSON com array de sensores
    'devices/+/cmd/+',            // devices/{deviceId}/cmd/{comando} -> valor
  ]);

  console.log('📡 Inscrito em tópicos (legados + novos)\n');
  addEvento('info', 'MQTT conectado ao broker EMQX.');
});

client.on('message', (topic, message) => {
  const raw = message.toString();
  const agora = new Date();

  // ===== NOVOS TÓPICOS: Múltiplos dispositivos =====
  
  // devices/{deviceId}/online
  const matchOnline = topic.match(/^devices\/([^/]+)\/online$/);
  if (matchOnline) {
    const deviceId = matchOnline[1];
    const isOnline = raw === 'true' || raw === '1' || raw === 'on';
    updateDevice(deviceId, { online: isOnline });
    console.log(`[${agora.toLocaleTimeString('pt-BR')}] 🔌 ${deviceId}: ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
    if (isOnline) {
      addEvento('info', `Dispositivo ${deviceId} conectado.`);
    } else {
      addEvento('warn', `Dispositivo ${deviceId} desconectado.`);
    }
    return;
  }

  // devices/{deviceId}/info
  const matchInfo = topic.match(/^devices\/([^/]+)\/info$/);
  if (matchInfo) {
    const deviceId = matchInfo[1];
    try {
      const info = JSON.parse(raw);
      updateDevice(deviceId, { info, online: true });
      console.log(`[${agora.toLocaleTimeString('pt-BR')}] ℹ️  ${deviceId}: Info atualizado`);
      return;
    } catch (err) {
      console.warn(`[DEVICE INFO] payload inválido: ${raw}`);
      return;
    }
  }

  // devices/{deviceId}/sensor/{sensorType}
  const matchSensor = topic.match(/^devices\/([^/]+)\/sensor\/([^/]+)$/);
  if (matchSensor) {
    const deviceId = matchSensor[1];
    const sensorType = matchSensor[2];
    const valor = parseFloat(raw) || raw;

    updateDevice(deviceId, {
      sensor: { tipo: sensorType, valor },
      online: true
    });

    console.log(`[${agora.toLocaleTimeString('pt-BR')}] 📊 ${deviceId}/${sensorType}: ${valor}`);
    return;
  }

  // devices/{deviceId}/sensors (array completo)
  const matchSensors = topic.match(/^devices\/([^/]+)\/sensors$/);
  if (matchSensors) {
    const deviceId = matchSensors[1];
    try {
      const sensoresArray = JSON.parse(raw);
      const device = devices.get(deviceId) || updateDevice(deviceId, {});
      device.sensores = Array.isArray(sensoresArray) ? sensoresArray : [];
      device.online = true;
      device.lastSeen = agora.toISOString();
      console.log(`[${agora.toLocaleTimeString('pt-BR')}] 📊 ${deviceId}: ${device.sensores.length} sensores`);
      return;
    } catch (err) {
      console.warn(`[SENSORS] payload inválido: ${raw}`);
      return;
    }
  }

  // ===== TÓPICOS LEGADOS (compatibilidade com versão anterior) =====
  if (topic === 'sensores/umidade') {
    // Criar dispositivo padrão "default"
    updateDevice('default', {
      sensor: { tipo: 'umidade', valor: parseFloat(raw) },
      online: true
    });
  } else if (topic === 'sensores/temperatura') {
    updateDevice('default', {
      sensor: { tipo: 'temperatura', valor: parseFloat(raw) },
      online: true
    });
  } else if (topic === 'sensores/luz') {
    updateDevice('default', {
      sensor: { tipo: 'luz', valor: parseFloat(raw) },
      online: true
    });
  } else if (topic === 'microverdes/sensor/umidade') {
    updateDevice('default', {
      sensor: { tipo: 'umidade', valor: parseFloat(raw) },
      online: true
    });
  } else if (topic === 'microverdes/sensor/temp') {
    updateDevice('default', {
      sensor: { tipo: 'temperatura', valor: parseFloat(raw) },
      online: true
    });
  } else if (topic === 'microverdes/sensor/ar') {
    updateDevice('default', {
      sensor: { tipo: 'ar', valor: parseFloat(raw) },
      online: true
    });
  } else if (topic === 'microverdes/sensor/luz') {
    updateDevice('default', {
      sensor: { tipo: 'luz', valor: parseFloat(raw) },
      online: true
    });
  } else if (topic === 'microverdes/device/info') {
    try {
      const info = JSON.parse(raw);
      updateDevice('default', { info, online: true });
    } catch {
      console.warn('[DEVICE] payload inválido:', raw);
    }
  }

  const nomeTopic = topic.split('/').slice(-1)[0].toUpperCase();
  console.log(`[${agora.toLocaleTimeString('pt-BR')}] 📊 ${nomeTopic}: ${raw}`);
});

client.on('error', (err) => {
  console.error('\n❌ Erro MQTT:', err.message);
  serverInfo.conexaoAtiva = false;
  serverInfo.mqttStatus = 'erro';

  if (err.code === 'ECONNREFUSED') {
    console.error('   ❌ Conexão recusada');
    console.error('   → Servidor offline?');
    console.error('   → Porta 8883 bloqueada?');
  } else if (err.code === 'CERT_HAS_EXPIRED') {
    console.error('   ❌ Certificado expirado');
    console.error('   → Atualizar certificado DigiCert');
  } else if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    console.error('   ❌ Certificado não pode ser verificado');
    console.error('   → Certificado incorreto ou corrompido');
  } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
    console.error('   ❌ DNS resolution falhou');
    console.error('   → Verificar endereço do broker');
  } else if (err.message.includes('4') || err.message.includes('Unauthorized')) {
    console.error('   ❌ Autenticação falhou');
    console.error('   → Username/senha incorretos?');
    console.error('   → Variáveis de ambiente configuradas?');
  }

  console.error(`   Código: ${err.code || 'desconhecido'}\n`);
});

client.on('disconnect', () => {
  console.log('\n⚠️  Desconectado do EMQX Cloud');
  serverInfo.conexaoAtiva = false;
  serverInfo.mqttStatus = 'desconectado';
});

client.on('offline', () => {
  serverInfo.mqttStatus = 'offline';
});

client.on('reconnect', () => {
  console.log('🔄 Reconectando ao EMQX Cloud...');
});

client.on('close', () => {
  console.log('🔌 Conexão fechada\n');
  serverInfo.conexaoAtiva = false;
  serverInfo.mqttStatus = 'fechado';
});

// ==================== ROTAS HTTP ====================

/**
 * GET /status
 * Retorna status do servidor
 */
app.get(['/', '/status'], (req, res) => {
  res.status(200).json(getServerInfo());
});

/**
 * GET /health
 * Health check simples
 */
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

/**
 * GET /devices
 * Retorna lista de dispositivos (apenas online)
 */
app.get('/devices', (req, res) => {
  const onlineDevices = getOnlineDevices();
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    total: devices.size,
    online: onlineDevices.length,
    offline: devices.size - onlineDevices.length,
    devices: onlineDevices
  });
});

/**
 * GET /devices/:deviceId
 * Retorna detalhes de um dispositivo específico
 */
app.get('/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const device = devices.get(deviceId);

  if (!device) {
    return res.status(404).json({ erro: 'Dispositivo não encontrado' });
  }

  res.json({
    ok: true,
    ts: new Date().toISOString(),
    device: { id: deviceId, ...device }
  });
});

/**
 * GET /devices/:deviceId/sensors
 * Retorna apenas os sensores de um dispositivo
 */
app.get('/devices/:deviceId/sensors', (req, res) => {
  const { deviceId } = req.params;
  const device = devices.get(deviceId);

  if (!device) {
    return res.status(404).json({ erro: 'Dispositivo não encontrado' });
  }

  res.json({
    ok: true,
    ts: new Date().toISOString(),
    deviceId,
    sensores: device.sensores
  });
});

/**
 * GET /dashboard-data
 * Retorna dados para dashboard (compatibilidade com versão anterior)
 */
app.get('/dashboard-data', async (_req, res) => {
  const onlineDevices = getOnlineDevices();

  res.json({
    ok: true,
    ts: new Date().toISOString(),
    mqtt: serverInfo.mqttStatus,
    server: getServerInfo(),
    dispositivos: {
      total: devices.size,
      online: onlineDevices.length,
      offline: devices.size - onlineDevices.length,
      lista: onlineDevices
    },
    eventos: eventos.slice(0, 20)
  });
});

/**
 * POST /cmd
 * Enviar comando para um dispositivo
 * Body: { deviceId, comando, valor }
 */
app.post('/cmd', (req, res) => {
  const { deviceId, comando, valor } = req.body;

  if (!deviceId || !comando || valor === undefined) {
    return res.status(400).json({ 
      erro: 'deviceId, comando e valor são obrigatórios' 
    });
  }

  const device = devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ erro: 'Dispositivo não encontrado' });
  }

  if (!device.online) {
    return res.status(503).json({ erro: 'Dispositivo offline' });
  }

  const topico = `devices/${deviceId}/cmd/${comando}`;
  
  client.publish(topico, String(valor), { qos: 1 }, (err) => {
    if (err) return res.status(500).json({ erro: err.message });

    addEvento('info', `Comando: ${deviceId}/${comando} = ${valor}`);
    res.json({ ok: true, deviceId, comando, valor });
  });
});

/**
 * GET /ping
 * Simples ping
 */
app.get('/ping', (_req, res) => {
  res.send('pong');
});

/**
 * GET /eventos
 * Retorna lista de eventos
 */
app.get('/eventos', (req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    total: eventos.length,
    eventos
  });
});

// ==================== MONITORAMENTO ====================
setInterval(() => {
  const uptime = Math.floor(process.uptime());
  const memoria = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const onlineCount = getOnlineDevices().length;

  console.log(`\n📊 Status (uptime: ${uptime}s, memória: ${memoria}MB)`);
  console.log(`   Dispositivos: ${devices.size} total, ${onlineCount} online`);
  console.log(`   MQTT: ${serverInfo.conexaoAtiva ? '🟢 Conectado (TLS)' : '🔴 Desconectado'}`);
  console.log(`   Última atualização: ${new Date().toLocaleTimeString('pt-BR')}\n`);
}, 300000);

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('\n📦 Recebido SIGTERM - encerrando gracefully...');

  if (serverInfo.conexaoAtiva) {
    client.publish('status/claude_render', JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString()
    }));
  }

  client.end(false, () => {
    console.log('✅ MQTT desconectado');
  });

  server.close(() => {
    console.log('✅ HTTP server fechado');
    process.exit(0);
  });

  setTimeout(() => {
    console.log('⚠️  Força saída após 10s');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('\n👋 Encerrando por SIGINT...');
  process.emit('SIGTERM');
});

process.on('uncaughtException', (err) => {
  console.error('\n❌ Exceção não tratada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ Promise rejection não tratada:', reason);
});

// ==================== STARTUP HTTP ====================
const server = app.listen(port, () => {
  console.log(`📡 Server HTTP rodando em http://localhost:${port}`);
  console.log(`   Status: http://localhost:${port}/status`);
  console.log(`   Health: http://localhost:${port}/health`);
  console.log(`   Dispositivos: http://localhost:${port}/devices`);
  console.log(`   Dashboard: http://localhost:${port}/dashboard-data`);
  console.log(`   Eventos: http://localhost:${port}/eventos`);
  console.log(`   Ping: http://localhost:${port}/ping\n`);
});

console.log('🌱 Microverdes IoT v2.0 rodando no Render.com');
console.log('   Ambiente:', process.env.NODE_ENV || 'production');
console.log('   Render:', process.env.RENDER ? 'Sim ✓' : 'Não (local)');
console.log();

setTimeout(() => {
  if (!serverInfo.conexaoAtiva) {
    console.warn('\n⚠️  Aviso: MQTT não conectou após 15s');
    console.warn('   Verificar:');
    console.warn('   - Servidor está online');
    console.warn('   - Credenciais corretas (MQTT_USER, MQTT_PASSWORD)');
    console.warn('   - Porta 8883 aberta');
    console.warn('   - Certificado válido\n');
  }
}, 15000);
