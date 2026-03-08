/*
  Claude Code + Node.js + EMQX CLOUD (Gratuito)
  
  ⚠️  ANTES DE USAR:
  1. https://www.emqx.cloud → Sign Up
  2. New Deployment (Free)
  3. Copiar Broker: seu-id.emqx.cloud
  4. Criar user: iotbr, pass: sua_senha
  
  Execute:
  npm install mqtt
  node claude_mqtt_cloud.js
*/

const mqtt = require('mqtt');

// ==================== CONFIG ====================
// EMQX CLOUD - seu Broker ID
const BROKER = 'mqtt://seu-id.emqx.cloud:1883';  // ← MUDAR seu-id

const MQTT_OPTIONS = {
  clientId: 'claude_code_01',
  username: 'iotbr',              // ← Criado no EMQX Cloud
  password: 'senha_muito_forte',  // ← Criado no EMQX Cloud
  clean: true,
  reconnectPeriod: 5000,
  keepalive: 120
};

// ==================== ESTADO ====================
let sensores = {
  umidade: 0,
  temperatura: 0,
  luz: 0,
  ultimaAtualizacao: null
};

let irrigacaoAtiva = false;

// ==================== CONEXÃO MQTT ====================
console.log('\n🤖 Claude Code + EMQX CLOUD (Gratuito)\n');
console.log(`📡 Broker: ${BROKER}`);
console.log(`👤 Usuário: ${MQTT_OPTIONS.username}\n`);

const client = mqtt.connect(BROKER, MQTT_OPTIONS);

client.on('connect', () => {
  console.log('✅ Conectado ao EMQX Cloud com sucesso!\n');
  
  // Inscrever em sensores
  client.subscribe('sensores/umidade');
  client.subscribe('sensores/temperatura');
  client.subscribe('sensores/luz');
  client.subscribe('irrigacao/status');
  
  console.log('📡 Inscrito em: sensores/*, irrigacao/status\n');
  
  // Publicar status de conexão
  client.publish('status/claude_code', 'online');
});

client.on('message', (topic, message) => {
  const valor = parseFloat(message.toString());
  
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
  
  console.log(`📊 ${topic.split('/')[1].toUpperCase()}: ${valor}`);
  
  // Lógica automática
  autoIrrigacao();
});

client.on('error', (err) => {
  console.error('\n❌ Erro de conexão:', err.message);
  
  if (err.code === 'ECONNREFUSED') {
    console.error('   → Broker não está respondendo');
    console.error('   → Verificar Broker ID em https://www.emqx.cloud');
  } else if (err.message.includes('Unauthorized') || err.message.includes('4')) {
    console.error('   → Usuário/senha incorretos?');
    console.error('   → Dashboard: https://www.emqx.cloud');
  } else if (err.code === 'ENOTFOUND') {
    console.error('   → Host não encontrado');
    console.error('   → Verificar Broker: seu-id.emqx.cloud');
  }
  console.error();
});

client.on('disconnect', () => {
  console.log('\n⚠️  Desconectado do EMQX Cloud');
});

client.on('reconnect', () => {
  console.log('🔄 Reconectando ao EMQX Cloud...\n');
});

// ==================== FUNÇÕES ====================

function mostraStatus() {
  console.log('\n' + '='.repeat(50));
  console.log('🌱 STATUS ATUAL DOS SENSORES');
  console.log('='.repeat(50));
  console.log(`💧 Umidade: ${sensores.umidade}%`);
  console.log(`🌡️  Temperatura: ${sensores.temperatura}°C`);
  console.log(`☀️  Luz: ${sensores.luz}%`);
  console.log(`💦 Irrigação: ${irrigacaoAtiva ? '🟢 LIGADA' : '🔴 DESLIGADA'}`);
  console.log(`⏰ Atualizado: ${sensores.ultimaAtualizacao || 'Aguardando dados...'}`);
  console.log('='.repeat(50) + '\n');
}

