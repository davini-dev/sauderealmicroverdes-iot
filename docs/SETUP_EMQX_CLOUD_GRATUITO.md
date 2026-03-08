# 🌐 EMQX Cloud (Camada Gratuita) - Setup Completo

EMQX Cloud é o **SAAS gerenciado** - não precisa instalar nada na RPi!

---

## 📊 EMQX Cloud vs EMQX Self-Hosted

| Feature | Cloud Gratuito | Self-Hosted (Docker) |
|---------|----------------|----------------------|
| **Setup** | 5 minutos | 30 minutos |
| **Manutenção** | Zero | Você mantém |
| **Uptime** | 99.9% garantido | Depende da RPi |
| **Conexões** | Até 10 | Ilimitado |
| **Mensagens/mês** | 1 milhão | Ilimitado |
| **SSL/TLS** | ✅ Grátis | ⚠️ Você configura |
| **Custo** | **R$ 0** | R$ 0 (host) |
| **Ideal para** | Prototipagem/hobby | Produção |

**Para seu caso (1 ESP32 + 1 Claude Code):** Camada gratuita sobra espaço!

---

## 🔧 PASSO 1: Criar Conta EMQX Cloud

1. **Acessar:** https://www.emqx.cloud
2. **Clicar:** "Get Started" ou "Sign Up"
3. **Preencher:**
   ```
   Email: seu_email@gmail.com
   Password: sua_senha_forte
   ```
4. **Confirmar:** Email (check no inbox)

---

## 📝 PASSO 2: Criar Novo Projeto (Deployment)

### 2.1 No dashboard, clicar "New Deployment"

```
Deployments → New Deployment
```

### 2.2 Configurar:

```
Deployment Name: microverdes-iot
Region: São Paulo (sa-east-1)  ← Latência menor!
Plan: Free
```

### 2.3 Create

**Aguarda 2-3 minutos** (está criando broker na nuvem)

---

## 🔐 PASSO 3: Credenciais de Conexão

Após criar, você recebe:

```
Broker Address: seu-deployment.emqx.cloud
Port: 1883 (MQTT padrão)
         8883 (MQTT+SSL)
         8084 (WebSocket)

Exemplo: a1b2c3d4.emqx.cloud:1883
```

### Criar Username + Password

No dashboard do deployment:

```
Access Control → Authentication → Create User

Username: iotbr
Password: senha_muito_forte_123
Description: ESP32 Microverdes

Create
```

**Salve essas credenciais!** Você vai usar em Arduino e Node.js.

---

## 📋 INFORMAÇÕES IMPORTANTES

**Seu Setup EMQX Cloud:**

```
Broker: a1b2c3d4.emqx.cloud  (seu ID será diferente)
Port: 1883 (ou 8883 com SSL)
Username: iotbr
Password: senha_muito_forte_123
```

**Testar conexão (na RPi):**

```bash
mosquitto_sub -h a1b2c3d4.emqx.cloud -p 1883 \
  -u iotbr -P senha_muito_forte_123 \
  -t 'sensores/#'
```

---

## 🎯 PASSO 4: Atualizar Códigos Arduino + Node.js

### Arduino (.ino)

**Mudar apenas 2 linhas:**

```cpp
// ANTES (localhost)
const char* MQTT_BROKER = "192.168.1.100";
const int MQTT_PORT = 1883;

// DEPOIS (EMQX Cloud)
const char* MQTT_BROKER = "a1b2c3d4.emqx.cloud";  // ← Seu ID
const int MQTT_PORT = 1883;

// Rest fica igual (username/password mesmo)
const char* MQTT_USER = "iotbr";
const char* MQTT_PASSWORD = "senha_muito_forte_123";
```

**Tudo mais fica exatamente igual!**

### Node.js / Claude Code

**Mudar apenas a URL:**

