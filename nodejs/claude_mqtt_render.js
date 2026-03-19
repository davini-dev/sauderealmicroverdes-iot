/*
  Claude Code + MQTT TLS/SSL + Render.com
  
  Conexão segura na porta 8883 com certificado DigiCert
  Pronto para rodar 24/7 no Render (camada gratuita)
  Inclui HTTP server para evitar pause automático
  
  Execute localmente:
  npm install mqtt dotenv
  node claude_mqtt_render_tls.js
  
  Variáveis de ambiente (.env):
  MQTT_BROKER_URL=mqtt.seu-id.emqx.cloud
  MQTT_BROKER_PORT=8883
  MQTT_USER=esp32
  MQTT_PASSWORD=mhda
*/

require('dotenv').config();
const mqtt = require('mqtt');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

// ==================== HTTP SERVER ====================
// Render pausa apps sem requisições HTTP
// Este server simples previne isso

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/status') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
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
        luz: sensores.luz + '%'
      },
      irrigacao: irrigacaoAtiva ? 'LIGADA' : 'DESLIGADA'
    }));
  } else if (req.url === '/health') {
    // Health check para UptimeRobot
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
  console.log(`   Health: http://localhost:${port}/health\n`);
});

// ==================== MQTT CONFIG COM TLS/SSL ====================

const BROKER_URL = process.env.MQTT_BROKER_URL || 'xda56908.ala.us-east-1.emqxsl.com';
const BROKER_PORT = parseInt(process.env.MQTT_BROKER_PORT) || 8883; // TLS/SSL

// Opções MQTT com TLS/SSL
const MQTT_OPTIONS = {
  clientId: 'claude_render_' + Date.now(),
  username: process.env.MQTT_USER || 'esp32',
  password: process.env.MQTT_PASSWORD || 'mhda',
  
  // ===== TLS/SSL CONFIGURATION =====
  protocol: 'mqtts',  // ← IMPORTANTE: mqtts para TLS
  port: BROKER_PORT,
  ca: [CA_CERTIFICATE],  // Certificado DigiCert
  rejectUnauthorized: true,  // Validar certificado
  
  // Opções adicionais
  clean: true,
  reconnectPeriod: 5000,
  keepalive: 120,
  connectTimeout: 10000,
  
  // Last Will and Testament (LWT)
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
  ultimaAtualizacao: null
};

let irrigacaoAtiva = false;
let conexaoAtiva = false;

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

// Construir URL de conexão
const brokerUrl = `mqtts://${BROKER_URL}:${BROKER_PORT}`;
console.log(`🔗 Conectando a: ${brokerUrl}\n`);

const client = mqtt.connect(brokerUrl, MQTT_OPTIONS);

client.on('connect', () => {
  console.log('✅ Conectado ao EMQX Cloud com TLS/SSL!');
  console.log(`   🔒 Conexão segura (cifra: TLS 1.2+)`);
  console.log(`   📅 ${new Date().toLocaleTimeString('pt-BR')}\n`);
  
  conexaoAtiva = true;
  
  // Publicar status online
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
  
  // Inscrever em tópicos
  client.subscribe([
    'sensores/umidade',
    'sensores/temperatura',
    'sensores/luz',
    'irrigacao/status'
  ]);
  
  console.log('📡 Inscrito em: sensores/*, irrigacao/status\n');
});

client.on('message', (topic, message) => {
  const valor = parseFloat(message.toString());
  
  // Atualizar estado
  if (topic === 'sensores/umidade') {
    sensores.umidade = valor;
  } else if (topic === 'sensores/temperatura') {
    sensores.temperatura = valor;
  } else if (topic === 'sensores/luz') {
    sensores.luz = valor;
  } else if (topic === 'irrigacao/status') {
    irrigacaoAtiva = message.toString() === 'on';
  }
  
  sensores.ultimaAtualizacao = new Date();
  
  // Log com timestamp
  const tempo = sensores.ultimaAtualizacao.toLocaleTimeString('pt-BR');
  const nomeTopic = topic.split('/')[1].toUpperCase();
  console.log(`[${tempo}] 📊 ${nomeTopic}: ${valor}`);
  
  // Executar lógica
  autoIrrigacao();
});

