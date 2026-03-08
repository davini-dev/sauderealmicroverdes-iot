# 🚀 Rodar Node.js no Render.com (Gratuito)

Render é **PERFEITO** pra deixar script rodando 24/7!

---

## 📊 Render vs alternatives

| Plataforma | Custo | Uptime | Ideal |
|-----------|-------|--------|-------|
| **Render** | Grátis | ~98% | ✅ Você |
| **Railway** | Grátis ($5 crédito) | ~99% | Bom também |
| **Replit** | Grátis (pausável) | Pausável | Testes |
| **Heroku** | R$7+ | ~99.95% | Pago |
| **RPi** | Eletricidade | Sua RPi | Local |

**Vantagens Render:**
- ✅ Grátis de verdade (web service)
- ✅ Sem cartão (Railway pede)
- ✅ Deploy em 2 min via GitHub
- ✅ Logs em tempo real
- ✅ Muito simples

---

## 🔧 PASSO 1: Preparar GitHub

### 1.1 Criar repositório no GitHub

```
https://github.com/new
```

**Preencher:**
```
Repository name: microverdes-iot
Description: MQTT client para EMQX Cloud
Public: Sim
Add .gitignore: Node
```

**Create repository**

### 1.2 Fazer push do código

**No seu computador:**

```bash
# Clonar repo
git clone https://github.com/seu_usuario/microverdes-iot.git
cd microverdes-iot

# Copiar seu arquivo
cp claude_mqtt_cloud.js .

# Criar package.json
npm init -y

# Instalar mqtt
npm install mqtt

# Commitar
git add .
git commit -m "Initial commit: MQTT client para EMQX Cloud"
git branch -M main
git push -u origin main
```

---

## 📝 PASSO 2: Configurar Arquivos

### 2.1 Criar `package.json` (se não tiver)

```json
{
  "name": "microverdes-iot",
  "version": "1.0.0",
  "description": "MQTT client para EMQX Cloud",
  "main": "claude_mqtt_cloud.js",
  "scripts": {
    "start": "node claude_mqtt_cloud.js"
  },
  "dependencies": {
    "mqtt": "^5.3.5"
  }
}
```

### 2.2 Criar `.env` (para credenciais)

**Arquivo: `.env`** (não commitar no Git!)

```
MQTT_BROKER=mqtt://seu-id.emqx.cloud:1883
MQTT_USER=iotbr
MQTT_PASSWORD=senha_muito_forte
```

### 2.3 Atualizar `claude_mqtt_cloud.js` para usar `.env`

**Instalar dotenv:**
```bash
npm install dotenv
```

**No topo do arquivo, adicionar:**
```javascript
require('dotenv').config();

// Mudar:
const BROKER = 'mqtt://seu-id.emqx.cloud:1883';

// Para:
const BROKER = process.env.MQTT_BROKER || 'mqtt://seu-id.emqx.cloud:1883';

const MQTT_OPTIONS = {
  clientId: 'claude_code_render',
  username: process.env.MQTT_USER || 'iotbr',
  password: process.env.MQTT_PASSWORD || 'senha',
  clean: true,
  reconnectPeriod: 5000,
  keepalive: 120
};
```

### 2.4 Criar `.gitignore`

```
node_modules/
.env
.DS_Store
*.log
```

### 2.5 Fazer push das mudanças

```bash
git add .
git commit -m "Add environment variables support"
git push
```

---

## 🚀 PASSO 3: Deploy no Render

### 3.1 Acessar Render

```
https://render.com
```

**Sign up** → GitHub (mais fácil)

### 3.2 Criar novo "Web Service"

```
Dashboard → New +
Selecionar: Web Service
```

### 3.3 Conectar GitHub

```
Connect your GitHub account
Selecionar repositório: microverdes-iot
Branch: main
```

### 3.4 Configurar deploy

**Preencher:**

```
Name: microverdes-iot (seu nome)
Runtime: Node
Build Command: npm install
Start Command: npm start
Environment: Free (gratuito)
```

### 3.5 Variáveis de ambiente

**Environment → Add Environment Variable**

Adicionar 3 variáveis:

```
MQTT_BROKER = mqtt://seu-id.emqx.cloud:1883
MQTT_USER = iotbr
MQTT_PASSWORD = sua_senha_forte
```