```javascript
// ANTES
const BROKER = 'mqtt://192.168.1.100:1883';

// DEPOIS
const BROKER = 'mqtt://a1b2c3d4.emqx.cloud:1883';

// Rest fica igual (username/password mesmo)
const MQTT_OPTIONS = {
  username: 'iotbr',
  password: 'senha_muito_forte_123'
};
```

---

## ✅ TESTAR CONEXÃO

### Terminal 1: ESP32 Upload

```cpp
// No Arduino IDE com credenciais atualizado
Sketch → Upload
```

**Abrir Serial Monitor:**
```
✅ WiFi conectado: 192.168.1.150
📡 Conectando EMQX: a1b2c3d4.emqx.cloud:1883
✅ EMQX conectado com autenticação
📡 Inscrito em: irrigacao/ligar, irrigacao/desligar
📤 Sensores: U=65% T=27.3°C L=45%
```

### Terminal 2: Claude Code / Node.js

```bash
npm install mqtt
node claude_mqtt_emqx.js
```

**Saída esperada:**
```
🤖 Claude Code + EMQX Cloud

📡 Conectando: mqtt://a1b2c3d4.emqx.cloud:1883
👤 Usuário: iotbr

✅ Conectado ao EMQX com sucesso!
📡 Inscrito em: sensores/*, irrigacao/status

📊 UMIDADE: 65
📊 TEMPERATURA: 27.3
📊 LUZ: 45
```

### Terminal 3: Dashboard EMQX Cloud

```
https://www.emqx.cloud
→ Seu deployment
→ Connections: Deve mostrar 2 clientes (ESP32 + Node.js)
→ Live Data: Ver mensagens passando em tempo real
```

---

## 📊 MONITORAR TUDO PELA WEB

### Dashboard EMQX Cloud (GRATUITO):

1. **Login:** https://www.emqx.cloud
2. **Seu deployment** (microverdes-iot)
3. **Abas úteis:**

```
Overview:
├─ Connections: 2/10 (ESP32 + Claude Code)
├─ Throughput: mensagens/segundo
└─ Traffic: bytes enviados/recebidos

Live Data:
├─ Ver tópicos em tempo real
├─ Publicar testes
└─ Debug direto na web

Metrics:
├─ Histórico de conexões
├─ CPU/Memória (do broker)
└─ Alertas

ACL (opcional):
├─ Controlar acesso por usuário
├─ Restringir tópicos
└─ Segurança
```

---

## 🔒 SEGURANÇA (Recomendado)

### SSL/TLS (HTTPS para MQTT)

EMQX Cloud oferece SSL/TLS **grátis**:

```cpp
// Arduino - usar porta 8883 com SSL
const char* MQTT_BROKER = "a1b2c3d4.emqx.cloud";
const int MQTT_PORT = 8883;  // ← SSL

// Instalar certificado (opcional no Arduino)
// client.setCACert(ca_cert);
```

```javascript
// Node.js
const BROKER = 'mqtts://a1b2c3d4.emqx.cloud:8883';  // mqtts = SSL
```

**Nota:** Porta 1883 (sem SSL) funciona, mas SSL é mais seguro.

---

## 📈 LIMITES DA CAMADA GRATUITA

| Limite | Valor | Notas |
|--------|-------|-------|
| **Conexões simultâneas** | 10 | Sobra pra você |
| **Mensagens/mês** | 1 milhão | ~33K msgs/dia |
| **Taxa de publicação** | 100 msgs/sec | Mais que suficiente |
| **Retenção de dados** | 1 hora | Sem persistência |
| **Suporte** | Community | Fóruns, docs |

**Seu consumo (estimado):**
- ESP32 publica 12 msgs/min (5s intervalo × 3 tópicos)
- = ~17.280 msgs/dia
- = ~520.000 msgs/mês

**Ainda sobra 480.000!** ✅

---

## 🚀 SETUP FINAL RESUMIDO

