/*
  Claude Code + MQTT (TCP) + VPS Hetzner
  
  Agregação de dados do microverdes-iot
  Tópicos compatíveis com arduino/microverdes.ino
  
  Farmácia Saúde Real — Microverdes IoT
  
  Execute localmente:
  npm install mqtt dotenv
  node claude_mqtt_render_aggregator.js
  
  Variáveis de ambiente opcionais:
  PORT=3000
  MQTT_BROKER_URL=<thingsboard-gateway-host>
  MQTT_BROKER_PORT=1883

  Credenciais MQTT fixas no código:
  usuário = QBlEQkAvzAALcjiCiyxI
  senha   = (em branco)
*/

require('dotenv').config();
const mqtt = require('mqtt');
const http = require('http');

const now = () => new Date().toISOString();
const logger = {
  info: (...args) => console.log('[INFO]', now(), ...args),
  warn: (...args) => console.warn('[WARN]', now(), ...args),
  error: (...args) => console.error('[ERROR]', now(), ...args),
  debug: (...args) => console.debug('[DEBUG]', now(), ...args)
};

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
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ ok: true, status: 'OK' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, () => {
  logger.info(`Server HTTP rodando em http://localhost:${port}`);
  logger.info(`Endpoints: /status, /devices, /sensors, /bandejas, /dashboard-data, /health`);
});

// ==================== ESTADO GLOBAL ====================

let estado = {
  dispositivos: {},
  pendentes: {
    sensores: {},
    bandejas: {}
  },
  ultimaAtualizacao: null,
  totalMensagens: 0
};

// Sem mensagem MQTT recente → dispositivo considerado offline
// ESP32 publica device/info a cada 30s → 45s = ~1.5 ciclos perdidos
const DEVICE_TIMEOUT_MS = 45 * 1000;

function infoApp() {
  return {
    nome: 'Saúde Real Microverdes IoT',
    uptime: Math.floor(process.uptime()),
    mqtt: conexaoAtiva ? 'conectado' : 'desconectado',
  };
}

function dispositivoAtivo(dev) {
  if (!dev?.lastSeen) return false;
  return Date.now() - new Date(dev.lastSeen).getTime() <= DEVICE_TIMEOUT_MS;
}

function marcarDispositivosInativos() {
  Object.values(estado.dispositivos).forEach((dev) => {
    dev.online = dispositivoAtivo(dev);
  });
}

// ── Marca dispositivo offline via LWT (Last Will and Testament) ──
function marcarOfflinePorLWT(deviceId) {
  if (estado.dispositivos[deviceId]) {
    estado.dispositivos[deviceId].online = false;
    console.log(`🔴 [LWT] Dispositivo ${deviceId} marcado como OFFLINE (disconnect detectado pelo broker)`);
  }
}

function obterDispositivosAtivos() {
  marcarDispositivosInativos();
  return Object.values(estado.dispositivos).filter(dispositivoAtivo);
}

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

// ==================== MQTT CONFIG (TCP - THINGSBOARD GATEWAY) ====================
const BROKER_URL = process.env.MQTT_BROKER_URL || 'thingsboard-gateway-host';
const BROKER_PORT = parseInt(process.env.MQTT_BROKER_PORT) || 1883;
const MQTT_USER = 'QBlEQkAvzAALcjiCiyxI';
const MQTT_PASS = '';

