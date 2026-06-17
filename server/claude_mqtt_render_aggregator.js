/*
  Claude Code + MQTT (TCP) + Render.com
  
  Agregação de dados do microverdes-iot
  Tópicos compatíveis com arduino/microverdes.ino
  
  Farmácia Saúde Real — Microverdes IoT
  
  Execute localmente:
  npm install mqtt dotenv
  node claude_mqtt_render_aggregator.js
  
  Variáveis de ambiente (.env):
  MQTT_BROKER_URL=49.13.124.109
  MQTT_BROKER_PORT=1883
  MQTT_USER=
  MQTT_PASSWORD=
*/

require('dotenv').config();
const mqtt = require('mqtt');
const http = require('http');

// ==================== HTTP SERVER ====================
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── POST /cmd — envia comando MQTT para o ESP32 ──
  if (req.url === '/cmd' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const topico = data.topico || data.topic || '';
        const valor  = data.valor  || data.value  || '';

        if (!topico) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ ok: false, error: 'Campo "topico" é obrigatório' }));
          return;
        }

        if (!conexaoAtiva) {
          res.writeHead(503, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ ok: false, error: 'MQTT não conectado' }));
          return;
        }

        client.publish(topico, valor, { qos: 1 });
        console.log(`[CMD] → ${topico} = ${valor}`);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ ok: true, topico, valor }));

      } catch (err) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }));
      }
    });
    return;
  }

  // ── GET endpoints ──
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/' || req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify(gerarStatusCompleto(), null, 2));
  } else if (req.url === '/devices') {
    res.writeHead(200);
    res.end(JSON.stringify(obterDispositivos(), null, 2));
  } else if (req.url === '/sensors') {
    res.writeHead(200);
    res.end(JSON.stringify(obterSensoresAgregados(), null, 2));
  } else if (req.url === '/bandejas') {
    res.writeHead(200);
    res.end(JSON.stringify(obterBandejas(), null, 2));
  } else if (req.url === '/dashboard-data') {
    res.writeHead(200);
    res.end(JSON.stringify(obterDadosDashboard(), null, 2));
  } else if (req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, () => {
  console.log(`📡 Server HTTP rodando em http://localhost:${port}`);
  console.log(`   Status:        http://localhost:${port}/status`);
  console.log(`   Devices:       http://localhost:${port}/devices`);
  console.log(`   Sensors:       http://localhost:${port}/sensors`);
  console.log(`   Bandejas:      http://localhost:${port}/bandejas`);
  console.log(`   Dashboard:     http://localhost:${port}/dashboard-data`);
  console.log(`   Health:        http://localhost:${port}/health\n`);
});

// ==================== ESTADO GLOBAL ====================

let estado = {
  dispositivos: {},
  ultimaAtualizacao: null,
  totalMensagens: 0
};

// Tópicos conhecidos do ESP32 (definidos no microverdes.ino)
const TOPICOS = {
  TEMP:      'microverdes/sensor/temp',
  AR:        'microverdes/sensor/ar',
  LUZ:       'microverdes/sensor/luz',
  UMIDADE:   'microverdes/sensor/umidade',
  NEBLINA:   'microverdes/status/neblina',
  IRRIGACAO: 'microverdes/cmd/irrigacao',
  DEVICE:    'microverdes/device/info',
  BANDEJA:   'microverdes/bandeja/'
};

// ==================== MQTT CONFIG (TCP - AUTENTICAÇÃO ANÔNIMA) ====================
const BROKER_URL = process.env.MQTT_BROKER_URL || '49.13.124.109';
const BROKER_PORT = parseInt(process.env.MQTT_BROKER_PORT) || 1883;

const MQTT_OPTIONS = {
  clientId: 'sauderealmicroverdes_aggregator_' + Date.now(),
  protocol: 'mqtt',
  port: BROKER_PORT,
  
  clean: true,
  reconnectPeriod: 5000,
  keepalive: 60,
  connectTimeout: 10000,
  
  will: {
    topic: 'microverdes/status/aggregator',
    payload: JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString()
    }),
    qos: 1,
    retain: true
  }
};

