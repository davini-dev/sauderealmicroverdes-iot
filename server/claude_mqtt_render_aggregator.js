/*
  Claude Code + MQTT TLS/SSL + Render.com
  
  Agregação de sensores em JSON estruturado
  Mantém estado de todos os dispositivos e sensores conectados
  
  Execute localmente:
  npm install mqtt dotenv
  node claude_mqtt_render_aggregator.js
  
  Variáveis de ambiente (.env):
  MQTT_BROKER_URL=mqtt.seu-id.emqx.cloud
  MQTT_BROKER_PORT=8883
  MQTT_USER=esp32
  MQTT_PASSWORD=mhda
*/

require('dotenv').config();
const mqtt = require('mqtt');
const http = require('http');

// ==================== CERTIFICADO SSL/TLS ====================
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

// ==================== HTTP SERVER ====================
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/status') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(gerarStatusCompleto(), null, 2));
  } else if (req.url === '/devices') {
    // Endpoint para listar dispositivos
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obterDispositivos(), null, 2));
  } else if (req.url === '/sensors') {
    // Endpoint para listar sensores
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obterSensoresAgregados(), null, 2));
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`📡 Server HTTP rodando em http://localhost:${port}`);
  console.log(`   Status: http://localhost:${port}/status`);
  console.log(`   Devices: http://localhost:${port}/devices`);
  console.log(`   Sensors: http://localhost:${port}/sensors`);
  console.log(`   Health: http://localhost:${port}/health\n`);
});

// ==================== AGREGADOR DE SENSORES ====================

/**
 * Estrutura de dados:
 * {
 *   dispositivos: {
 *     "ESP32_TEMP": {
 *       id: "ESP32_TEMP",
 *       nome: "ESP32 Temperatura",
 *       tipo: "temperatura",
 *       status: "online",
 *       ultimaAtualização: timestamp,
 *       sensores: {
 *         temperatura: { valor: 25.3, unidade: "C" },
 *         umidade: { valor: 68.5, unidade: "%" },
 *         luz: { valor: 75.2, unidade: "%" }
 *       }
 *     },
 *     "ESP32_UMID": { ... }
 *   }
 * }
 */

let estado = {
  dispositivos: {},
  ultimaAtualizacao: null,
  totalMensagens: 0
};

// ==================== MQTT CONFIG COM TLS/SSL ====================
const BROKER_URL = process.env.MQTT_BROKER_URL || 'xda56908.ala.us-east-1.emqxsl.com';
const BROKER_PORT = parseInt(process.env.MQTT_BROKER_PORT) || 8883;

const MQTT_OPTIONS = {
  clientId: 'claude_aggregator_' + Date.now(),
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
    topic: 'status/claude_aggregator',
    payload: JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString()
    }),
    qos: 1,
    retain: true
  }
};

// ==================== MQTT CONNECTION ====================
console.log('╔════════════════════════════════════════════════╗');
console.log('║  🌱 MQTT Sensor Aggregator + Render + EMQX     ║');
console.log('║  (Coleta dados de múltiplos dispositivos)      ║');
console.log('╚════════════════════════════════════════════════╝\n');

console.log(`📡 Configuração MQTT:`);
console.log(`   Servidor: ${BROKER_URL}:${BROKER_PORT}`);
console.log(`   Usuário: ${MQTT_OPTIONS.username}`);
console.log(`   Protocolo: mqtts (TLS/SSL)\n`);

const brokerUrl = `mqtts://${BROKER_URL}:${BROKER_PORT}`;
const client = mqtt.connect(brokerUrl, MQTT_OPTIONS);

client.on('connect', () => {
  console.log('✅ Conectado ao EMQX Cloud com TLS/SSL!');
  console.log(`   🔒 Conexão segura (TLS 1.2+)\n`);
  
  conexaoAtiva = true;
  
  // Publicar status online
  client.publish(
    'status/claude_aggregator',
    JSON.stringify({
      status: 'online',
      timestamp: new Date().toISOString(),
      funcao: 'aggregator'
    }),
    { retain: true }
  );
  
  // Subscribe em todos os tópicos de sensores
  const topicos = [
    'sensores/umidade',
    'sensores/temperatura',
    'sensores/luz',
    'irrigacao/status'
  ];
  
  client.subscribe(topicos);
  console.log('📡 Inscrito em:');
  topicos.forEach(t => console.log(`   - ${t}`));
  console.log();
});