function ligarIrrigacao() {
  if (!irrigacaoAtiva && client.connected) {
    console.log('\n💧 LIGANDO IRRIGAÇÃO...');
    client.publish('irrigacao/ligar', 'on');
    irrigacaoAtiva = true;
  }
}

function desligarIrrigacao() {
  if (irrigacaoAtiva && client.connected) {
    console.log('\n🛑 DESLIGANDO IRRIGAÇÃO...');
    client.publish('irrigacao/desligar', 'off');
    irrigacaoAtiva = false;
  }
}

/**
 * Lógica automática de irrigação
 * Otimizada para microverdes no litoral SP
 */
function autoIrrigacao() {
  const umidade_minima = 50;
  const umidade_maxima = 85;
  
  if (sensores.umidade < umidade_minima && !irrigacaoAtiva) {
    console.log(`\n⚠️  Umidade baixa (${sensores.umidade}%) - acionando`);
    ligarIrrigacao();
  }
  
  if (sensores.umidade > umidade_maxima && irrigacaoAtiva) {
    console.log(`\n⚠️  Umidade alta (${sensores.umidade}%) - pausando`);
    desligarIrrigacao();
  }
}

/**
 * Processar comandos
 */
function comandoManual(comando) {
  const cmd = comando.toLowerCase().trim();
  
  switch(cmd) {
    case 'ligar':
      ligarIrrigacao();
      mostraStatus();
      break;
    
    case 'desligar':
      desligarIrrigacao();
      mostraStatus();
      break;
    
    case 'status':
      mostraStatus();
      break;
    
    case 'help':
      exibeAjuda();
      break;
    
    case 'sair':
      console.log('\n👋 Encerrando...');
      client.publish('status/claude_code', 'offline');
      client.end();
      process.exit(0);
      break;
    
    default:
      console.log('\n❓ Comando desconhecido. Digite "help"');
  }
}

function exibeAjuda() {
  console.log('\n' + '='.repeat(50));
  console.log('📚 COMANDOS DISPONÍVEIS');
  console.log('='.repeat(50));
  console.log('ligar      → Ligar irrigação manualmente');
  console.log('desligar   → Desligar irrigação');
  console.log('status     → Ver estado dos sensores');
  console.log('help       → Mostrar esta mensagem');
  console.log('sair       → Sair do programa');
  console.log('='.repeat(50) + '\n');
}

// ==================== INTERFACE ====================

console.log('💬 Comandos: ligar | desligar | status | help | sair\n');

// Status a cada 15 segundos
const intervaloStatus = setInterval(() => {
  if (sensores.ultimaAtualizacao && client.connected) {
    mostraStatus();
  }
}, 15000);

// Input do terminal
if (process.stdin.isTTY) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });
  
  rl.prompt();
  
  rl.on('line', (input) => {
    comandoManual(input);
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log('\n👋 Saindo...');
    clearInterval(intervaloStatus);
    client.end();
    process.exit(0);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Encerrando...');
  clearInterval(intervaloStatus);
  client.publish('status/claude_code', 'offline');
  client.end();
  process.exit(0);
});

/*
  ⚠️  ANTES DE USAR - CHECKLIST:
  
  ☐ Criar conta em https://www.emqx.cloud
  ☐ Novo deployment (Free)
  ☐ Copiar Broker: seu-id.emqx.cloud
  ☐ Criar username: iotbr
  ☐ Criar password: senha_forte
  ☐ Atualizar BROKER = "mqtt://seu-id.emqx.cloud:1883"
  ☐ Atualizar MQTT_OPTIONS.username e password
  ☐ npm install mqtt
  ☐ node claude_mqtt_cloud.js
  
  ✅ Se vir "Conectado ao EMQX Cloud!" está funcionando!
  
  🧪 TESTAR CONEXÃO:
  
  No outro terminal:
  mosquitto_pub -h seu-id.emqx.cloud -u iotbr -P senha \
    -t sensores/umidade -m "65"
  
  Deve aparecer:
  📊 UMIDADE: 65
*/
