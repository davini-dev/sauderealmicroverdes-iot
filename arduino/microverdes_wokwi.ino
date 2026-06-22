// ═══════════════════════════════════════════════════════════════
//  sauderealmicroverdes.club — Wokwi ESP32 Compatível
//  Versão para debug via Serial Monitor (sem display, sem botões)
//
//  BIBLIOTECAS (instale no Wokwi/PlatformIO):
//    PubSubClient (Nick O'Leary)
//    ArduinoJson  (Benoit Blanchon)
//
//  Wokwi ESP32 simulation → veja output no Serial Monitor
// ═══════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── WiFi ──────────────────────────────────────────────────────
const char* WIFI_SSID = "Internet";
const char* WIFI_PASS = "12345678";

// MQTT
const char* MQTT_USER = nullptr;
const char* MQTT_PASS = nullptr;

// ── Simulação de sensores ─────────────────────────────────────
struct SensorSim { float valor, minVal, maxVal, delta, tend; };

SensorSim simTemp = {27.0, 22.0, 32.0,   0.3,  0.05};
SensorSim simAr   = {75.0, 55.0, 92.0,   0.8,  0.10};
SensorSim simSolo = {68.0, 30.0, 95.0,   1.2, -0.15};
SensorSim simLuz  = {800.0, 50.0, 3500.0, 60.0, 2.0 };

struct Bandeja { const char* id; const char* nome; float u; float d; };

Bandeja bandejas[] = {
  {"A1", "Girassol A1", 72.0, 1.0},
  {"B2", "Rabanete B2", 65.0, 1.2},
  {"C1", "Ervilha C1",  55.0, 1.4},
  {"D3", "Brocolis D3", 69.0, 0.9},
  {"E1", "Mostarda E1", 48.0, 1.1},
};

struct Pub { char t[48]; char v[16]; char h[10]; };
Pub ultimas[3];
int  pubCount = 0;

bool irrigacaoOn = false;
bool neblinaOn   = false;

// ── Estado MQTT ───────────────────────────────────────────────
WiFiClient       wifiClientPlain;
WiFiClientSecure wifiClientSecure;
WiFiClient       tcpProbeClient;
PubSubClient     mqttClient(wifiClientPlain);

char   cfgBroker[64]  = "49.13.124.109:1883";
char   cfgDevName[20] = "SR-WOKWI";
char   mqttHost[48]   = "";
int    mqttPort       = 1883;
bool   mqttTls        = false;
bool   mqttConectado  = false;
bool   wifiConectado  = false;
unsigned long startMs = 0;

#define WIFI_TIMEOUT_MS     20000
#define MQTT_TIMEOUT_MS     45000
#define MQTT_RETRY_MS       10000
#define MQTT_MAX_TENTATIVAS 8
#define MQTT_SOCKET_TIMEOUT 20
#define TCP_SOCKET_TIMEOUT  20

// ── Intervalos ────────────────────────────────────────────────
const unsigned long IV_SENSORES = 10000;
const unsigned long IV_BANDEJAS = 15000;
const unsigned long IV_DEVICE   = 30000;

// ── Tópicos MQTT ──────────────────────────────────────────────
#define T_TEMP          "microverdes/sensor/temp"
#define T_AR            "microverdes/sensor/ar"
#define T_LUZ           "microverdes/sensor/luz"
#define T_UMIDADE       "microverdes/sensor/umidade"
#define T_NEBLINA       "microverdes/status/neblina"
#define T_IRR           "microverdes/cmd/irrigacao"
#define T_DEVICE        "microverdes/device/info"
#define T_DEVICE_STATUS "microverdes/device/status"
#define T_BANDEJA       "microverdes/bandeja/"

// ── Timers ────────────────────────────────────────────────────
unsigned long lastSensores = 0;
unsigned long lastBandejas = 0;
unsigned long lastDevice   = 0;
unsigned long lastMqttRetry = 0;

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

void logSeparator() {
  Serial.println("─────────────────────────────────────");
}