// ==================== MQTT CONNECTION ====================
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  🌱 Saúde Real Microverdes — MQTT Aggregator        ║');
console.log('║     (Compatível com arduino/microverdes.ino)        ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

console.log(`📡 Configuração MQTT:`);
console.log(`   Servidor: ${BROKER_URL}:${BROKER_PORT}`);
console.log(`   Autenticação: Anônima`);
console.log(`   Protocolo: mqtt (TCP)\n`);

const brokerUrl = `mqtt://${BROKER_URL}:${BROKER_PORT}`;
const client = mqtt.connect(brokerUrl, MQTT_OPTIONS);

let conexaoAtiva = false;

client.on('connect', () => {
  console.log('✅ Conectado ao broker MQTT (TCP)!');
  console.log(`   🔓 Conexão sem criptografia (porta 1883)\n`);
  
  conexaoAtiva = true;
  
  // Publicar status online
  client.publish(
    'microverdes/status/aggregator',
    JSON.stringify({
      status: 'online',
      timestamp: new Date().toISOString(),
      funcao: 'aggregator',
      versao: '2.0.0'
    }),
    { retain: true }
  );
  
  // Subscribe em TODOS os tópicos do projeto
  const topicos = [
    // Sensores individuais (valores simples)
    TOPICOS.TEMP,           // microverdes/sensor/temp
    TOPICOS.AR,             // microverdes/sensor/ar
    TOPICOS.LUZ,            // microverdes/sensor/luz
    TOPICOS.UMIDADE,        // microverdes/sensor/umidade
    TOPICOS.NEBLINA,        // microverdes/status/neblina
    TOPICOS.IRRIGACAO,      // microverdes/cmd/irrigacao
    
    // Info do dispositivo (JSON)
    TOPICOS.DEVICE,         // microverdes/device/info
    
    // Bandejas (wildcard para sub-tópicos)
    TOPICOS.BANDEJA + '#',  // microverdes/bandeja/+
    
    // Tópicos legados (compatibilidade com MQTT_TOPICS_V2.md)
    'devices/+/online',
    'devices/+/info',
    'devices/+/sensor/+',
    'devices/+/sensors',
    'sensores/+'
  ];
  
  const sub = client.subscribe(topicos);
  console.log('📡 Inscrito em:');
  topicos.forEach(t => console.log(`   - ${t}`));
  console.log();
});

/**
 * Normaliza o ID do dispositivo a partir do tópico ou payload
 */
function extrairDeviceId(topic, data) {
  // Formato v2: devices/esp32_01/info → esp32_01
  const devMatch = topic.match(/^devices\/([^/]+)\//);
  if (devMatch) return devMatch[1];
  
  // Payload JSON com campo id
  if (data && data.id) return data.id;
  
  // Padrão microverdes → usa nome do device do payload ou "default"
  return data?.id || 'ESP32_DEFAULT';
}

/**
 * Converte payload para número se possível
 */
function parseValor(payload) {
  const str = payload.toString().trim();
  const num = parseFloat(str);
  return isNaN(num) ? str : num;
}

/**
 * Processa mensagem de sensor simples (valor numérico como string)
 */
function processarSensorSimple(topic, valor, deviceId) {
  const sensoresMap = {
    [TOPICOS.TEMP]:    { nome: 'temperatura', unidade: '°C' },
    [TOPICOS.AR]:      { nome: 'umidade_ar',  unidade: '%' },
    [TOPICOS.LUZ]:     { nome: 'luz',         unidade: 'lux' },
    [TOPICOS.UMIDADE]: { nome: 'umidade_solo',unidade: '%' },
    [TOPICOS.NEBLINA]: { nome: 'neblina',     unidade: 'status' },
    [TOPICOS.IRRIGACAO]:{ nome: 'irrigacao',  unidade: 'status' },
  };
  
  const sensor = sensoresMap[topic];
  if (!sensor) return null;
  
  return {
    tipo: sensor.nome,
    valor: parseValor(valor),
    unidade: sensor.unidade,
    topico: topic
  };
}

/**
 * Processa mensagem de bandeja (JSON)
 */
function processarBandeja(topic, payload) {
  // Tópico: microverdes/bandeja/A1
  const bandejaId = topic.replace(TOPICOS.BANDEJA, '');
  if (!bandejaId) return null;
  
  try {
    const dados = JSON.parse(payload.toString());
    return {
      id: bandejaId,
      nome:dados.nome || `Bandeja ${bandejaId}`,
      umidade: dados.umidade ?? null,
      topico: topic
    };
  } catch (e) {
    return {
      id: bandejaId,
      nome: `Bandeja ${bandejaId}`,
      umidade: parseValor(payload),
      topico: topic
    };
  }
}

// ==================== MESSAGE HANDLER ====================

client.on('message', (topic, message) => {
  try {
    const payload = message.toString();
    const timestamp = new Date();
    
    // ── DEVICE INFO (JSON) ──
    if (topic === TOPICOS.DEVICE) {
      const data = JSON.parse(payload);
      const deviceId = data.id || 'ESP32_DEFAULT';
      
      if (!estado.dispositivos[deviceId]) {
        estado.dispositivos[deviceId] = {
          id: deviceId,
          nome: deviceId,
          ip: data.ip || 'N/A',
          mac: data.mac || 'N/A',
          rssi: data.rssi || 0,
          online: true,
          firstSeen: timestamp.toISOString(),
          lastSeen: timestamp.toISOString(),
          uptime: data.uptime || 'N/A',
          heap_free: data.heap_free || 0,
          modo: data.modo || 'N/A',
          sensores: {},
          bandejas: {}
        };
        console.log(`\n✨ [NOVO] Dispositivo: ${deviceId} (IP: ${data.ip})`);
      } else {
        estado.dispositivos[deviceId].online = true;
        estado.dispositivos[deviceId].lastSeen = timestamp.toISOString();
        estado.dispositivos[deviceId].ip = data.ip || estado.dispositivos[deviceId].ip;
        estado.dispositivos[deviceId].rssi = data.rssi ?? estado.dispositivos[deviceId].rssi;
        estado.dispositivos[deviceId].uptime = data.uptime || estado.dispositivos[deviceId].uptime;
        estado.dispositivos[deviceId].heap_free = data.heap_free ?? estado.dispositivos[deviceId].heap_free;
      }
      
      estado.ultimaAtualizacao = timestamp.toISOString();
      estado.totalMensagens++;
      return;
    }
    
    // ── BANDEJAS (microverdes/bandeja/+) ──
    if (topic.startsWith(TOPICOS.BANDEJA)) {
      const bandeja = processarBandeja(topic, message);
      if (!bandeja) return;
      
      // Bandejas ficam no dispositivo padrão (ou no primeiro encontrado)
      const deviceId = Object.keys(estado.dispositivos)[0] || 'ESP32_DEFAULT';
      
      if (!estado.dispositivos[deviceId]) {
        estado.dispositivos[deviceId] = {
          id: deviceId,
          nome: deviceId,
          online: true,
          firstSeen: timestamp.toISOString(),
          lastSeen: timestamp.toISOString(),
          sensores: {},
          bandejas: {}
        };
      }
      
      estado.dispositivos[deviceId].bandejas[bandeja.id] = {
        ...bandeja,
        timestamp: timestamp.toISOString()
      };
      estado.dispositivos[deviceId].lastSeen = timestamp.toISOString();
      estado.ultimaAtualizacao = timestamp.toISOString();
      estado.totalMensagens++;
      
      const tempo = timestamp.toLocaleTimeString('pt-BR');
      console.log(`[${tempo}] 🌻 ${deviceId} Bandeja ${bandeja.id}: umidade=${bandeja.umidade}%`);
      return;
    }
    
    // ── SENSORES SIMPLES ──
    const sensorInfo = processarSensorSimple(topic, payload);
    if (sensorInfo) {
      const deviceId = Object.keys(estado.dispositivos)[0] || 'ESP32_DEFAULT';
      
      if (!estado.dispositivos[deviceId]) {
        estado.dispositivos[deviceId] = {
          id: deviceId,
          nome: deviceId,
          online: true,
          firstSeen: timestamp.toISOString(),
          lastSeen: timestamp.toISOString(),
          sensores: {},
          bandejas: {}
        };
      }
      
      estado.dispositivos[deviceId].sensores[sensorInfo.tipo] = {
        valor: sensorInfo.valor,
        unidade: sensorInfo.unidade,
        timestamp: timestamp.toISOString(),
        topico: topic
      };
      estado.dispositivos[deviceId].lastSeen = timestamp.toISOString();
      estado.ultimaAtualizacao = timestamp.toISOString();
      estado.totalMensagens++;
      
      const tempo = timestamp.toLocaleTimeString('pt-BR');
      console.log(`[${tempo}] 📊 ${deviceId.padEnd(16)} → ${sensorInfo.tipo.toUpperCase().padEnd(14)}: ${sensorInfo.valor}${sensorInfo.unidade}`);
      return;
    }
    
    // ── FORMATO V2 (compatibilidade) ──
    // devices/{id}/online
    if (/\/online$/.test(topic)) {
      const match = topic.match(/^devices\/([^/]+)\/online$/);
      if (match) {
        const deviceId = match[1];
        const online = payload === 'true' || payload === '1' || payload === 'on';
        
        if (!estado.dispositivos[deviceId]) {
          estado.dispositivos[deviceId] = {
            id: deviceId,
            nome: deviceId,
            online: online,
            firstSeen: timestamp.toISOString(),
            lastSeen: timestamp.toISOString(),
            sensores: {},
            bandejas: {}
          };
        }
        
        estado.dispositivos[deviceId].online = online;
        estado.dispositivos[deviceId].lastSeen = timestamp.toISOString();
        estado.ultimaAtualizacao = timestamp.toISOString();
        estado.totalMensagens++;
        return;
      }
    }
    
    // devices/{id}/info
    if (/\/info$/.test(topic)) {
      const match = topic.match(/^devices\/([^/]+)\/info$/);
      if (match) {
        const deviceId = match[1];
        const data = JSON.parse(payload);
        
        if (!estado.dispositivos[deviceId]) {
          estado.dispositivos[deviceId] = {
            id: deviceId,
            nome: data?.nome || deviceId,
            online: true,
            firstSeen: timestamp.toISOString(),
            lastSeen: timestamp.toISOString(),
            sensores: {},
            bandejas: {}
          };
        }
        
        estado.dispositivos[deviceId] = {
          ...estado.dispositivos[deviceId],
          ...data,
          id: deviceId,
          online: true,
          lastSeen: timestamp.toISOString()
        };
        estado.ultimaAtualizacao = timestamp.toISOString();
        estado.totalMensagens++;
        return;
      }
    }
    
    // devices/{id}/sensor/{tipo}
    const sensorV2Match = topic.match(/^devices\/([^/]+)\/sensor\/([^/]+)$/);
    if (sensorV2Match) {
      const deviceId = sensorV2Match[1];
      const sensorTipo = sensorV2Match[2];
      
      if (!estado.dispositivos[deviceId]) {
        estado.dispositivos[deviceId] = {
          id: deviceId,
          nome: deviceId,
          online: true,
          firstSeen: timestamp.toISOString(),
          lastSeen: timestamp.toISOString(),
          sensores: {},
          bandejas: {}
        };
      }
      
      estado.dispositivos[deviceId].sensores[sensorTipo] = {
        valor: parseValor(payload),
        unidade: inferirUnidade(sensorTipo),
        timestamp: timestamp.toISOString(),
        topico: topic
      };
      estado.ultimaAtualizacao = timestamp.toISOString();
      estado.totalMensagens++;
      return;
    }
    
    // devices/{id}/sensors (array completo)
    const sensorsArrayMatch = topic.match(/^devices\/([^/]+)\/sensors$/);
    if (sensorsArrayMatch) {
      const deviceId = sensorsArrayMatch[1];
      const sensores = JSON.parse(payload);
      
      if (!estado.dispositivos[deviceId]) {
        estado.dispositivos[deviceId] = {
          id: deviceId,
          nome: deviceId,
          online: true,
          firstSeen: timestamp.toISOString(),
          lastSeen: timestamp.toISOString(),
          sensores: {},
          bandejas: {}
        };
      }
      
      sensores.forEach(s => {
        estado.dispositivos[deviceId].sensores[s.tipo || s.nome] = {
          valor: s.valor,
          unidade: s.unidade || inferirUnidade(s.tipo || s.nome),
          timestamp: timestamp.toISOString()
        };
      });
      estado.ultimaAtualizacao = timestamp.toISOString();
      estado.totalMensagens++;
      return;
    }
    
    // sensores/{tipo} (formato legado v1)
    const legadoMatch = topic.match(/^sensores\/([^/]+)$/);
    if (legadoMatch) {
      const sensorTipo = legadoMatch[1];
      const deviceId = 'ESP32_DEFAULT';
      
      if (!estado.dispositivos[deviceId]) {
        estado.dispositivos[deviceId] = {
          id: deviceId,
          nome: deviceId,
          online: true,
          firstSeen: timestamp.toISOString(),
          lastSeen: timestamp.toISOString(),
          sensores: {},
          bandejas: {}
        };
      }
      
      estado.dispositivos[deviceId].sensores[sensorTipo] = {
        valor: parseValor(payload),
        unidade: inferirUnidade(sensorTipo),
        timestamp: timestamp.toISOString(),
        topico: topic
      };
      estado.ultimaAtualizacao = timestamp.toISOString();
      estado.totalMensagens++;
      return;
    }
    
  } catch (err) {
    console.error(`[ERRO] Falha ao processar mensagem em "${topic}": ${err.message}`);
  }
});

/**
 * Infere unidade baseada no nome do sensor
 */
function inferirUnidade(tipo) {
  if (!tipo) return '';
  const t = tipo.toLowerCase();
  if (t.includes('temp')) return '°C';
  if (t.includes('umid') && t.includes('ar')) return '%';
  if (t.includes('umid')) return '%';
  if (t.includes('luz')) return 'lux';
  if (t.includes('solo') || t.includes('bandeja')) return '%';
  return '';
}

client.on('error', (err) => {
  console.error('\n❌ Erro MQTT:', err.message);
  conexaoAtiva = false;
});

client.on('disconnect', () => {
  console.log('\n⚠️  Desconectado do broker MQTT');
  conexaoAtiva = false;
});

client.on('reconnect', () => {
  console.log('🔄 Tentando reconectar...\n');
});

client.on('offline', () => {
  console.log('⚠️  Cliente MQTT offline');
  conexaoAtiva = false;
});

// ==================== FUNÇÕES DE RETORNO ====================

function gerarStatusCompleto() {
  const dispositivos = Object.values(estado.dispositivos);
  const totalSensores = dispositivos.reduce((acc, dev) => {
    return acc + Object.keys(dev.sensores || {}).length;
  }, 0);
  const totalBandejas = dispositivos.reduce((acc, dev) => {
    return acc + Object.keys(dev.bandejas || {}).length;
  }, 0);
  
  return {
    ok: true,
    ts: new Date().toISOString(),
    app: {
      nome: 'Saúde Real Microverdes IoT',
      versao: '2.0.0',
      plataforma: 'Render.com',
      uptime: Math.floor(process.uptime()),
      memoria_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    
    mqtt: {
      servidor: BROKER_URL,
      porta: BROKER_PORT,
      protocolo: 'mqtt (TCP)',
      autenticacao: 'anônima',
      status: conexaoAtiva ? 'conectado' : 'desconectado'
    },
    
    resumo: {
      totalDispositivos: dispositivos.length,
      totalSensores: totalSensores,
      totalBandejas: totalBandejas,
      totalMensagens: estado.totalMensagens,
      ultimaAtualizacao: estado.ultimaAtualizacao
    },
    
    dispositivos: dispositivos.map(dev => ({
      id: dev.id,
      nome: dev.nome,
      ip: dev.ip || 'N/A',
      mac: dev.mac || 'N/A',
      rssi: dev.rssi || 0,
      uptime: dev.uptime || 'N/A',
      heap_free: dev.heap_free || 0,
      modo: dev.modo || 'N/A',
      online: dev.online,
      firstSeen: dev.firstSeen,
      lastSeen: dev.lastSeen,
      sensores: dev.sensores,
      bandejas: dev.bandejas
    }))
  };
}

function obterDispositivos() {
  const dispositivos = Object.values(estado.dispositivos);
  return {
    ok: true,
    ts: new Date().toISOString(),
    total: dispositivos.length,
    online: dispositivos.filter(d => d.online).length,
    offline: dispositivos.filter(d => !d.online).length,
    devices: dispositivos.map(dev => ({
      id: dev.id,
      nome: dev.nome,
      ip: dev.ip || 'N/A',
      mac: dev.mac || 'N/A',
      rssi: dev.rssi || 0,
      uptime: dev.uptime || 'N/A',
      online: dev.online,
      firstSeen: dev.firstSeen,
      lastSeen: dev.lastSeen,
      sensorQuantidade: Object.keys(dev.sensores || {}).length,
      sensoresConectados: Object.keys(dev.sensores || {}),
      bandejasQuantidade: Object.keys(dev.bandejas || {}).length
    }))
  };
}

function obterSensoresAgregados() {
  const sensoresAgregados = {};
  
  Object.values(estado.dispositivos).forEach(dispositivo => {
    Object.entries(dispositivo.sensores || {}).forEach(([nomeSensor, dados]) => {
      if (!sensoresAgregados[nomeSensor]) {
        sensoresAgregados[nomeSensor] = [];
      }
      
      sensoresAgregados[nomeSensor].push({
        dispositivo: dispositivo.id,
        dispositivo_nome: dispositivo.nome,
        valor: dados.valor,
        unidade: dados.unidade,
        timestamp: dados.timestamp
      });
    });
  });
  
  return {
    ok: true,
    ts: new Date().toISOString(),
    total: Object.keys(sensoresAgregados).length,
    sensores: sensoresAgregados
  };
}

function obterBandejas() {
  const todasBandejas = [];
  
  Object.values(estado.dispositivos).forEach(dispositivo => {
    Object.entries(dispositivo.bandejas || {}).forEach(([id, dados]) => {
      todasBandejas.push({
        id: id,
        dispositivo: dispositivo.id,
        nome: dados.nome,
        umidade: dados.umidade,
        timestamp: dados.timestamp
      });
    });
  });
  
  return {
    ok: true,
    ts: new Date().toISOString(),
    total: todasBandejas.length,
    bandejas: todasBandejas
  };
}

function obterDadosDashboard() {
  const dispositivos = Object.values(estado.dispositivos);
  
  if (dispositivos.length === 0) {
    return {
      ok: true,
      ts: new Date().toISOString(),
      online: false,
      message: 'Nenhum dispositivo conectado',
      app: {
        nome: 'Saúde Real Microverdes IoT',
        uptime: Math.floor(process.uptime()),
        mqtt: conexaoAtiva ? 'conectado' : 'desconectado'
      }
    };
  }
  
  // Prioriza dispositivo real (não ESP32_DEFAULT) como principal
  let principal = dispositivos.find(d => d.id !== 'ESP32_DEFAULT' && d.ip && d.ip !== 'N/A');
  if (!principal) principal = dispositivos[0];
  
  // Mescla sensores de todos os dispositivos no principal
  const todosSensores = { ...(principal.sensores || {}) };
  const todasBandejas = { ...(principal.bandejas || {}) };
  
  dispositivos.forEach(d => {
    if (d.id !== principal.id) {
      Object.assign(todosSensores, d.sensores || {});
      Object.assign(todasBandejas, d.bandejas || {});
    }
  });
  
  return {
    ok: true,
    ts: new Date().toISOString(),
    online: true,
    dispositivo: {
      id: principal.id,
      nome: principal.nome,
      ip: principal.ip,
      rssi: principal.rssi,
      uptime: principal.uptime
    },
    sensores: todosSensores,
    bandejas: todasBandejas,
    dispositivos: dispositivos.map(d => ({
      id: d.id,
      online: d.online,
      lastSeen: d.lastSeen
    }))
  };
}

// ==================== MONITORAMENTO ====================

// Log de resumo a cada 2 minutos
setInterval(() => {
  const uptime = Math.floor(process.uptime());
  const memoria = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const dispositivos = Object.values(estado.dispositivos);
  const totalDev = dispositivos.length;
  const totalSens = dispositivos.reduce((acc, dev) => acc + Object.keys(dev.sensores || {}).length, 0);
  const totalBand = dispositivos.reduce((acc, dev) => acc + Object.keys(dev.bandejas || {}).length, 0);
  
  console.log(`\n╔═══════════════════════════════════════════════════╗`);
  console.log(`║            🌱  STATUS GERAL  🌱                  ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
  console.log(`📊 Uptime: ${uptime}s | Memória: ${memoria}MB`);
  console.log(`🔌 Dispositivos: ${totalDev} | Sensores: ${totalSens} | Bandejas: ${totalBand}`);
  console.log(`💾 Mensagens recebidas: ${estado.totalMensagens}`);
  console.log(`📡 MQTT: ${conexaoAtiva ? '🟢 Conectado' : '🔴 Desconectado'}`);
  console.log(`🕐 Última atualização: ${estado.ultimaAtualizacao || 'nunca'}\n`);
}, 120000); // 2 minutos

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', () => {
  console.log('\n📦 Recebido SIGTERM - encerrando gracefully...');
  
  if (conexaoAtiva) {
    client.publish('microverdes/status/aggregator', JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString()
    }), { retain: true });
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
console.log('🌱 Saúde Real Microverdes IoT — Render.com');
console.log('   Tópicos compatíveis: microverdes/sensor/*, microverdes/bandeja/*\n');

setTimeout(() => {
  if (!conexaoAtiva) {
    console.warn('\n⚠️  Aviso: RFID não conectou ao MQTT após 15s');
    console.warn('   Verificar conectividade da rede\n');
  }
}, 15000);
