# 🌱 Microverdes IoT - Automação com MQTT + EMQX Cloud + Render

Automação completa de irrigação para microverdes usando Arduino, MQTT e AI.

## 📋 Componentes

```
ESP32-C3 (Arduino)
    ↓ WiFi
EMQX Cloud (Broker MQTT gratuito)
    ↓
Render.com (App Node.js rodando 24/7)
    ↓
Automação inteligente de irrigação
```

## ✨ Características

- ✅ Lê sensores de umidade, temperatura e luz
- ✅ Controla irrigação automaticamente
- ✅ Broker MQTT na nuvem (EMQX Cloud - grátis)
- ✅ Script rodando 24/7 (Render.com - grátis)
- ✅ Dashboard web (EMQX Cloud)
- ✅ Sem manutenção de servidor
- ✅ Acessível de qualquer lugar

## 🚀 Quick Start

### 1. Criar conta EMQX Cloud
```
https://www.emqx.cloud
Sign Up → New Deployment (Free)
Copiar Broker ID: seu-id.emqx.cloud
Criar usuário: iotbr, senha: sua_senha
```

### 2. Setup ESP32 (Arduino IDE)
```
- Abrir esp32_mqtt_arduino_cloud.ino
- Atualizar: MQTT_BROKER = "seu-id.emqx.cloud"
- Atualizar WiFi SSID e PASSWORD
- Upload
```

### 3. Deploy no Render
```
- GitHub: novo repo com este código
- Render: New Web Service → GitHub
- Variáveis de ambiente:
  MQTT_BROKER = mqtt://seu-id.emqx.cloud:1883
  MQTT_USER = iotbr
  MQTT_PASSWORD = sua_senha
- Deploy!
```

### 4. Verificar
```
Render Logs: "Conectado ao EMQX Cloud!"
EMQX Dashboard: Connections mostra 2 clientes
```

## 📁 Arquivos

```
.
├── claude_mqtt_render.js      # Script principal (Render)
├── esp32_mqtt_arduino_cloud.ino # Código Arduino/ESP32
├── package.json               # Dependências Node.js
├── .env.example              # Template de variáveis
├── .gitignore                # Git ignore
└── README.md                 # Este arquivo
```

## 🔧 Configuração

### Variáveis de Ambiente (Render)

Adicionar em Environment:

```env
MQTT_BROKER=mqtt://seu-id.emqx.cloud:1883
MQTT_USER=iotbr
MQTT_PASSWORD=sua_senha_forte
NODE_ENV=production
PORT=3000
```

### Arduino ESP32-C3

Editar linhas no `.ino`:

```cpp
const char* SSID = "seu_wifi";
const char* PASSWORD = "sua_senha";
const char* MQTT_BROKER = "seu-id.emqx.cloud";
const char* MQTT_USER = "iotbr";
const char* MQTT_PASSWORD = "sua_senha_forte";
```

## 📊 Tópicos MQTT

### Publicado (ESP32 → Broker)
- `sensores/umidade` - % (0-100)
- `sensores/temperatura` - °C
- `sensores/luz` - % (0-100)

### Subscrito (Broker → ESP32)
- `irrigacao/ligar` - Ligar bomba
- `irrigacao/desligar` - Desligar bomba

## 🤖 Lógica de Automação

```javascript
// Automático (no Render)
if (umidade < 50%) ligar irrigação
if (umidade > 85%) desligar irrigação

// Manual (via CLI)
> ligar
> desligar
> status
```

## 📈 Monitoramento

### EMQX Cloud Dashboard
```
https://www.emqx.cloud
→ Seu deployment
→ Live Data: Ver mensagens em tempo real
→ Connections: 2 clientes (ESP32 + Render)
```

### Render Logs
```
Dashboard → seu-app → Logs
Ver tudo em tempo real
```

### Status HTTP
```
GET https://seu-app-xxxxx.onrender.com/status
Retorna: JSON com sensores, uptime, etc
```

## 🐛 Troubleshooting

### ESP32 não conecta WiFi
```
- Verificar SSID/senha
- Serial Monitor mostra erro?
- Verificar WiFi.begin() no código
```

### MQTT não conecta
```
- Broker ID correto? seu-id.emqx.cloud
- Usuário/senha corretos em EMQX Dashboard?
- Testar: mosquitto_sub -h seu-id.emqx.cloud -u iotbr -P senha
```

### Render pausou o app
```
- App pausar se sem requisições HTTP > 15 min
- Solução: UptimeRobot monitora http://seu-app/health a cada 5 min
- Ou usar /status como trigger do cron
```

### Logs vazios no Render
```
- Clicar "Clear Logs"
- Aguardar 10 segundos
- Recarregar
```

## 💡 Melhorias Futuras

- [ ] Dashboard web custom
- [ ] Histórico de dados (banco de dados)
- [ ] Alertas por email
- [ ] Múltiplos sensores
- [ ] Controle via WhatsApp
- [ ] IA para otimizar irrigação
- [ ] Gráficos de umidade/temperatura

## 📊 Limites (Camada Gratuita)

### EMQX Cloud
- Conexões: 10 (você usa 2)
- Mensagens/mês: 1M (você usa ~500K)
- Retenção: 1 hora

### Render
- Apps: 1
- Memória: 512MB (você usa ~50MB)
- Saída: 100GB/mês
- Uptime: ~98%

## 🔒 Segurança

### Recomendado
- [ ] Usar SSL/TLS (porta 8883 EMQX)
- [ ] Alterar senha padrão MQTT
- [ ] Usar .env para credenciais (nunca no Git)
- [ ] ACL no EMQX (opcional)
- [ ] Monitorar logs regularmente

### Checklist
```
☐ Credenciais no .env (não no código)
☐ .gitignore tem .env
☐ Senha MQTT forte
☐ EMQX ACL configurado
☐ Render Environment protegido
☐ IP whitelisting (opcional)
```

## 📞 Suporte

### Documentação
- [EMQX Cloud Docs](https://docs.emqx.com/en/cloud/latest/)
- [Render Docs](https://render.com/docs)
- [Arduino MQTT](https://github.com/knolleary/pubsubclient)

### Comunidades
- EMQX: https://github.com/emqx
- Render: https://discord.gg/render
- Arduino: https://forum.arduino.cc

## 📝 Licença

MIT - Use livremente!

## 👤 Autor

Iotbrlabs - Automação IoT para microverdes (litoral SP)

---

**Status:** ✅ Rodando em produção  
**Última atualização:** 2025-03-07  
**Node:** 18.x+  
**MQTT:** 5.x

## 🎯 Próximos Passos

1. Fazer fork deste repositório
2. Criar conta EMQX Cloud + Render
3. Deploy do ESP32
4. Deploy no Render
5. Monitorar e otimizar!

```bash
# Commands úteis
npm install              # Instalar dependências
npm start               # Rodar localmente
node claude_mqtt_render.js  # Rodar direto

# Git
git clone seu-repo
git add .
git commit -m "Update"
git push
```

**Bora automatizar seu cultivo! 🚀**