client.on('error', (err) => {
  console.error('\n❌ Erro MQTT:', err.message);
  conexaoAtiva = false;
  
  // Diagnóstico específico
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
});

client.on('reconnect', () => {
  console.log('🔄 Tentando reconectar...\n');
});

client.on('close', () => {
  console.log('🔌 Conexão fechada\n');
  conexaoAtiva = false;
});

// ==================== LÓGICA DE IRRIGAÇÃO ====================

/**
 * Automação inteligente para microverdes
 * Clima do litoral SP: umidade alta, chuva frequente
 */
function autoIrrigacao() {
  const umidade_minima = 50;
  const umidade_maxima = 85;
  
  // Ativar se umidade cair
  if (sensores.umidade < umidade_minima && !irrigacaoAtiva) {
    console.log(`⚠️  Umidade BAIXA (${sensores.umidade}%) → acionando irrigação\n`);
    ligarIrrigacao();
  }
  
  // Desativar se umidade sobe
  if (sensores.umidade > umidade_maxima && irrigacaoAtiva) {
    console.log(`✅ Umidade OK (${sensores.umidade}%) → pausando irrigação\n`);
    desligarIrrigacao();
  }
}

function ligarIrrigacao() {
  if (!irrigacaoAtiva && conexaoAtiva) {
    client.publish('irrigacao/ligar', 'on');
    irrigacaoAtiva = true;
  }
}

function desligarIrrigacao() {
  if (irrigacaoAtiva && conexaoAtiva) {
    client.publish('irrigacao/desligar', 'off');
    irrigacaoAtiva = false;
  }
}

// ==================== MONITORAMENTO ====================

// Log de status a cada 5 minutos
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
}, 300000); // 5 minutos

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', () => {
  console.log('\n📦 Recebido SIGTERM - encerrando gracefully...');
  
  // Publicar status offline
  if (conexaoAtiva) {
    client.publish('status/claude_render', JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString()
    }));
  }
  
  // Desconectar MQTT
  client.end(false, () => {
    console.log('✅ MQTT desconectado');
  });
  
  // Fechar HTTP server
  server.close(() => {
    console.log('✅ HTTP server fechado');
    process.exit(0);
  });
  
  // Timeout de segurança
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Promise rejection não tratada:', reason);
});

// ==================== STARTUP ====================
console.log('🌱 Microverdes IoT rodando no Render.com');
console.log('   Ambiente:', process.env.NODE_ENV || 'production');
console.log('   Render:', process.env.RENDER ? 'Sim ✓' : 'Não (local)');
console.log();

// Timeout inicial - aguardar primeira conexão
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

/*
  ⚠️  SETUP NO RENDER:
  
  1. Variáveis de ambiente (Environment):
     MQTT_BROKER_URL = xda56908.ala.us-east-1.emqxsl.com
     MQTT_BROKER_PORT = 8883
     MQTT_USER = esp32
     MQTT_PASSWORD = mhda
     NODE_ENV = production
  
  2. Package.json deve ter:
     {
       "name": "microverdes-iot-tls",
       "version": "1.0.0",
       "main": "claude_mqtt_render_tls.js",
       "scripts": {
         "start": "node claude_mqtt_render_tls.js"
       },
       "dependencies": {
         "mqtt": "^5.0.0",
         "dotenv": "^16.0.0"
       }
     }
  
  3. Build command: npm install
  
  4. Start command: npm start
  
  5. Verificar:
     - Logs dizem "Conectado ao EMQX Cloud com TLS/SSL!"
     - GET https://seu-app-xxxxx.onrender.com/status
       retorna JSON com sensores e "conexao": "mqtts://8883"
  
  6. Opcional - UptimeRobot (previne pause):
     https://uptimerobot.com
     Monitorar: https://seu-app-xxxxx.onrender.com/health
     A cada 5 min
  
  ✅ App rodando 24/7 com segurança TLS/SSL!
*/