```bash
# 1. Criar conta EMQX Cloud
# https://www.emqx.cloud → Sign Up

# 2. Novo Deployment
# Name: microverdes-iot
# Region: São Paulo
# Plan: Free

# 3. Criar usuário (no dashboard)
# Username: iotbr
# Password: senha_forte

# 4. Arduino IDE
# Atualizar MQTT_BROKER com seu ID
# Upload

# 5. Node.js
# npm install mqtt
# node claude_mqtt_emqx.js

# 6. Testar
# mosquitto_sub -h seu-id.emqx.cloud -u iotbr -P senha
```

---

## 📱 BÔNUS: Acessar MQTT de qualquer lugar

Como está na nuvem, você pode:

```
ESP32 (WiFi em casa) → EMQX Cloud
                      ↓
             (Internet pública)
                      ↓
Claude Code (em outro lugar)
```

Funciona até se você mudar de WiFi!

---

## 🧪 EXEMPLO: Teste rápido

**No seu computador (Windows/Mac/Linux):**

```bash
# Instalar MQTT client (se não tiver)
# macOS: brew install mosquitto
# Debian: sudo apt install mosquitto-clients
# Windows: https://mosquitto.org/download/

# Testar conexão
mosquitto_sub -h a1b2c3d4.emqx.cloud -p 1883 \
  -u iotbr -P senha_muito_forte_123 \
  -t 'sensores/#' \
  -v

# Resultado:
# sensores/umidade 65
# sensores/temperatura 27.3
# sensores/luz 45
```

---

## 🔄 EVOLUINDO (Quando crescer)

Se precisar de mais:

| Necessidade | Solução |
|------------|---------|
| Mais de 10 conexões | Upgrade Pro ($20/mês) |
| Mais de 1M msgs | Upgrade Pro ($20+) |
| Seu próprio servidor | EMQX Self-Hosted Docker |
| Análise de dados | Webhook → Backend próprio |

**Para agora:** Camada gratuita é **perfeita**!

---

## 💡 DICAS IMPORTANTES

### 1. Salve credenciais em lugar seguro
```
Arquivo: emqx_credentials.txt
─────────────────────────────
Broker: a1b2c3d4.emqx.cloud
Port: 1883
Username: iotbr
Password: senha_muito_forte_123
Dashboard: https://www.emqx.cloud
```

### 2. Monitorar consumo
```
Dashboard → Overview
Verificar mensagens/mês e conexões
```

### 3. ACL para segurança (opcional)
```
Access Control → ACL
Restringir tópicos por usuário
```

### 4. Backups não existem
- Dados não persistem (limite gratuito)
- Use webhook + backend se precisar histórico
- Ou upgrade para Pro

---

## ❌ TROUBLESHOOTING

| Problema | Solução |
|----------|---------|
| **Não conecta** | IP/Porta corretos? Checar credentials |
| **Conexão timeout** | WiFi conectada? Firewall bloqueando? |
| **Senha rejeitada** | Verificar no dashboard EMQX Cloud |
| **Dashboard não abre** | Fazer login em www.emqx.cloud primeiro |
| **Mensagens não chegam** | ACL bloqueando? Checar Live Data |

---

## 📚 PRÓXIMOS PASSOS

1. **Cadastrar:** https://www.emqx.cloud
2. **Criar deployment** (Free plan)
3. **Copiar credenciais** (broker ID, user, pass)
4. **Atualizar Arduino** + **Node.js**
5. **Upload** e **testar**
6. **Monitorar** no dashboard

---

**Tudo funcionando? Parabéns! 🎉**

Agora você tem:
- ✅ Broker MQTT na nuvem (sem manutenção)
- ✅ ESP32 lendo sensores + publicando
- ✅ Claude Code controlando automação
- ✅ Dashboard web pra monitorar
- ✅ Acessível de qualquer lugar

Qual é o próximo passo? Quer adicionar dashboard custom? Salvar histórico? Alertas?