void printStatus(const char* label, bool ok) {
  Serial.print("[");
  Serial.print(label);
  Serial.print("] ");
  Serial.println(ok ? "✅ OK" : "❌ FALHA");
}

// ═══════════════════════════════════════════════════════════════
//  SIMULAÇÃO DE SENSORES
// ═══════════════════════════════════════════════════════════════

float simPasso(SensorSim &s) {
  float r = ((float)random(-100, 100) / 100.0) * s.delta;
  s.tend += ((float)random(-10, 10) / 1000.0);
  s.tend  = constrain(s.tend, -0.5, 0.5);
  s.valor = constrain(s.valor + r + s.tend, s.minVal, s.maxVal);
  return s.valor;
}

float simBandeja(Bandeja &b) {
  b.u += ((float)random(-50, 50) / 100.0) * b.d - 0.3;
  if (irrigacaoOn) b.u += 2.5;
  b.u = constrain(b.u, 20.0, 98.0);
  return b.u;
}

// ═══════════════════════════════════════════════════════════════
//  PUBLICAÇÕES MQTT
// ═══════════════════════════════════════════════════════════════

void regPub(const char* t, const char* v) {
  ultimas[0] = ultimas[1];
  ultimas[1] = ultimas[2];
  unsigned long s = (millis() - startMs) / 1000, m = s / 60, h = m / 60;
  s %= 60; m %= 60; h %= 24;
  snprintf(ultimas[2].t, sizeof(ultimas[2].t), "%s", t);
  snprintf(ultimas[2].v, sizeof(ultimas[2].v), "%s", v);
  snprintf(ultimas[2].h, sizeof(ultimas[2].h), "%02lu:%02lu:%02lu", h, m, s);
  if (pubCount < 3) pubCount++;
}

void pub(const char* t, const char* v, bool r = true) {
  mqttClient.publish(t, v, r);
  regPub(t, v);
  Serial.printf("  📤 %s → %s (retain=%d)\n", t, v, r);
}

void publicarSensores() {
  Serial.println("\n🍃 === Publicando sensores ===");
  char buf[16];
  float temp = simPasso(simTemp);
  float ar   = simPasso(simAr);
  float lux  = simPasso(simLuz);
  float solo = simPasso(simSolo);
  dtostrf(temp, 5, 1, buf); pub(T_TEMP,    buf);
  dtostrf(ar,   5, 1, buf); pub(T_AR,      buf);
  dtostrf(lux,  6, 0, buf); pub(T_LUZ,     buf);
  dtostrf(solo, 5, 1, buf); pub(T_UMIDADE, buf);
  pub(T_IRR,     irrigacaoOn ? "ON" : "OFF");
  pub(T_NEBLINA, neblinaOn   ? "ON" : "OFF");
  Serial.printf("  📊 Temp=%.1f°C  Ar=%.1f%%  Luz=%.0f lux  Solo=%.1f%%\n",
                temp, ar, lux, solo);
}

void publicarBandejas() {
  Serial.println("\n🪴 === Publicando bandejas ===");
  StaticJsonDocument<128> doc;
  char topico[48], payload[128];
  for (int i = 0; i < 5; i++) {
    float u = simBandeja(bandejas[i]);
    doc.clear();
    doc["nome"]    = bandejas[i].nome;
    doc["umidade"] = (int)round(u);
    serializeJson(doc, payload);
    snprintf(topico, sizeof(topico), "%s%s", T_BANDEJA, bandejas[i].id);
    mqttClient.publish(topico, payload, true);
    Serial.printf("  📤 %s → %s\n", topico, payload);
  }
  char v[8];
  snprintf(v, sizeof(v), "%d%%", (int)round(bandejas[4].u));
  char t2[48];
  snprintf(t2, sizeof(t2), "%s%s", T_BANDEJA, bandejas[4].id);
  regPub(t2, v);
}