### 3.6 Deploy!

```
Clicar: Create Web Service
```

**Aguarda 1-2 min** (primeira vez é lenta)

---

## ✅ Verificar se está rodando

### 1. Logs em tempo real

```
Dashboard → seu-app → Logs
Deve aparecer:
  ✅ Conectado ao EMQX Cloud com sucesso!
  📡 Inscrito em: sensores/*, irrigacao/status
```

### 2. URL pública (não precisa usar, só pra saber)

```
Render cria: https://seu-app-xxxxx.onrender.com
(Seu script não precisa de HTTP, mas tá lá)
```

### 3. Testar se está recebendo sensores

**No seu computador:**

```bash
# Publicar teste
mosquitto_pub -h seu-id.emqx.cloud \
  -u iotbr -P sua_senha \
  -t sensores/umidade -m "72"

# Verificar logs no Render
# Deve aparecer: 📊 UMIDADE: 72
```

---

## 💡 COMO FUNCIONA

```
Seu ESP32 (casa)
    ↓ WiFi
EMQX Cloud (nuvem)
    ↓
Render (app rodando 24/7)
    ↓
Recebe sensores + controla irrigação
```

**Tudo automatizado, sem você mexer!** 🤖

---

## ⚙️ MANUTENÇÃO

### Atualizar código

```bash
# Fazer mudança no arquivo
nano claude_mqtt_cloud.js

# Commit e push
git add .
git commit -m "Update: nova feature"
git push

# Render detecta e faz deploy automático!
```

### Ver logs

```
Dashboard → seu-app → Logs
Ver tudo em tempo real
```

### Reiniciar

```
Dashboard → seu-app → Clicar "Restart"
```

### Atualizar credenciais MQTT

```
Dashboard → seu-app → Environment
Editar MQTT_USER / MQTT_PASSWORD
Salvar → Render reinicia automaticamente
```

---

## 📊 LIMITES RENDER GRATUITO

| Limite | Valor | Notas |
|--------|-------|-------|
| **Apps simultâneos** | 1 | Basta |
| **Uptime** | ~98% | Slot pode pausar |
| **Memória** | 512MB | Seu script usa ~50MB |
| **CPU** | Compartilhado | Suficiente |
| **Saída de dados** | 100GB/mês | Você não usa 1GB |
| **Custo** | R$ 0 | Gratuito mesmo |

**⚠️ Aviso importante:**
- Render pode "pausar" seu app se não receber requisições HTTP por 15 min
- **Solução:** Fazer uma requisição a cada 14 min

---

## 🔧 EVITAR PAUSE (Importante!)

Render pausa apps que não recebem HTTP!

### Solução 1: Cron job (grátis)

**Usar EasyCron:** https://www.easycron.com/

```
https://seu-app-xxxxx.onrender.com
Rodar a cada 10 min
```

### Solução 2: Modificar script para responder HTTP

```javascript
// Adicionar ao seu claude_mqtt_cloud.js

const http = require('http');
const port = process.env.PORT || 3000;

// Criar server HTTP simples
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('OK - Microverdes IoT rodando\n');
});

server.listen(port, () => {
  console.log(`📡 Server HTTP rodando em :${port}`);
});

// Rest do código MQTT fica igual
```

**Depois:**

```bash
git add .
git commit -m "Add HTTP endpoint to prevent pause"
git push
```

---

## 📈 MONITORAR UPTIME

### Opção 1: Render Dashboard

```
Dashboard → seu-app
Ver status em tempo real
```

### Opção 2: UptimeRobot (gratuito)

```
https://uptimerobot.com
Monitor: https://seu-app-xxxxx.onrender.com
Alertas no email
```

---

## 🐛 TROUBLESHOOTING

| Problema | Solução |
|----------|---------|
| **"App paused"** | Precisa HTTP endpoint (veja acima) |
| **Não conecta MQTT** | Verificar credenciais em Environment |
| **Logs vazios** | Clicar "Clear Logs", wait 10s |
| **Memória alta** | Seu script usa só 50MB, ok |
| **Deploy falhando** | `npm install` pode estar slow, retry |

---

## 🎯 SETUP FINAL RESUMIDO

