# 🎯 Setup Arduino IDE + ESP32-C3 + MQTT

## 📋 O que você precisa

```
✅ Arduino IDE 2.0+ (download: arduino.cc)
✅ ESP32-C3 (pode ser clone, funciona igual)
✅ Cabo USB-C (comum em ESP32-C3)
✅ Raspberry Pi rodando Mosquitto (broker MQTT)
```

---

## 🔧 PASSO 1: Instalar Arduino IDE + Board Manager

### 1.1 Baixar Arduino IDE
- Acesse: https://www.arduino.cc/en/software
- Instalar versão 2.0+

### 1.2 Adicionar suporte ESP32
Dentro do Arduino IDE:

```
File → Preferences → Additional boards manager URLs

Cole this link:
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

OK
```

### 1.3 Instalar a placa ESP32

```
Tools → Board → Boards Manager
Buscar: ESP32
Clicar em "ESP32 by Espressif Systems"
Clicar Install (demora ~5 min)
```

---

## 📚 PASSO 2: Instalar Bibliotecas

Dentro do Arduino IDE:

```
Sketch → Include Library → Manage Libraries
```

**Instalar 2 bibliotecas:**

1. **PubSubClient** (by Nick O'Leary)
   - Buscar: `PubSubClient`
   - Versão recomendada: 2.8.0+
   - Clicar Install

2. **ArduinoJson** (by Benoit Blanchon) - Opcional mas recomendado
   - Buscar: `ArduinoJson`
   - Versão: 6.20.0+
   - Clicar Install

**Verificar instalação:**
```
Sketch → Include Library
Deve aparecer PubSubClient e ArduinoJson
```

---

## 🔌 PASSO 3: Conectar ESP32-C3

1. **Plugar ESP32** via cabo USB-C no computador
2. **Abrir Tools → Port**
   - Deve aparecer `/dev/ttyUSB0` (Linux) ou `COM3` (Windows)
   - Se não aparecer: instalar driver CH340 (copiar USB)

3. **Configurar Board:**
   ```
   Tools → Board → esp32 → ESP32C3 Dev Module
   ```

4. **Configurar porta:**
   ```
   Tools → Port → /dev/ttyUSB0 (ou COM X)
   ```

5. **Testar upload vazio:**
   ```
   Sketch → Upload (Ctrl+U)
   Deve aparecer: "Hard resetting via RTS pin..."
   ```

---

## 📝 PASSO 4: Carregar Código MQTT

1. **Abrir arquivo:** `esp32_mqtt_arduino.ino`

2. **Editar configuração (linhas 11-15):**
   ```cpp
   const char* SSID = "seu_wifi";           // ← MUDAR
   const char* PASSWORD = "sua_senha";      // ← MUDAR
   const char* MQTT_BROKER = "192.168.1.100"; // ← IP do Raspberry
   ```

3. **Verificar sintaxe:**
   ```
   Sketch → Verify (Ctrl+Alt+U)
   Deve aparecer: "Compilation complete"
   ```

4. **Fazer upload:**
   ```
   Sketch → Upload (Ctrl+U)
   Deve aparecer: "Leaving... Hard resetting via RTS pin..."
   ✅ Pronto!
   ```

---

## 📊 PASSO 5: Monitorar Serial

1. **Abrir Serial Monitor:**
   ```
   Tools → Serial Monitor (Ctrl+Shift+M)
   ```

2. **Configurar velocidade (canto inferior direito):**
   ```
   115200 baud
   ```

3. **Ver saída esperada:**
   ```
   ╔════════════════════════════════════════╗
   ║  🌱 ESP32-C3 MQTT - Arduino IDE       ║
   ║  Microverdes + Automação               ║
   ╚════════════════════════════════════════╝
   
   🔗 Conectando WiFi: seu_wifi
   ✅ WiFi conectado: 192.168.1.150
   📡 Conectando MQTT: 192.168.1.100:1883
   ✅ MQTT conectado
   📡 Inscrito em: irrigacao/ligar, irrigacao/desligar
   
   ✅ Setup completo!
   
   📤 Sensores: U=65% T=27.3°C L=45%
   📤 Sensores: U=64% T=27.2°C L=46%
   ```

---

## 🧪 TESTAR COMUNICAÇÃO MQTT

### Do Raspberry Pi, publique comandos:

```bash
# SSH na RPi
ssh pi@192.168.1.100

# Ligar irrigação
mosquitto_pub -h localhost -t irrigacao/ligar -m "on"

# Ver no Serial Monitor do ESP32:
# 📨 Recebido: irrigacao/ligar = on
# 💧 ➡️  IRRIGAÇÃO LIGADA

# Desligar irrigação
mosquitto_pub -h localhost -t irrigacao/desligar -m "off"
```

### Monitorar sensores:

```bash
# Terminal na RPi
mosquitto_sub -h localhost -t 'sensores/#'

# Saída esperada:
# sensores/umidade 65
# sensores/temperatura 27.3
# sensores/luz 45
# sensores/umidade 64
# sensores/temperatura 27.2
# sensores/luz 46
```

---

## ⚙️ CALIBRAÇÃO DOS SENSORES

### Sensor Capacitivo de Umidade

**Problema:** Valores não fazem sentido?

**Solução 1: Calibrar no código**

```cpp
// Linhas 28-29 do código
const int ADC_UMIDADE_SECO = 3000;    // ← Ajustar
const int ADC_UMIDADE_MOLHADO = 1500; // ← Ajustar
```

**Como descobrir valores reais:**

1. Descomente linha (abrir Serial Monitor):
   ```cpp
   Serial.println(analogRead(PIN_UMIDADE));
   ```

2. Teste em 2 situações:
   - **Ar seco**: coloque sensor longe da água → anotou o valor?
   - **Molhado**: coloque sensor em copo com água → anotou?

3. Substitua no código:
   ```cpp
   const int ADC_UMIDADE_SECO = 2850;    // Seu valor
   const int ADC_UMIDADE_MOLHADO = 1420; // Seu valor
   ```

4. Upload novamente

---

## 🔧 DICAS & TROUBLESHOOTING

| Problema | Solução |
|----------|---------|
| **"COM port not found"** | Instalar driver CH340: https://sparks.gogo.co.nz/ch340.html |
| **"Compilation failed"** | Verificar se PubSubClient está instalado (Manage Libraries) |
| **WiFi não conecta** | SSID/Senha corretos? Verificar espaços em branco |
| **MQTT não conecta** | IP do Mosquitto correto? `hostname -I` na RPi |
| **Sensores zerados** | Verificar pinos GPIO (3, 4, 5, 8) e alimentação |
| **Relay não liga** | Testar com LED primeiro, verificar pino OUT |
| **Desconecta MQTT** | Aumentar `INTERVALO_PUBLICA` ou usar `client.setKeepAlive(60)` |

---

## 📈 MODIFICAÇÕES COMUNS

### 1. Usar DHT22 real (temperatura/umidade)

```cpp
#include <DHT.h>

#define DHT_PIN 9
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

// No setup():
dht.begin();

// Modificar leSensores():
dados.temperatura = dht.readTemperature();
dados.umidade = dht.readHumidity();
```

### 2. Mudar frequência de publicação

```cpp
// Linha 32
const unsigned long INTERVALO_PUBLICA = 10000; // 10 segundos
```

### 3. Adicionar lógica automática de irrigação

```cpp
// No fim do loop()
void autoIrrigacao() {
  struct SensorData dados = leSensores();
  
  if (dados.umidade < 50 && !irrigacaoAtiva) {
    ligarIrrigacao();
    Serial.println("⚠️  Umidade baixa - acionando");
  }
  
  if (dados.umidade > 80 && irrigacaoAtiva) {
    desligarIrrigacao();
    Serial.println("✅ Umidade OK - desligando");
  }
}

// Chamar no loop:
autoIrrigacao();
```

### 4. Enviar JSON no MQTT

```cpp
#include <ArduinoJson.h>

void publicaSensoresJSON() {
  struct SensorData dados = leSensores();
  
  StaticJsonDocument<200> doc;
  doc["umidade"] = dados.umidade;
  doc["temperatura"] = dados.temperatura;
  doc["luz"] = dados.luz;
  doc["timestamp"] = dados.timestamp;
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  client.publish("sensores/json", buffer);
}
```

---

## 📋 CHECKLIST DE SETUP

```
☐ Arduino IDE 2.0+ instalado
☐ Board Manager: ESP32 by Espressif instalado
☐ Bibliotecas: PubSubClient + ArduinoJson instaladas
☐ Placa selecionada: ESP32C3 Dev Module
☐ Porta serial detectada: COM X ou /dev/ttyUSB0
☐ WiFi SSID + senha configurados
☐ IP Mosquitto correto no código
☐ Upload bem-sucedido
☐ Serial Monitor 115200 baud
☐ Mensagens no Serial Monitor aparecendo
☐ Mosquitto na RPi rodando (status check)
☐ Teste MQTT com mosquitto_pub (ligar irrigação)
```

---

## 💡 PRÓXIMOS PASSOS

1. **Salvar dados**: Adicionar SD card ou EEPROM
2. **Dashboard**: Criar web interface com dados MQTT
3. **Alertas**: Email quando sensor sai do range
4. **Redundância**: Múltiplos sensores (humidity backup)
5. **Claude API**: Integrar análise inteligente

---

**Material pronto para:**
- Litoral SP (umidade alta, chuva)
- Ciclo rápido (5s de leitura)
- Controle automático de irrigação
- Integração com Claude Code + MQTT

**Dúvidas? Tente:**
- Serial Monitor (Tool → Serial Monitor)
- Logs MQTT: `mosquitto_sub -t '#'` na RPi
- Verificar pinos: LED no pino 8 pra testar