client.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const timestamp = new Date();
    
    // Extrair informações
    const sensorId = payload.sensor || 'UNKNOWN';
    const valor = payload.valor;
    const unidade = payload.unidade;
    
    // Mapear tópico para nome de sensor
    let nomeSensor = '';
    if (topic.includes('umidade')) nomeSensor = 'umidade';
    else if (topic.includes('temperatura')) nomeSensor = 'temperatura';
    else if (topic.includes('luz')) nomeSensor = 'luz';
    else if (topic.includes('irrigacao')) nomeSensor = 'irrigacao';
    
    // Atualizar estado
    if (!estado.dispositivos[sensorId]) {
      estado.dispositivos[sensorId] = {
        id: sensorId,
        nome: sensorId.replace(/_/g, ' '),
        status: 'online',
        ultimaAtualização: timestamp.toISOString(),
        sensores: {}
      };
      
      console.log(`\n✨ [NOVO] Dispositivo detectado: ${sensorId}`);
    }
    
    // Atualizar sensor
    estado.dispositivos[sensorId].sensores[nomeSensor] = {
      valor: valor,
      unidade: unidade,
      timestamp: timestamp.toISOString()
    };
    
    estado.dispositivos[sensorId].ultimaAtualização = timestamp.toISOString();
    estado.ultimaAtualizacao = timestamp.toISOString();
    estado.totalMensagens++;
    
    // Log
    const tempo = timestamp.toLocaleTimeString('pt-BR');
    console.log(`[${tempo}] 📊 ${sensorId.padEnd(20)} → ${nomeSensor.toUpperCase().padEnd(12)}: ${valor}${unidade}`);
    
  } catch (err) {
    console.error(`[ERRO] Falha ao processar mensagem: ${err.message}`);
  }
});

client.on('error', (err) => {
  console.error('\n❌ Erro MQTT:', err.message);
  conexaoAtiva = false;
});

client.on('disconnect', () => {
  console.log('\n⚠️  Desconectado do EMQX Cloud');
  conexaoAtiva = false;
});

client.on('reconnect', () => {
  console.log('🔄 Tentando reconectar...\n');
});

// ==================== FUNÇÕES DE RETORNO ====================

