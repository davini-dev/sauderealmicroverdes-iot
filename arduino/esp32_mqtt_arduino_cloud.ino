/*
  ESP32-C3 + Arduino IDE + EMQX CLOUD (Gratuito)
  Versão 2.0: Suporte EXCLUSIVO a múltiplos dispositivos com sensores em array
  
  ⚠️  ANTES DE USAR:
  1. Criar conta em https://www.emqx.cloud
  2. Novo deployment (free plan)
  3. Criar username: iotbr, password: sua_senha
  4. Copiar Broker Address: seu-id.emqx.cloud
  
  Padrão de Comunicação (v2.0):
  - Status Online: devices/{deviceId}/online
  - Sensores: devices/{deviceId}/sensor/{tipo}
  - Info: devices/{deviceId}/info
  - Comandos: devices/{deviceId}/cmd/{comando}
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
const unsigned long INTERVALO_PUBLICA_INFO = 60000;

bool irrigacaoAtiva = false;

const int ADC_UMIDADE_SECO = 3000;
const int ADC_UMIDADE_MOLHADO = 1500;

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║  🌱 ESP32-C3 + EMQX CLOUD v2.0        ║");
  Serial.println("║  Padrão Multi-Dispositivo Exclusivo    ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  Serial.println("📡 Broker: " + String(MQTT_BROKER));
  Serial.println("👤 Usuário: " + String(MQTT_USER));
  Serial.println("🔧 Device ID: " + String(DEVICE_ID));
  Serial.println();
  
  pinMode(PIN_RELAY_IRR, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  digitalWrite(PIN_RELAY_IRR, LOW);
  digitalWrite(PIN_LED_STATUS, LOW);
  
  analogSetAttenuation(ADC_11db);
  analogReadResolution(12);
  
  conectaWiFi();
  
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callbackMQTT);
  client.setKeepAlive(120);
  
  conectaMQTT();
  
  Serial.println("\n✅ Setup completo!");
  Serial.println("─────────────────────────────────────────\n");
}

// ==================== LOOP ====================
void loop() {
  if (!client.connected()) {
    unsigned long agora = millis();
    if (agora - ultimaTentativaConexao >= INTERVALO_RECONEXAO) {
      ultimaTentativaConexao = agora;
      reconectaMQTT();
    }
  } else {
    client.loop();
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    conectaWiFi();
  }
  
  unsigned long agora = millis();
  if (agora - ultimaPublicacao >= INTERVALO_PUBLICA) {
    ultimaPublicacao = agora;
    publicaSensores();
  }
  
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
  }
}

// ==================== CONEXÃO MQTT ====================
void conectaMQTT() {
  Serial.print("📡 Conectando EMQX Cloud: ");
  
  int tentativas = 0;
  while (!client.connected() && tentativas < 5) {
    // Configurar Last Will para marcar como offline automaticamente
    String topicOnline = String("devices/") + DEVICE_ID + "/online";
    if (client.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD, topicOnline.c_str(), 1, true, "false")) {
      Serial.println("✅ Conectado!");
      
      // Publicar status online
      client.publish(topicOnline.c_str(), "true", true);
      
      // Inscrever em comandos
      String topicCmd = String("devices/") + DEVICE_ID + "/cmd/+";
      client.subscribe(topicCmd.c_str());
      
      return;
    } else {
      Serial.print(".");
      delay(2000);
    }
    tentativas++;
  }
}

void reconectaMQTT() {
  if (WiFi.status() == WL_CONNECTED) {
    conectaMQTT();
  }
}

// ==================== CALLBACK MQTT ====================
void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  String topico = String(topic);
  String mensagem = "";
  for (unsigned int i = 0; i < length; i++) mensagem += (char)payload[i];
  
  String prefix = String("devices/") + DEVICE_ID + "/cmd/";
  if (topico.startsWith(prefix)) {
    String comando = topico.substring(prefix.length());
    
    if (comando == "irrigacao") {
      if (mensagem == "ON" || mensagem == "on" || mensagem == "1") ligarIrrigacao();
      else if (mensagem == "OFF" || mensagem == "off" || mensagem == "0") desligarIrrigacao();
    }
    else if (comando == "reset") {
      ESP.restart();
    }
  }
}

// ==================== SENSORES ====================
void publicaSensores() {
  if (!client.connected()) return;
  
  int raw_umidade = analogRead(PIN_UMIDADE);
  int raw_luz = analogRead(PIN_LUZ);
  
  int umidade = constrain(map(raw_umidade, ADC_UMIDADE_SECO, ADC_UMIDADE_MOLHADO, 0, 100), 0, 100);
  int luz = map(raw_luz, 0, 4095, 0, 100);
  float temperatura = 25.0 + (luz / 100.0) * 5.0;
  
  char buffer[20];
  String baseTopic = String("devices/") + DEVICE_ID + "/sensor/";
  
  sprintf(buffer, "%d", umidade);
  client.publish((baseTopic + "umidade").c_str(), buffer);
  
  dtostrf(temperatura, 5, 1, buffer);
  client.publish((baseTopic + "temperatura").c_str(), buffer);
  
  sprintf(buffer, "%d", luz);
  client.publish((baseTopic + "luz").c_str(), buffer);
  
  client.publish((baseTopic + "irrigacao").c_str(), irrigacaoAtiva ? "ON" : "OFF");
  
  Serial.printf("📤 U=%d%% T=%.1fC L=%d%%\n", umidade, temperatura, luz);
}

void publicaInfoDispositivo() {
  if (!client.connected()) return;
  
  StaticJsonDocument<256> doc;
  doc["id"] = DEVICE_ID;
  doc["ip"] = WiFi.localIP().toString();
  doc["mac"] = WiFi.macAddress();
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;
  doc["heap_free"] = ESP.getFreeHeap();
  
  String jsonString;
  serializeJson(doc, jsonString);
  client.publish((String("devices/") + DEVICE_ID + "/info").c_str(), jsonString.c_str());
}

// ==================== IRRIGAÇÃO ====================
void ligarIrrigacao() {
  digitalWrite(PIN_RELAY_IRR, HIGH);
  digitalWrite(PIN_LED_STATUS, HIGH);
  irrigacaoAtiva = true;
  if (client.connected()) {
    client.publish((String("devices/") + DEVICE_ID + "/sensor/irrigacao").c_str(), "ON");
  }
}

void desligarIrrigacao() {
  digitalWrite(PIN_RELAY_IRR, LOW);
  digitalWrite(PIN_LED_STATUS, LOW);
  irrigacaoAtiva = false;
  if (client.connected()) {
    client.publish((String("devices/") + DEVICE_ID + "/sensor/irrigacao").c_str(), "OFF");
  }
}