void publicarDevice() {
  StaticJsonDocument<256> doc;
  doc["id"]  = cfgDevName;
  doc["ip"]  = WiFi.localIP().toString();
  doc["mac"] = WiFi.macAddress();
  doc["rssi"]= WiFi.RSSI();
  unsigned long ms = millis() - startMs;
  unsigned long s  = ms / 1000, m = s / 60, h = m / 60;
  s %= 60; m %= 60; h %= 24;
  char up[20];
  snprintf(up, sizeof(up), "%02luh%02lum%02lus", h, m, s);
  doc["uptime"]    = up;
  doc["heap_free"] = ESP.getFreeHeap();
  doc["modo"]      = "simulacao";
  char payload[256];
  serializeJson(doc, payload);
  pub(T_DEVICE, payload);
}

// ═══════════════════════════════════════════════════════════════
//  MQTT CALLBACK
// ═══════════════════════════════════════════════════════════════

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  Serial.printf("\n📥 Mensagem recebida: %s → %s\n", topic, msg.c_str());

  if (String(topic) == T_IRR) {
    irrigacaoOn = (msg == "ON");
    Serial.printf("  💧 Irrigação: %s\n", irrigacaoOn ? "LIGADA" : "DESLIGADA");
  }
  if (String(topic) == T_NEBLINA) {
    neblinaOn = (msg == "ON");
    Serial.printf("  🌫️  Neblina: %s\n", neblinaOn ? "LIGADA" : "DESLIGADA");
  }
}

// ═══════════════════════════════════════════════════════════════
//  CONEXÃO WiFi
// ═══════════════════════════════════════════════════════════════

const char* nomeStatusWifi() {
  switch (WiFi.status()) {
    case WL_IDLE_STATUS:   return "idle";
    case WL_NO_SSID_AVAIL: return "rede nao encontrada";
    case WL_CONNECT_FAILED:return "senha incorreta";
    case WL_CONNECTION_LOST:return "conexao perdida";
    case WL_DISCONNECTED:  return "desconectado";
    default:               return "falha desconhecida";
  }
}

bool conectarWifi() {
  Serial.println("\n📡 Conectando WiFi...");
  Serial.printf("   SSID: %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(100);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  wifiConectado = (WiFi.status() == WL_CONNECTED);
  printStatus("WiFi", wifiConectado);

  if (wifiConectado) {
    Serial.printf("   IP:    %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   MAC:   %s\n", WiFi.macAddress().c_str());
    Serial.printf("   RSSI:  %d dBm\n", WiFi.RSSI());
  } else {
    Serial.printf("   Status: %d (%s)\n", WiFi.status(), nomeStatusWifi());
  }
  return wifiConectado;
}

// ═══════════════════════════════════════════════════════════════
//  CONEXÃO MQTT
// ═══════════════════════════════════════════════════════════════

bool brokerUsaTls(int port) {
  return (port == 8883 || port == 8884);
}

bool parseBroker(const char* url, char* host, int hmax, int* port) {
  if (!url || !host || !port || strlen(url) == 0) return false;
  char tmp[64];
  strncpy(tmp, url, sizeof(tmp) - 1);
  tmp[sizeof(tmp) - 1] = '\0';
  char* c = strrchr(tmp, ':');
  if (!c || c == tmp) return false;
  *c = '\0';
  strncpy(host, tmp, hmax - 1);
  host[hmax - 1] = '\0';
  *port = atoi(c + 1);
  return (*port > 0 && *port <= 65535 && strlen(host) > 0);
}

bool configurarMqttClient() {
  char brokerNorm[64];
  strncpy(brokerNorm, cfgBroker, sizeof(brokerNorm) - 1);
  brokerNorm[sizeof(brokerNorm) - 1] = '\0';

  // trim
  int start = 0;
  while (brokerNorm[start] == ' ' || brokerNorm[start] == '\t') start++;
  if (start > 0) memmove(brokerNorm, brokerNorm + start, strlen(brokerNorm + start) + 1);
  int len = strlen(brokerNorm);
  while (len > 0 && (brokerNorm[len - 1] == ' ' || brokerNorm[len - 1] == '\t'))
    brokerNorm[--len] = '\0';

  if (!parseBroker(brokerNorm, mqttHost, sizeof(mqttHost), &mqttPort)) {
    Serial.println("[MQTT] broker invalido");
    return false;
  }
  mqttTls = brokerUsaTls(mqttPort);

  mqttClient.disconnect();
  wifiClientPlain.stop();
  wifiClientSecure.stop();

  if (mqttTls) {
    wifiClientSecure.setInsecure();
    wifiClientSecure.setTimeout(TCP_SOCKET_TIMEOUT);
    mqttClient.setClient(wifiClientSecure);
    Serial.printf("[MQTT] TLS %s:%d\n", mqttHost, mqttPort);
  } else {
    wifiClientPlain.setTimeout(TCP_SOCKET_TIMEOUT);
    mqttClient.setClient(wifiClientPlain);
    Serial.printf("[MQTT] TCP %s:%d\n", mqttHost, mqttPort);
  }
  mqttClient.setServer(mqttHost, mqttPort);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);
  mqttClient.setSocketTimeout(MQTT_SOCKET_TIMEOUT);
  mqttClient.setKeepAlive(60);
  return true;
}

