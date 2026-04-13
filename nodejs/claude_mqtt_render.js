/*
  Claude Code + MQTT TLS/SSL + Render.com
  Base do primeiro arquivo + novas rotas do segundo arquivo

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

// se você tiver pasta public, pode deixar.
// se não tiver, pode remover esta linha.
app.use(express.static(path.join(__dirname, 'public')));

// ==================== CERTIFICADO SSL/TLS ====================
// Certificado DigiCert Global Root G2 (EMQX Cloud)
const CA_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
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
let sensores = {
  umidade: 0,
  temperatura: 0,
  luz: 0,
  ar: null,
  neblina: null,
  ultimaAtualizacao: null
};

let irrigacaoAtiva = false;
let conexaoAtiva = false;
let mqttStatus = 'desconectado';

let device = {
  id: null,
  ip: null,
  mac: null,
  rssi: null,
  uptime: null,
  uptimeMs: null,
  heapFree: null,
  sensores: null,
  ts: null
};

let bandejas = {};
let eventos = [];

// ==================== UTIL ====================
function addEvento(tipo, msg) {
  eventos.unshift({ tipo, msg, ts: new Date().toISOString() });
  if (eventos.length > 20) eventos.pop();
}

function getSensoresEstruturados() {
  return {
    umidade: {
      valor: sensores.umidade,
      ts: sensores.ultimaAtualizacao
    },
    temp: {
      valor: sensores.temperatura,
      ts: sensores.ultimaAtualizacao
    },
    ar: {
      valor: sensores.ar,
      ts: sensores.ultimaAtualizacao
    },
    luz: {
      valor: sensores.luz,
      ts: sensores.ultimaAtualizacao
    },
    neblina: {
      valor: sensores.neblina,
      ts: sensores.ultimaAtualizacao
    },
    irrigacao: {
      valor: irrigacaoAtiva ? 'ON' : 'OFF',
      ts: sensores.ultimaAtualizacao
    }
  };
}

// ==================== MQTT CONNECTION ====================
console.log('\n╔════════════════════════════════════════════════╗');
console.log('║  🌱 Microverdes IoT + Render + EMQX (TLS)      ║');
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

  conexaoAtiva = true;
  mqttStatus = 'conectado';

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

  // tópicos antigos + novos do segundo arquivo
  client.subscribe([
    'sensores/umidade',
    'sensores/temperatura',
    'sensores/luz',
    'irrigacao/status',

    'microverdes/sensor/umidade',
    'microverdes/sensor/temp',
    'microverdes/sensor/ar',
    'microverdes/sensor/luz',
    'microverdes/status/neblina',
    'microverdes/cmd/irrigacao',
    'microverdes/bandeja/+',
    'microverdes/device/info'
  ]);

  console.log('📡 Inscrito em tópicos antigos e novos\n');
  addEvento('info', 'MQTT conectado ao broker EMQX.');
});

client.on('message', (topic, message) => {
  const raw = message.toString();
  const agora = new Date();
  sensores.ultimaAtualizacao = agora;

  // ===== tópicos do primeiro arquivo =====
  if (topic === 'sensores/umidade') {
    sensores.umidade = parseFloat(raw);
  } else if (topic === 'sensores/temperatura') {
    sensores.temperatura = parseFloat(raw);
  } else if (topic === 'sensores/luz') {
    sensores.luz = parseFloat(raw);
  } else if (topic === 'irrigacao/status') {
    irrigacaoAtiva = raw === 'on' || raw === 'ON';
  }

  // ===== tópicos do segundo arquivo =====
  else if (topic === 'microverdes/sensor/umidade') {
    sensores.umidade = parseFloat(raw);
    checarAlertas('umidade', sensores.umidade);
  } else if (topic === 'microverdes/sensor/temp') {
    sensores.temperatura = parseFloat(raw);
  } else if (topic === 'microverdes/sensor/ar') {
    sensores.ar = parseFloat(raw);
    checarAlertas('ar', sensores.ar);
  } else if (topic === 'microverdes/sensor/luz') {
    sensores.luz = parseFloat(raw);
  } else if (topic === 'microverdes/status/neblina') {
    sensores.neblina = raw;
  } else if (topic === 'microverdes/cmd/irrigacao') {
    irrigacaoAtiva = raw === 'ON' || raw === 'on';
    if (irrigacaoAtiva) addEvento('ok', 'Ciclo de irrigação iniciado.');
  } else if (topic === 'microverdes/device/info') {
    try {
      const d = JSON.parse(raw);
      device = {
        id: d.id || device.id,
        ip: d.ip || device.ip,
        mac: d.mac || device.mac,
        rssi: d.rssi ?? device.rssi,
        uptime: d.uptime || device.uptime,
        uptimeMs: d.uptime_ms ?? device.uptimeMs,
        heapFree: d.heap_free ?? device.heapFree,
        sensores: d.sensores || device.sensores,
        ts: agora.toISOString()
      };
    } catch {
      console.warn('[DEVICE] payload inválido:', raw);
    }
  }

  const matchBandeja = topic.match(/^microverdes\/bandeja\/(\w+)$/);
  if (matchBandeja) {
    const id = matchBandeja[1];
    try {
      const dados = JSON.parse(raw);
      bandejas[id] = { ...dados, ts: agora.toISOString() };
      if (dados.umidade < 55) {
        addEvento('warn', `Bandeja ${dados.nome || id}: umidade baixa (${dados.umidade}%).`);
      }
    } catch {
      bandejas[id] = { umidade: parseFloat(raw), ts: agora.toISOString() };
    }
  }

  const nomeTopic = topic.split('/').slice(-1)[0].toUpperCase();
  console.log(`[${agora.toLocaleTimeString('pt-BR')}] 📊 ${nomeTopic}: ${raw}`);

  autoIrrigacao();
});

client.on('error', (err) => {
  console.error('\n❌ Erro MQTT:', err.message);
  conexaoAtiva = false;
  mqttStatus = 'erro';

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
  conexaoAtiva = false;
  mqttStatus = 'desconectado';
});

client.on('offline', () => {
  mqttStatus = 'offline';
});

client.on('reconnect', () => {
  console.log('🔄 Tentando reconectar...\n');
});

client.on('close', () => {
  console.log('🔌 Conexão fechada\n');
  conexaoAtiva = false;
  mqttStatus = 'fechado';
});

// ==================== LÓGICA DE IRRIGAÇÃO ====================
function autoIrrigacao() {
  const umidade_minima = 50;
  const umidade_maxima = 85;

  if (sensores.umidade < umidade_minima && !irrigacaoAtiva) {
    console.log(`⚠️  Umidade BAIXA (${sensores.umidade}%) → acionando irrigação\n`);
    ligarIrrigacao();
  }

  if (sensores.umidade > umidade_maxima && irrigacaoAtiva) {
    console.log(`✅ Umidade OK (${sensores.umidade}%) → pausando irrigação\n`);
    desligarIrrigacao();
  }
}

function ligarIrrigacao() {
  if (!irrigacaoAtiva && conexaoAtiva) {
    client.publish('irrigacao/ligar', 'on');
    client.publish('microverdes/cmd/irrigacao', 'ON', { qos: 1 });
    irrigacaoAtiva = true;
  }
}

function desligarIrrigacao() {
  if (irrigacaoAtiva && conexaoAtiva) {
    client.publish('irrigacao/desligar', 'off');
    client.publish('microverdes/cmd/irrigacao', 'OFF', { qos: 1 });
    irrigacaoAtiva = false;
  }
}

function checarAlertas(tipo, valor) {
  if (tipo === 'umidade' && valor < 55) {
    addEvento('warn', `Umidade do solo crítica: ${valor}%. Iniciando irrigação emergencial.`);
    client.publish('microverdes/cmd/irrigacao', 'ON', { qos: 1 });
  }

  if (tipo === 'ar' && valor > 85) {
    addEvento('warn', `Umidade do ar muito alta: ${valor}%. Nebulização suspensa.`);
    client.publish('microverdes/status/neblina', 'OFF', { qos: 1 });
  }
}

// ==================== ROTAS ORIGINAIS ====================
app.get(['/', '/status'], (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'microverdes-iot-tls',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    conexao: {
      mqtt: conexaoAtiva ? 'conectado (TLS/SSL 8883)' : 'desconectado',
      certificado: 'DigiCert Global Root G2'
    },
    sensores: {
      umidade: sensores.umidade + '%',
      temperatura: sensores.temperatura + '°C',
      luz: sensores.luz + '%',
      ar: sensores.ar !== null ? sensores.ar + '%' : null,
      neblina: sensores.neblina
    },
    irrigacao: irrigacaoAtiva ? 'LIGADA' : 'DESLIGADA'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// ==================== NOVAS ROTAS DO SEGUNDO ARQUIVO ====================
app.get('/dashboard-data', async (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    mqtt: mqttStatus,
    sensores: getSensoresEstruturados(),
    bandejas,
    device,
    eventos: eventos.slice(0, 10),
    clima: {
      atual: null,
      previsao: null,
      idadeMinutos: null
    }
  });
});

app.post('/cmd', (req, res) => {
  const { topico, valor } = req.body;

  if (!topico || valor === undefined) {
    return res.status(400).json({ erro: 'topico e valor são obrigatórios' });
  }

  const permitidos = [
    'microverdes/cmd/irrigacao',
    'microverdes/status/neblina',
    'microverdes/cmd/reset',
    'irrigacao/ligar',
    'irrigacao/desligar'
  ];

  if (!permitidos.includes(topico)) {
    return res.status(403).json({ erro: 'tópico não permitido' });
  }

  client.publish(topico, String(valor), { qos: 1 }, (err) => {
    if (err) return res.status(500).json({ erro: err.message });

    addEvento('info', `Comando manual: ${topico} = ${valor}`);
    res.json({ ok: true, topico, valor });
  });
});

app.get('/ping', (_req, res) => {
  res.send('pong');
});

// ==================== MONITORAMENTO ====================
setInterval(() => {
  const uptime = Math.floor(process.uptime());
  const memoria = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  console.log(`\n📊 Status (uptime: ${uptime}s, memória: ${memoria}MB)`);
  console.log(`   Umidade: ${sensores.umidade}%`);
  console.log(`   Temperatura: ${sensores.temperatura}°C`);
  console.log(`   Luz: ${sensores.luz}%`);
  console.log(`   Irrigação: ${irrigacaoAtiva ? '🟢 LIGADA' : '🔴 DESLIGADA'}`);
  console.log(`   MQTT: ${conexaoAtiva ? '🟢 Conectado (TLS)' : '🔴 Desconectado'}`);
  console.log(`   Última atualização: ${sensores.ultimaAtualizacao ? sensores.ultimaAtualizacao.toLocaleTimeString('pt-BR') : 'nunca'}\n`);
}, 300000);

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('\n📦 Recebido SIGTERM - encerrando gracefully...');

  if (conexaoAtiva) {
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
  console.log(`   Dashboard: http://localhost:${port}/dashboard-data`);
  console.log(`   Ping: http://localhost:${port}/ping\n`);
});

console.log('🌱 Microverdes IoT rodando no Render.com');
console.log('   Ambiente:', process.env.NODE_ENV || 'production');
console.log('   Render:', process.env.RENDER ? 'Sim ✓' : 'Não (local)');
console.log();

setTimeout(() => {
  if (!conexaoAtiva) {
    console.warn('\n⚠️  Aviso: MQTT não conectou após 15s');
    console.warn('   Verificar:');
    console.warn('   - Servidor está online');
    console.warn('   - Credenciais corretas (MQTT_USER, MQTT_PASSWORD)');
    console.warn('   - Porta 8883 aberta');
    console.warn('   - Certificado válido\n');
  }
}, 15000);