```bash
# 1. GitHub
git clone seu-repo
cp claude_mqtt_cloud.js .
npm init -y && npm install mqtt
git add . && git commit && git push

# 2. Render
Sign up → New Web Service → GitHub
Name: microverdes-iot
Start Command: npm start

# 3. Variáveis
Environment:
  MQTT_BROKER = mqtt://seu-id.emqx.cloud:1883
  MQTT_USER = iotbr
  MQTT_PASSWORD = sua_senha

# 4. Deploy!
Create Web Service

# 5. Verificar
Logs → "Conectado ao EMQX Cloud!"
```

---

## 💻 EXEMPLO COMPLETO: `claude_mqtt_cloud.js`

```javascript
require('dotenv').config();
const mqtt = require('mqtt');
const http = require('http');

// ==================== HTTP SERVER (evitar pause) ====================
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`📡 Server HTTP rodando em :${port}`);
});

// ==================== MQTT CONFIG ====================
const BROKER = process.env.MQTT_BROKER || 'mqtt://seu-id.emqx.cloud:1883';
const MQTT_OPTIONS = {
  clientId: 'claude_code_render',
  username: process.env.MQTT_USER || 'iotbr',
  password: process.env.MQTT_PASSWORD || 'senha',
  clean: true,
  reconnectPeriod: 5000,
  keepalive: 120
};

console.log(`📡 Broker: ${BROKER}`);
console.log(`👤 Usuário: ${MQTT_OPTIONS.username}\n`);

// ==================== MQTT CLIENT ====================
let sensores = {
  umidade: 0,
  temperatura: 0,
  luz: 0,
  ultimaAtualizacao: null
};

let irrigacaoAtiva = false;
const client = mqtt.connect(BROKER, MQTT_OPTIONS);

client.on('connect', () => {
  console.log('✅ Conectado ao EMQX Cloud!\n');
  
  client.subscribe('sensores/umidade');
  client.subscribe('sensores/temperatura');
  client.subscribe('sensores/luz');
  client.subscribe('irrigacao/status');
  
  console.log('📡 Inscrito em: sensores/*, irrigacao/status\n');
});

client.on('message', (topic, message) => {
  const valor = parseFloat(message.toString());
  
  if (topic === 'sensores/umidade') sensores.umidade = valor;
  else if (topic === 'sensores/temperatura') sensores.temperatura = valor;
  else if (topic === 'sensores/luz') sensores.luz = valor;
  else if (topic === 'irrigacao/status') irrigacaoAtiva = message.toString() === 'on';
  
  sensores.ultimaAtualizacao = new Date();
  
  console.log(`📊 ${topic.split('/')[1].toUpperCase()}: ${valor}`);
  
  // Lógica automática
  autoIrrigacao();
});

client.on('error', (err) => {
  console.error('❌ Erro:', err.message);
});

// ==================== LÓGICA ====================
function autoIrrigacao() {
  if (sensores.umidade < 50 && !irrigacaoAtiva) {
    console.log(`⚠️  Umidade baixa - acionando`);
    client.publish('irrigacao/ligar', 'on');
  }
  
  if (sensores.umidade > 85 && irrigacaoAtiva) {
    console.log(`✅ Umidade OK - desligando`);
    client.publish('irrigacao/desligar', 'off');
  }
}

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando...');
  client.end();
  server.close();
  process.exit(0);
});

console.log('🌱 Microverdes IoT rodando no Render!\n');
```

---

## ✅ CHECKLIST FINAL

```
☐ Criar conta Render (gratuito)
☐ Conectar GitHub
☐ Push do repositório
☐ New Web Service no Render
☐ Start Command: npm start
☐ Variáveis de ambiente (MQTT_BROKER, USER, PASS)
☐ Deploy
☐ Verificar logs ("Conectado!")
☐ Testar: mosquitto_pub sensores/umidade
☐ Pronto! 🎉
```

---

## 🎯 SEU SETUP FINAL

```
ESP32 em casa
    ↓ WiFi
EMQX Cloud (broker)
    ↓
Render (seu script 24/7)
    ↓
Publica comandos de volta pro ESP32
    ↓
Irrigação automática! 🌱
```

**Zero manutenção, completamente grátis, rodando 24/7!**

---

**Dúvidas? Qual etapa fazer primeiro?**
1. Preparar repositório GitHub?
2. Setup no Render?
3. Testar após deploy?
