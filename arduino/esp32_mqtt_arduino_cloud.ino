/*
  ESP32-C3 + Arduino IDE + EMQX CLOUD (Gratuito)
  
  ⚠️  ANTES DE USAR:
  1. Criar conta em https://www.emqx.cloud
  2. Novo deployment (free plan)
  3. Criar username: iotbr, password: sua_senha
  4. Copiar Broker Address: seu-id.emqx.cloud
  
  Mudanças vs EMQX local:
  - MQTT_BROKER = "seu-id.emqx.cloud" (nuvem)
  - Rest é idêntico!
*/

#include <WiFi.h>
#include <PubSubClient.h>

// ==================== CONFIG ====================
// WiFi
const char* SSID = "seu_wifi";
const char* PASSWORD = "sua_senha";

// EMQX CLOUD (gratuito)
// Copiar seu Broker ID de https://www.emqx.cloud/console
const char* MQTT_BROKER = "seu-id.emqx.cloud";  // ← MUDAR AQUI
const int MQTT_PORT = 1883;                      // 1883 (normal) ou 8883 (SSL)

// Credenciais criadas no EMQX Cloud
const char* MQTT_CLIENT_ID = "esp32_microverdes_01";
const char* MQTT_USER = "iotbr";                 // ← Criar no dashboard
const char* MQTT_PASSWORD = "senha_muito_forte"; // ← Criar no dashboard

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
  Serial.println("║  🌱 ESP32-C3 + EMQX CLOUD (Gratuito) ║");
  Serial.println("║  Microverdes + Automação               ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  Serial.println("📡 Broker: " + String(MQTT_BROKER));
  Serial.println("👤 Usuário: " + String(MQTT_USER));
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
      
      // Inscrever em tópicos
      client.subscribe("irrigacao/ligar");
      client.subscribe("irrigacao/desligar");
      
      Serial.println("📡 Inscrito em: irrigacao/ligar, irrigacao/desligar\n");
      return;
    } else {
      Serial.print("❌ Falha. Código: ");
      Serial.print(client.state());
      Serial.print(" (tentativa ");
      Serial.print(tentativas + 1);
      Serial.println("/5)");
      
      // Códigos de erro:
      // 4 = BAD_CREDENTIALS (usuário/senha errados)
      // -2 = CONNECT_FAILED (host não encontrado)
      // -3 = CONNECTION_LOST (conexão caiu)
      // -4 = TIMEOUT (timeout)
      
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
  
  if (topico == "irrigacao/ligar") {
    ligarIrrigacao();
  }
  else if (topico == "irrigacao/desligar") {
    desligarIrrigacao();
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

// ==================== PUBLICAR ====================
void publicaSensores() {
  if (!client.connected()) {
    return;
  }
  
  struct SensorData sensores = leSensores();
  char buffer[10];
  
  // Umidade
  sprintf(buffer, "%d", sensores.umidade);
  client.publish("sensores/umidade", buffer);
  
  // Temperatura
  dtostrf(sensores.temperatura, 5, 1, buffer);
  client.publish("sensores/temperatura", buffer);
  
  // Luz
  sprintf(buffer, "%d", sensores.luz);
  client.publish("sensores/luz", buffer);
  
  // Log
  Serial.print("📤 Sensores: U=");
  Serial.print(sensores.umidade);
  Serial.print("% T=");
  Serial.print(sensores.temperatura, 1);
  Serial.print("°C L=");
  Serial.print(sensores.luz);
  Serial.println("%");
}

// ==================== IRRIGAÇÃO ====================
void ligarIrrigacao() {
  if (!irrigacaoAtiva) {
    digitalWrite(PIN_RELAY_IRR, HIGH);
    digitalWrite(PIN_LED_STATUS, HIGH);
    irrigacaoAtiva = true;
    Serial.println("💧 ➡️  IRRIGAÇÃO LIGADA");
    
    if (client.connected()) {
      client.publish("irrigacao/status", "on");
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
      client.publish("irrigacao/status", "off");
    }
  }
}

// ==================== FUNÇÕES AUXILIARES ====================

void publicaFloat(const char* topico, float valor) {
  char buffer[10];
  dtostrf(valor, 5, 2, buffer);
  client.publish(topico, buffer);
}

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
  ☐ Upload no ESP32
  ☐ Abrir Serial Monitor (115200 baud)
  ☐ Verificar "EMQX Cloud conectado!"
  ☐ Checar dashboard em https://www.emqx.cloud
  
  ✅ Se vir "EMQX Cloud conectado!" está funcionando!
*/
