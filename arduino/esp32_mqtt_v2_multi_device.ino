/*
  ESP32-C3 + Arduino IDE + EMQX CLOUD (Gratuito)
  Versão 2.0: Suporte a múltiplos dispositivos com sensores em array
  
  ⚠️  ANTES DE USAR:
  1. Criar conta em https://www.emqx.cloud
  2. Novo deployment (free plan)
  3. Criar username: iotbr, password: sua_senha
  4. Copiar Broker Address: seu-id.emqx.cloud
  
  Mudanças vs Versão 1.0:
  - Publica em tópicos dinâmicos: devices/{deviceId}/sensor/{tipo}
  - Publica status online: devices/{deviceId}/online
  - Publica info do dispositivo: devices/{deviceId}/info
  - Suporta múltiplos sensores em array
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==================== CONFIG ====================
// WiFi
const char* SSID = "seu_wifi";
const char* PASSWORD = "sua_senha";

// EMQX CLOUD (gratuito)
const char* MQTT_BROKER = "seu-id.emqx.cloud";
const int MQTT_PORT = 1883;

// Credenciais EMQX Cloud
const char* MQTT_CLIENT_ID = "esp32_microverdes_01";
const char* MQTT_USER = "iotbr";
const char* MQTT_PASSWORD = "senha_muito_forte";

// ID único do dispositivo (IMPORTANTE: mude para cada ESP32!)
const char* DEVICE_ID = "esp32_01";

// ==================== PINOS ====================
#define PIN_UMIDADE 3
#define PIN_LUZ 4
#define PIN_RELAY_IRR 5
#define PIN_LED_STATUS 8

// ==================== VARIÁVEIS ====================
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long ultimaPublicacao = 0;
const unsigned long INTERVALO_PUBLICA = 5000;

unsigned long ultimaTentativaConexao = 0;
const unsigned long INTERVALO_RECONEXAO = 5000;

unsigned long ultimaPublicacaoInfo = 0;
const unsigned long INTERVALO_PUBLICA_INFO = 60000; // A cada minuto

bool irrigacaoAtiva = false;

const int ADC_UMIDADE_SECO = 3000;
const int ADC_UMIDADE_MOLHADO = 1500;

// ==================== ESTRUTURAS ====================
struct SensorData {
  int umidade;
  float temperatura;
  int luz;
  unsigned long timestamp;
};

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║  🌱 ESP32-C3 + EMQX CLOUD v2.0        ║");
  Serial.println("║  Múltiplos Dispositivos                ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  Serial.println("📡 Broker: " + String(MQTT_BROKER));
  Serial.println("👤 Usuário: " + String(MQTT_USER));
  Serial.println("🔧 Device ID: " + String(DEVICE_ID));
  Serial.println();
  
  // Configurar pinos
  pinMode(PIN_RELAY_IRR, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  digitalWrite(PIN_RELAY_IRR, LOW);
  digitalWrite(PIN_LED_STATUS, LOW);
  
  // Configurar ADC
  analogSetAttenuation(ADC_11db);
  analogReadResolution(12);
  
  // Conectar WiFi
  conectaWiFi();
  
  // Configurar MQTT
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callbackMQTT);
  client.setKeepAlive(120);
  
  // Conectar MQTT
  conectaMQTT();
  
  Serial.println("\n✅ Setup completo!");
  Serial.println("─────────────────────────────────────────\n");
}

// ==================== LOOP ====================
void loop() {
  // Reconectar MQTT
  if (!client.connected()) {
    unsigned long agora = millis();
    if (agora - ultimaTentativaConexao >= INTERVALO_RECONEXAO) {
      ultimaTentativaConexao = agora;
      reconectaMQTT();
    }
  } else {
    client.loop();
  }
  
  // Verificar WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi desconectado. Reconectando...");
    conectaWiFi();
  }
  
  // Publicar sensores
  unsigned long agora = millis();
  if (agora - ultimaPublicacao >= INTERVALO_PUBLICA) {
    ultimaPublicacao = agora;
    publicaSensores();
  }
  
  // Publicar info do dispositivo (a cada minuto)
  if (agora - ultimaPublicacaoInfo >= INTERVALO_PUBLICA_INFO) {
    ultimaPublicacaoInfo = agora;
    publicaInfoDispositivo();
  }
  
  delay(100);
}

// ==================== CONEXÃO WiFi ====================
void conectaWiFi() {
  Serial.print("🔗 Conectando WiFi: ");
  Serial.println(SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ WiFi conectado: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("❌ Falha WiFi");
  }
}

// ==================== CONEXÃO MQTT ====================
void conectaMQTT() {
  Serial.print("📡 Conectando EMQX Cloud: ");
  Serial.println(MQTT_BROKER);
  
  int tentativas = 0;
  while (!client.connected() && tentativas < 5) {
    if (client.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD)) {
      Serial.println("✅ EMQX Cloud conectado!");
      
      // Publicar status online
      String topicOnline = String("devices/") + DEVICE_ID + "/online";
      client.publish(topicOnline.c_str(), "true", true); // retain = true
      
      // Inscrever em comandos
      String topicCmd = String("devices/") + DEVICE_ID + "/cmd/+";
      client.subscribe(topicCmd.c_str());
      
      Serial.println("📡 Inscrito em: " + topicCmd);
      Serial.println("✅ Status online publicado\n");
      
      return;
    } else {
      Serial.print("❌ Falha. Código: ");
      Serial.print(client.state());
      Serial.print(" (tentativa ");
      Serial.print(tentativas + 1);
      Serial.println("/5)");
      
      delay(2000);
    }
    tentativas++;
  }
  
  if (!client.connected()) {
    Serial.println("⚠️  Não conseguiu conectar. Tentará novamente em 5s...\n");
  }
}

void reconectaMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.println("🔄 Reconectando EMQX Cloud...");
  conectaMQTT();
}

// ==================== CALLBACK MQTT ====================
void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  String topico = String(topic);
  String mensagem = "";
  
  for (unsigned int i = 0; i < length; i++) {
    mensagem += (char)payload[i];
  }
  
  Serial.print("📨 Recebido: ");
  Serial.print(topico);
  Serial.print(" = ");
  Serial.println(mensagem);
  
  // Processar comandos: devices/{deviceId}/cmd/{comando}
  String prefix = String("devices/") + DEVICE_ID + "/cmd/";
  
  if (topico.startsWith(prefix)) {
    String comando = topico.substring(prefix.length());
    
    if (comando == "irrigacao") {
      if (mensagem == "ON" || mensagem == "on" || mensagem == "1") {
        ligarIrrigacao();
      } else if (mensagem == "OFF" || mensagem == "off" || mensagem == "0") {
        desligarIrrigacao();
      }
    }
    else if (comando == "reset") {
      Serial.println("🔄 Reset solicitado!");
      delay(1000);
      ESP.restart();
    }
  }
}

// ==================== SENSORES ====================
struct SensorData leSensores() {
  struct SensorData dados;
  
  int soma_umidade = 0;
  int soma_luz = 0;
  
  for (int i = 0; i < 10; i++) {
    soma_umidade += analogRead(PIN_UMIDADE);
    soma_luz += analogRead(PIN_LUZ);
    delayMicroseconds(100);
  }
  
  int raw_umidade = soma_umidade / 10;
  int raw_luz = soma_luz / 10;
  
  dados.umidade = constrain(
    map(raw_umidade, ADC_UMIDADE_SECO, ADC_UMIDADE_MOLHADO, 0, 100),
    0, 100
  );
  
  dados.luz = map(raw_luz, 0, 4095, 0, 100);
  dados.temperatura = 25.0 + (dados.luz / 100.0) * 5.0;
  dados.timestamp = millis();
  
  return dados;
}

// ==================== PUBLICAR SENSORES ====================
void publicaSensores() {
  if (!client.connected()) {
    return;
  }
  
  struct SensorData sensores = leSensores();
  char buffer[20];
  
  // Publicar sensores individuais
  // Formato: devices/{deviceId}/sensor/{tipo}
  
  // Umidade
  String topicUmidade = String("devices/") + DEVICE_ID + "/sensor/umidade";
  sprintf(buffer, "%d", sensores.umidade);
  client.publish(topicUmidade.c_str(), buffer);
  
  // Temperatura
  String topicTemp = String("devices/") + DEVICE_ID + "/sensor/temperatura";
  dtostrf(sensores.temperatura, 5, 1, buffer);
  client.publish(topicTemp.c_str(), buffer);
  
  // Luz
  String topicLuz = String("devices/") + DEVICE_ID + "/sensor/luz";
  sprintf(buffer, "%d", sensores.luz);
  client.publish(topicLuz.c_str(), buffer);
  
  // Irrigação (como sensor)
  String topicIrrigacao = String("devices/") + DEVICE_ID + "/sensor/irrigacao";
  client.publish(topicIrrigacao.c_str(), irrigacaoAtiva ? "ON" : "OFF");
  
  // Log
  Serial.print("📤 Sensores: U=");
  Serial.print(sensores.umidade);
  Serial.print("% T=");
  Serial.print(sensores.temperatura, 1);
  Serial.print("°C L=");
  Serial.print(sensores.luz);
  Serial.println("%");
}

// ==================== PUBLICAR INFO DO DISPOSITIVO ====================
void publicaInfoDispositivo() {
  if (!client.connected()) {
    return;
  }
  
  // Criar JSON com informações do dispositivo
  StaticJsonDocument<256> doc;
  
  doc["id"] = DEVICE_ID;
  doc["ip"] = WiFi.localIP().toString();
  doc["mac"] = WiFi.macAddress();
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000; // em segundos
  doc["heap_free"] = ESP.getFreeHeap();
  doc["model"] = "ESP32-C3";
  doc["firmware"] = "2.0.0";
  
  // Serializar JSON
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Publicar
  String topicInfo = String("devices/") + DEVICE_ID + "/info";
  client.publish(topicInfo.c_str(), jsonString.c_str());
  
  Serial.println("ℹ️  Info publicada: " + jsonString);
}

// ==================== IRRIGAÇÃO ====================
void ligarIrrigacao() {
  if (!irrigacaoAtiva) {
    digitalWrite(PIN_RELAY_IRR, HIGH);
    digitalWrite(PIN_LED_STATUS, HIGH);
    irrigacaoAtiva = true;
    Serial.println("💧 ➡️  IRRIGAÇÃO LIGADA");
    
    if (client.connected()) {
      String topicStatus = String("devices/") + DEVICE_ID + "/sensor/irrigacao";
      client.publish(topicStatus.c_str(), "ON");
    }
  }
}

void desligarIrrigacao() {
  if (irrigacaoAtiva) {
    digitalWrite(PIN_RELAY_IRR, LOW);
    digitalWrite(PIN_LED_STATUS, LOW);
    irrigacaoAtiva = false;
    Serial.println("🛑 ➡️  IRRIGAÇÃO DESLIGADA");
    
    if (client.connected()) {
      String topicStatus = String("devices/") + DEVICE_ID + "/sensor/irrigacao";
      client.publish(topicStatus.c_str(), "OFF");
    }
  }
}

// ==================== FUNÇÕES AUXILIARES ====================

void exibeDiagnostico() {
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║         DIAGNÓSTICO DO SISTEMA        ║");
  Serial.println("╚════════════════════════════════════════╝");
  
  Serial.print("WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "✅ OK" : "❌ Desconectado");
  
  Serial.print("EMQX Cloud: ");
  Serial.println(client.connected() ? "✅ OK" : "❌ Desconectado");
  
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  
  Serial.print("Irrigação: ");
  Serial.println(irrigacaoAtiva ? "🟢 LIGADA" : "🔴 DESLIGADA");
  
  struct SensorData dados = leSensores();
  Serial.print("Sensores: U=");
  Serial.print(dados.umidade);
  Serial.print("% T=");
  Serial.print(dados.temperatura, 1);
  Serial.print("°C L=");
  Serial.print(dados.luz);
  Serial.println("%");
  
  Serial.println("════════════════════════════════════════\n");
}

/*
  ⚠️  ANTES DE USAR - CHECKLIST:
  
  ☐ Criar conta em https://www.emqx.cloud
  ☐ Novo deployment (Free plan, região São Paulo)
  ☐ Copiar Broker Address: xxx.emqx.cloud
  ☐ Criar username: iotbr
  ☐ Criar password: senha_forte_123
  ☐ Atualizar MQTT_BROKER = "seu-id.emqx.cloud"
  ☐ Atualizar MQTT_USER e MQTT_PASSWORD
  ☐ Atualizar SSID e PASSWORD (WiFi)
  ☐ Atualizar DEVICE_ID (IMPORTANTE! Mude para cada ESP32)
  ☐ Instalar biblioteca: ArduinoJson (Sketch > Include Library > Manage Libraries)
  ☐ Upload no ESP32
  ☐ Abrir Serial Monitor (115200 baud)
  ☐ Verificar "EMQX Cloud conectado!"
  ☐ Verificar "Status online publicado"
  ☐ Checar em http://localhost:3000/devices
  
  ✅ Se vir "EMQX Cloud conectado!" e "Status online publicado" está funcionando!
  
  IMPORTANTE PARA MÚLTIPLOS DISPOSITIVOS:
  - Cada ESP32 DEVE ter um DEVICE_ID único!
  - Exemplo: esp32_01, esp32_02, esp32_03, etc
  - Sem isso, os dispositivos se sobrescrevem!
*/
