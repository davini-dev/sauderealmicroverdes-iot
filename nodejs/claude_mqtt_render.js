/*
  Claude Code + MQTT + Render.com
  
  Pronto para rodar 24/7 no Render (camada gratuita)
  Inclui HTTP server para evitar pause automático
  
  Execute localmente:
  npm install mqtt dotenv
  node claude_mqtt_render.js
*/

require('dotenv').config();
const mqtt = require('mqtt');
const http = require('http');

// ==================== HTTP SERVER ====================
// Render pausa apps sem requisições HTTP
// Este server simples previne isso

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/status') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'online',
      app: 'microverdes-iot',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
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

// ==================== MQTT CONFIG ====================
const BROKER = process.env.MQTT_BROKER || 'mqtt://seu-id.emqx.cloud:1883';

const MQTT_OPTIONS = {
  clientId: 'claude_code_render_' + Date.now(),
  username: process.env.MQTT_USER || 'iotbr',
  password: process.env.MQTT_PASSWORD || 'senha',
  clean: true,
  reconnectPeriod: 5000,
  keepalive: 120,
  will: {
    topic: 'status/claude_code_render',
    payload: 'offline',
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
console.log('\n🤖 Microverdes IoT + Render.com + EMQX Cloud\n');
console.log(`📡 Broker: ${BROKER}`);
console.log(`👤 Usuário: ${MQTT_OPTIONS.username}\n`);

const client = mqtt.connect(BROKER, MQTT_OPTIONS);

client.on('connect', () => {
  console.log('✅ Conectado ao EMQX Cloud com sucesso!');
  conexaoAtiva = true;
  
  // Publicar status online
  client.publish('status/claude_code_render', JSON.stringify({
    status: 'online',
    timestamp: new Date().toISOString(),
    hostname: process.env.RENDER_EXTERNAL_HOSTNAME || 'local'
  }), { retain: true });
  
  // Inscrever em tópicos
  client.subscribe('sensores/umidade');
  client.subscribe('sensores/temperatura');
  client.subscribe('sensores/luz');
  client.subscribe('irrigacao/status');
  
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
  
  if (err.code === 'ECONNREFUSED') {
    console.error('   → Verificar Broker em https://www.emqx.cloud');
  } else if (err.message.includes('4') || err.message.includes('Unauthorized')) {
    console.error('   → Username/senha incorretos?');
  }
});

client.on('disconnect', () => {
  console.log('\n⚠️  Desconectado do EMQX Cloud');
  conexaoAtiva = false;
});

client.on('reconnect', () => {
  console.log('🔄 Tentando reconectar...\n');
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
  console.log(`   MQTT: ${conexaoAtiva ? '🟢 Conectado' : '🔴 Desconectado'}\n`);
}, 300000); // 5 minutos

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', () => {
  console.log('\n📦 Recebido SIGTERM - encerrando gracefully...');
  
  // Publicar status offline
  if (conexaoAtiva) {
    client.publish('status/claude_code_render', 'offline');
  }
  
  client.end(false, () => {
    console.log('✅ MQTT desconectado');
  });
  
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
console.log('   Render:', process.env.RENDER ? 'Sim' : 'Não');
console.log();

// Timeout inicial - aguardar primeira conexão
setTimeout(() => {
  if (!conexaoAtiva) {
    console.warn('\n⚠️  Aviso: MQTT não conectou após 15s');
    console.warn('   Verificar credenciais em Environment');
  }
}, 15000);

/*
  ⚠️  SETUP NO RENDER:
  
  1. Variáveis de ambiente (Environment):
     MQTT_BROKER = mqtt://seu-id.emqx.cloud:1883
     MQTT_USER = iotbr
     MQTT_PASSWORD = sua_senha_forte
     NODE_ENV = production
  
  2. Package.json deve ter:
     "start": "node claude_mqtt_render.js"
  
  3. Build command: npm install
  
  4. Verificar:
     - Logs dizem "Conectado ao EMQX Cloud!"
     - GET https://seu-app-xxxxx.onrender.com/status
       retorna JSON com sensores
  
  5. Opcional - UptimeRobot (previne pause):
     https://uptimerobot.com
     Monitorar: https://seu-app-xxxxx.onrender.com/health
     A cada 5 min
  
  ✅ App rodando 24/7 gratuitamente!
*/