function gerarStatusCompleto() {
  const totalDispositivos = Object.keys(estado.dispositivos).length;
  const totalSensores = Object.values(estado.dispositivos).reduce((acc, dev) => {
    return acc + Object.keys(dev.sensores).length;
  }, 0);
  
  return {
    app: {
      nome: 'MQTT Sensor Aggregator',
      versao: '1.0.0',
      ambiente: 'Render.com',
      uptime: Math.floor(process.uptime()),
      memoria_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    
    mqtt: {
      servidor: BROKER_URL,
      porta: BROKER_PORT,
      protocolo: 'mqtts (TLS/SSL)',
      status: conexaoAtiva ? 'conectado' : 'desconectado',
      certificado: 'DigiCert Global Root G2'
    },
    
    resumo: {
      totalDispositivos: totalDispositivos,
      totalSensores: totalSensores,
      totalMensagens: estado.totalMensagens,
      ultimaAtualização: estado.ultimaAtualizacao
    },
    
    dispositivos: Object.values(estado.dispositivos).map(dev => ({
      id: dev.id,
      nome: dev.nome,
      status: dev.status,
      ultimaAtualização: dev.ultimaAtualização,
      sensores: dev.sensores
    }))
  };
}

function obterDispositivos() {
  return {
    total: Object.keys(estado.dispositivos).length,
    dispositivos: Object.values(estado.dispositivos).map(dev => ({
      id: dev.id,
      nome: dev.nome,
      status: dev.status,
      ultimaAtualização: dev.ultimaAtualização,
      sensorQuantidade: Object.keys(dev.sensores).length,
      sensoresConectados: Object.keys(dev.sensores)
    }))
  };
}

function obterSensoresAgregados() {
  const sensoresAgregados = {};
  
  Object.values(estado.dispositivos).forEach(dispositivo => {
    Object.entries(dispositivo.sensores).forEach(([nomeSensor, dados]) => {
      if (!sensoresAgregados[nomeSensor]) {
        sensoresAgregados[nomeSensor] = [];
      }
      
      sensoresAgregados[nomeSensor].push({
        dispositivo: dispositivo.id,
        valor: dados.valor,
        unidade: dados.unidade,
        timestamp: dados.timestamp
      });
    });
  });
  
  return {
    total: Object.keys(sensoresAgregados).length,
    sensores: sensoresAgregados
  };
}

// ==================== MONITORAMENTO ====================
let conexaoAtiva = false;

// Log de resumo a cada 5 minutos
setInterval(() => {
  const uptime = Math.floor(process.uptime());
  const memoria = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const totalDev = Object.keys(estado.dispositivos).length;
  const totalSens = Object.values(estado.dispositivos).reduce((acc, dev) => {
    return acc + Object.keys(dev.sensores).length;
  }, 0);
  
  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║                 STATUS GERAL                    ║`);
  console.log(`╚════════════════════════════════════════════════╝`);
  console.log(`📊 Uptime: ${uptime}s | Memória: ${memoria}MB`);
  console.log(`🔌 Dispositivos conectados: ${totalDev}`);
  console.log(`📈 Total de sensores: ${totalSens}`);
  console.log(`💾 Mensagens recebidas: ${estado.totalMensagens}`);
  console.log(`📡 MQTT: ${conexaoAtiva ? '🟢 Conectado' : '🔴 Desconectado'}`);
  console.log(`🕐 Última atualização: ${estado.ultimaAtualizacao || 'nunca'}\n`);
}, 300000); // 5 minutos

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('\n📦 Recebido SIGTERM - encerrando gracefully...');
  
  if (conexaoAtiva) {
    client.publish('status/claude_aggregator', JSON.stringify({
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

// ==================== STARTUP ====================
console.log('🌱 MQTT Sensor Aggregator rodando no Render.com');
console.log('   Aguardando conexões de dispositivos...\n');

setTimeout(() => {
  if (!conexaoAtiva) {
    console.warn('\n⚠️  Aviso: MQTT não conectou após 15s');
    console.warn('   Verificar credenciais e conectividade\n');
  }
}, 15000);

/*
  ⚠️  SETUP NO RENDER:
  
  1. Variáveis de ambiente:
     MQTT_BROKER_URL = xda56908.ala.us-east-1.emqxsl.com
     MQTT_BROKER_PORT = 8883
     MQTT_USER = esp32
     MQTT_PASSWORD = mhda
     NODE_ENV = production
  
  2. Package.json:
     "start": "node claude_mqtt_render_aggregator.js"
  
  3. Endpoints disponíveis:
     GET /status  → JSON completo com todos dispositivos/sensores
     GET /devices → Lista de dispositivos conectados
     GET /sensors → Agregação de sensores
     GET /health  → Health check (OK)
  
  ✅ Exemplo de resposta /status:
  {
    "app": { "nome": "MQTT Sensor Aggregator", ... },
    "mqtt": { "servidor": "...", "status": "conectado" },
    "resumo": { "totalDispositivos": 2, "totalSensores": 6 },
    "dispositivos": [
      {
        "id": "ESP32_TEMP",
        "nome": "ESP32 Temperatura",
        "status": "online",
        "sensores": {
          "temperatura": { "valor": 25.3, "unidade": "C" },
          "umidade": { "valor": 68.5, "unidade": "%" },
          "luz": { "valor": 75.2, "unidade": "%" }
        }
      }
    ]
  }
*/