const MQTT_OPTIONS = {
  clientId: 'sauderealmicroverdes_aggregator_' + Date.now(),
  protocol: 'mqtt',
  port: BROKER_PORT,
  username: MQTT_USER,
  password: MQTT_PASS,
  
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
logger.info('Saúde Real Microverdes — MQTT Aggregator iniciado');
logger.info(`Configuração MQTT: servidor=${BROKER_URL}:${BROKER_PORT}, usuário=${MQTT_USER}, senha=${MQTT_PASS ? '***' : '(em branco)'}, protocolo=mqtt`);

const brokerUrl = `mqtt://${BROKER_URL}:${BROKER_PORT}`;
const client = mqtt.connect(brokerUrl, MQTT_OPTIONS);

let conexaoAtiva = false;

client.on('connect', () => {
  logger.info('Conectado ao broker MQTT (TCP)');
  logger.info('Conexão sem criptografia na porta 1883');
  
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
  
  // Subscribe apenas nos tópicos simulados pelo firmware
  const topicos = [
    TOPICOS.TEMP,           // microverdes/sensor/temp
    TOPICOS.AR,             // microverdes/sensor/ar
    TOPICOS.LUZ,            // microverdes/sensor/luz
    TOPICOS.UMIDADE,        // microverdes/sensor/umidade
    TOPICOS.NEBLINA,        // microverdes/status/neblina
    TOPICOS.IRRIGACAO,      // microverdes/cmd/irrigacao
    TOPICOS.DEVICE,         // microverdes/device/info
    TOPICOS.BANDEJA + '#',  // microverdes/bandeja/+
  ];
  
  const sub = client.subscribe(topicos);
  logger.info('Inscrito em tópicos:', topicos.join(', '));
});

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

function aplicarPendentes(deviceId) {
  const pendentesSensores = estado.pendentes.sensores[deviceId] || {};
  const pendentesBandejas = estado.pendentes.bandejas[deviceId] || {};

  Object.entries(pendentesSensores).forEach(([tipo, dados]) => {
    estado.dispositivos[deviceId].sensores[tipo] = dados;
  });
  Object.entries(pendentesBandejas).forEach(([id, dados]) => {
    estado.dispositivos[deviceId].bandejas[id] = dados;
  });

  delete estado.pendentes.sensores[deviceId];
  delete estado.pendentes.bandejas[deviceId];
}

// ==================== MESSAGE HANDLER ====================

client.on('message', (topic, message) => {
  try {
    const payload = message.toString();
    const timestamp = new Date();

    // ── DEVICE INFO (JSON) ──
    if (topic === TOPICOS.DEVICE) {
      const data = JSON.parse(payload);
      const deviceId = data.id;
      if (!deviceId) {
        console.warn('[AGG] device/info sem id ignorado');
        return;
      }
      
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
      }

      estado.dispositivos[deviceId].online = true;
      estado.dispositivos[deviceId].lastSeen = timestamp.toISOString();
      estado.dispositivos[deviceId].ip = data.ip || estado.dispositivos[deviceId].ip;
      estado.dispositivos[deviceId].mac = data.mac || estado.dispositivos[deviceId].mac;
      estado.dispositivos[deviceId].rssi = data.rssi ?? estado.dispositivos[deviceId].rssi;
      estado.dispositivos[deviceId].uptime = data.uptime || estado.dispositivos[deviceId].uptime;
      estado.dispositivos[deviceId].heap_free = data.heap_free ?? estado.dispositivos[deviceId].heap_free;
      estado.dispositivos[deviceId].modo = data.modo || estado.dispositivos[deviceId].modo;
      aplicarPendentes(deviceId);
      
      estado.ultimaAtualizacao = timestamp.toISOString();
      estado.totalMensagens++;
      return;
    }
    
    // ── BANDEJAS (microverdes/bandeja/+) ──
    if (topic.startsWith(TOPICOS.BANDEJA)) {
      const bandeja = processarBandeja(topic, message);
      if (!bandeja) return;

      const deviceId = Object.keys(estado.dispositivos)[0];
      if (!deviceId) {
        const pendingKey = 'microverdes';
        if (!estado.pendentes.bandejas[pendingKey]) estado.pendentes.bandejas[pendingKey] = {};
        estado.pendentes.bandejas[pendingKey][bandeja.id] = {
          ...bandeja,
          timestamp: timestamp.toISOString()
        };
        estado.ultimaAtualizacao = timestamp.toISOString();
        estado.totalMensagens++;
        return;
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
      const deviceId = Object.keys(estado.dispositivos)[0];
      if (!deviceId) {
        const pendingKey = 'microverdes';
        if (!estado.pendentes.sensores[pendingKey]) estado.pendentes.sensores[pendingKey] = {};
        estado.pendentes.sensores[pendingKey][sensorInfo.tipo] = {
          valor: sensorInfo.valor,
          unidade: sensorInfo.unidade,
          timestamp: timestamp.toISOString(),
          topico: topic
        };
        estado.ultimaAtualizacao = timestamp.toISOString();
        estado.totalMensagens++;
        return;
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
      logger.info(`[${tempo}] ${deviceId.padEnd(16)} → ${sensorInfo.tipo.toUpperCase().padEnd(14)}: ${sensorInfo.valor}${sensorInfo.unidade}`);
      return;
    }
  } catch (err) {
    logger.error(`Falha ao processar mensagem em "${topic}": ${err.message}`);
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
  logger.error(`Erro MQTT: ${err.message}`);
  conexaoAtiva = false;
});

client.on('disconnect', () => {
  logger.warn('Desconectado do broker MQTT');
  conexaoAtiva = false;
});

client.on('reconnect', () => {
  logger.info('Tentando reconectar ao broker MQTT');
});

client.on('offline', () => {
  logger.warn('Cliente MQTT offline');
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
      plataforma: 'VPS Hetzner (Alemanha)',
      uptime: Math.floor(process.uptime()),
      memoria_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    
    mqtt: {
      servidor: BROKER_URL,
      porta: BROKER_PORT,
      protocolo: 'mqtt (TCP)',
      autenticacao: 'usuário/senha',
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
  const dispositivos = obterDispositivosAtivos();

  if (dispositivos.length === 0) {
    return {
      ok: true,
      ts: new Date().toISOString(),
      online: false,
      message: 'Nenhum dispositivo conectado',
      app: infoApp(),
    };
  }

  // Prioriza um dispositivo com IP válido como principal
  let principal = dispositivos.find(d => d.ip && d.ip !== 'N/A');
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
    })),
    app: infoApp(),
  };
}

// ==================== MONITORAMENTO ====================

// Marca dispositivos sem heartbeat recente como offline
setInterval(marcarDispositivosInativos, 15_000);// Intervalo reduzido de 60s → 15s

// Log de resumo a cada 2 minutos
setInterval(() => {
  const uptime = Math.floor(process.uptime());
  const memoria = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const dispositivos = Object.values(estado.dispositivos);
  const totalDev = dispositivos.length;
  const totalSens = dispositivos.reduce((acc, dev) => acc + Object.keys(dev.sensores || {}).length, 0);
  const totalBand = dispositivos.reduce((acc, dev) => acc + Object.keys(dev.bandejas || {}).length, 0);
  
  logger.info(
    `STATUS GERAL | uptime=${uptime}s | memoria=${memoria}MB | dispositivos=${totalDev} | sensores=${totalSens} | bandejas=${totalBand} | mensagens=${estado.totalMensagens} | mqtt=${conexaoAtiva ? 'conectado' : 'desconectado'} | ultima_atualizacao=${estado.ultimaAtualizacao || 'nunca'}`
  );
}, 120000); // 2 minutos

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM - encerrando graceful shutdown');
  
  if (conexaoAtiva) {
    client.publish('microverdes/status/aggregator', JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString()
    }), { retain: true });
  }
  
  client.end(false, () => {
    logger.info('MQTT desconectado');
  });
  
  server.close(() => {
    logger.info('HTTP server fechado');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.warn('Forçando saída após 10s');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  logger.info('Recebido SIGINT - encerrando');
  process.emit('SIGTERM');
});

process.on('uncaughtException', (err) => {
  logger.error('Exceção não tratada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Promise rejection não tratada:', reason);
});

// ==================== STARTUP ====================
logger.info('Saúde Real Microverdes IoT — VPS Hetzner');
logger.info('Tópicos compatíveis: microverdes/sensor/*, microverdes/bandeja/*');

setTimeout(() => {
  if (!conexaoAtiva) {
    logger.warn('Aviso: não foi possível conectar ao MQTT após 15s');
    logger.warn('Verificar conectividade de rede');
  }
}, 15000);