const char* nomeStatusMqtt(int state) {
  switch (state) {
    case -4: return "timeout MQTT";
    case -3: return "conexao perdida";
    case -2: return "TCP recusado/bloqueado";
    case -1: return "desconectado";
    case  1: return "protocolo invalido";
    case  2: return "client id invalido";
    case  3: return "broker indisponivel";
    case  4: return "usuario/senha errados";
    case  5: return "nao autorizado";
    default: return "erro desconhecido";
  }
}

bool testarTcpBroker() {
  tcpProbeClient.stop();
  tcpProbeClient.setTimeout(TCP_SOCKET_TIMEOUT);
  Serial.printf("[TCP] testando %s:%d ... ", mqttHost, mqttPort);
  unsigned long t0 = millis();
  bool ok = tcpProbeClient.connect(mqttHost, mqttPort);
  unsigned long ms = millis() - t0;
  Serial.println(ok ? "✅ OK" : "❌ FALHA");
  Serial.printf("   tempo: %lu ms\n", ms);
  tcpProbeClient.stop();
  return ok;
}

bool tentarConectarMqttOnce() {
  if (strlen(cfgDevName) == 0) {
    uint32_t r = esp_random() & 0xFFFF;
    snprintf(cfgDevName, sizeof(cfgDevName), "SR-2026-%04X", r);
  }

  char willPayload[80];
  snprintf(willPayload, sizeof(willPayload),
           "{\"id\":\"%s\",\"status\":\"offline\"}", cfgDevName);

  Serial.printf("[MQTT] client_id=%s\n", cfgDevName);
  Serial.printf("[MQTT] LWT → %s: %s\n", T_DEVICE_STATUS, willPayload);

  if (MQTT_USER && MQTT_USER[0] != '\0')
    return mqttClient.connect(cfgDevName, MQTT_USER, MQTT_PASS,
                              T_DEVICE_STATUS, 1, true, willPayload);
  return mqttClient.connect(cfgDevName,
                            T_DEVICE_STATUS, 1, true, willPayload);
}

bool conectarMqtt() {
  if (!wifiConectado || WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] WiFi não conectado!");
    return false;
  }

  Serial.println("\n🔌 Conectando ao broker MQTT...");
  Serial.printf("   Broker: %s\n", cfgBroker);

  if (!configurarMqttClient()) return false;

  Serial.println("   Testando TCP...");
  if (!testarTcpBroker()) {
    Serial.println("   ❌ TCP falhou — rede pode bloquear porta");
    return false;
  }

  unsigned long inicio = millis();
  int tentativa = 0;
  int ultimoErro = -4;

  while (!mqttClient.connected() &&
         millis() - inicio < MQTT_TIMEOUT_MS &&
         tentativa < MQTT_MAX_TENTATIVAS) {
    tentativa++;
    Serial.printf("   MQTT tentativa %d/%d ... ", tentativa, MQTT_MAX_TENTATIVAS);

    if (tentarConectarMqttOnce()) {
      mqttConectado = true;
      mqttClient.subscribe(T_IRR);
      mqttClient.subscribe(T_NEBLINA);
      Serial.println("✅ conectado!");

      printStatus("MQTT", true);
      Serial.printf("   Enviando: %s, %s\n", T_IRR, T_NEBLINA);

      delay(300);
      startMs = millis();
      return true;
    }

    ultimoErro = mqttClient.state();
    Serial.printf("❌ state=%d (%s)\n", ultimoErro, nomeStatusMqtt(ultimoErro));
    delay(2000);
  }

  mqttConectado = false;
  printStatus("MQTT", false);
  Serial.printf("   Erro: %s (state=%d)\n", nomeStatusMqtt(ultimoErro), ultimoErro);
  Serial.printf("   Porta: %s (%d)\n", mqttTls ? "TLS (8883)" : "TCP (1883)", mqttPort);
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  IMPRIMIR ÚLTIMAS PUBLICAÇÕES
// ═══════════════════════════════════════════════════════════════

void imprimirUltimasPubs() {
  logSeparator();
  Serial.println("📋 Últimas publicações:");
  int vis = min(pubCount, 3);
  int ini = 3 - vis;
  for (int i = 0; i < vis; i++) {
    int idx = ini + i;
    String top = String(ultimas[idx].t);
    top.replace("microverdes/", "");
    Serial.printf("   [%s] %s → %s\n", ultimas[idx].h, top.c_str(), ultimas[idx].v);
  }
  if (pubCount == 0) Serial.println("   (nenhuma ainda)");
  logSeparator();
}

// ═══════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(500);
  randomSeed(esp_random());

  Serial.println("\n");
  Serial.println("╔══════════════════════════════════════════╗");
  Serial.println("║  sauderealmicroverdes.club — Wokwi ESP32║");
  Serial.println("║  Simulador de Microverdes IoT           ║");
  Serial.println("╚══════════════════════════════════════════╝");
  Serial.println();

  Serial.println("📋 Configuração:");
  Serial.printf("   WiFi SSID: %s\n", WIFI_SSID);
  Serial.printf("   Broker:    %s\n", cfgBroker);
  Serial.printf("   Device:    %s\n", cfgDevName);
  Serial.println();

  // Conectar WiFi
  if (!conectarWifi()) {
    Serial.println("❌ Sem WiFi — não será possível conectar ao MQTT");
    return;
  }

  // Conectar MQTT
  conectarMqtt();
  logSeparator();
}

// ═══════════════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════════════

void loop() {
  // ── Reconexão WiFi ──
  if (WiFi.status() != WL_CONNECTED) {
    wifiConectado = false;
    mqttConectado = false;
    if (millis() - lastMqttRetry >= MQTT_RETRY_MS) {
      lastMqttRetry = millis();
      Serial.println("\n⚠️  WiFi perdido, reconectando...");
      if (conectarWifi()) {
        conectarMqtt();
      }
    }
    return;
  }

  wifiConectado = true;

  // ── Reconexão MQTT ──
  if (!mqttClient.connected()) {
    mqttConectado = false;
    if (millis() - lastMqttRetry >= MQTT_RETRY_MS) {
      lastMqttRetry = millis();
      Serial.println("\n⚠️  MQTT desconectado, tentando reconectar...");
      conectarMqtt();
    }
  } else {
    mqttConectado = true;
  }

  // ── Processa mensagens recebidas ──
  if (mqttClient.connected()) mqttClient.loop();

  // ── Publicações periódicas ──
  unsigned long agora = millis();
  if (mqttClient.connected()) {
    if (agora - lastSensores >= IV_SENSORES) {
      lastSensores = agora;
      publicarSensores();
      imprimirUltimasPubs();
    }
    if (agora - lastBandejas >= IV_BANDEJAS) {
      lastBandejas = agora;
      publicarBandejas();
      imprimirUltimasPubs();
    }
    if (agora - lastDevice >= IV_DEVICE) {
      lastDevice = agora;
      Serial.println("\n📱 === Device info ===");
      publicarDevice();
      imprimirUltimasPubs();
    }
  }
}
