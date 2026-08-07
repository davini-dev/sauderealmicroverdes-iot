// ═══════════════════════════════════════════════════════════════
//  sauderealmicroverdes.club — LilyGo T-Display S3
//  Firmware completo com provisionamento + monitoramento
//
//  FLUXO DE BOOT:
//    1. Le NVS -> se configurado -> tela de monitoramento
//    2. Se nao configurado -> scan WiFi -> seleciona rede
//       -> digita senha -> conecta WiFi -> tela broker
//       -> usuario preenche URL broker (ip:port) + nome device
//       -> salva na NVS -> conecta MQTT -> monitoramento
//
//  BTN0 (GPIO0)  = navega / segura 3s para resetar
//  BTN1 (GPIO14) = confirma / seleciona
//
//  BIBLIOTECAS:
//    TFT_eSPI     (Bodmer)
//    PubSubClient (Nick O'Leary)
//    ArduinoJson  (Benoit Blanchon)
//    DHT sensor   (Adafruit)
//    Preferences  (built-in ESP32)
//
//  BOARD: ESP32S3 Dev Module
//  Flash: 16MB / PSRAM: OPI / USB CDC On Boot: Enabled
// ═══════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <TFT_eSPI.h>
#include <SPI.h>
#include <Preferences.h>
#include <DHT.h>
#include <time.h>

// ── Forward declarations (evita 'not declared in this scope') ─
struct SensorSim { float valor, minVal, maxVal, delta, tend; };
struct Bandeja    { const char* id; const char* nome; float u; float d; };
struct Pub        { char t[48]; char v[16]; char h[10]; };

void mqttCallback(char* topic, byte* payload, unsigned int length);
bool atualizarDht22();

// ── MQTT Credentials ──────────────────────────────────────────
const char* MQTT_USER = "Qs2LcyJNQLuGSTHpMSrw";
const char* MQTT_PASS = "";

// ── Botoes fisicos ────────────────────────────────────────────
#define BTN0  0
#define BTN1  14

// ── NVS ───────────────────────────────────────────────────────
#define NVS_NS      "srconfig"
#define NVS_BROKER  "broker"
#define NVS_DEVNAME "devname"
#define NVS_WIFISSID "wifissid"
#define NVS_WIFIPASS "wifipass"
#define NVS_DONE    "done"

// ── Display ───────────────────────────────────────────────────
TFT_eSPI tft = TFT_eSPI();
#define TFT_W   320
#define TFT_H   170

// ── DHT22 ─────────────────────────────────────────────────────
#define DHT_PIN  13
#define DHT_TYPE  DHT22
DHT dht(DHT_PIN, DHT_TYPE);
float dhtTempAtual = 27.0;
float dhtUmidAtual  = 75.0;
bool  dhtTemLeitura = false;
unsigned long lastDhtRead = 0;

// Paleta RGB565
#define C_BG       0x0841
#define C_HEADER   0x0526
#define C_GREEN    0x07E0
#define C_DKGREEN  0x03E0
#define C_AMBER    0xFD20
#define C_RED      0xF800
#define C_WHITE    0xFFFF
#define C_GRAY     0x8410
#define C_LGRAY    0xC618
#define C_DIVIDER  0x4208
#define C_ROW_ODD  0x10A2
#define C_ROW_EVEN 0x0841
#define C_ACTIVE   0x0454
#define C_INACTIVE 0x1082
#define C_KEY_BG   0x2104
#define C_KEY_ACT  0x03A0
#define C_SEL_BG   0x0200

// ── Estado global ─────────────────────────────────────────────
Preferences      prefs;
WiFiClient       wifiClientPlain;
WiFiClientSecure wifiClientSecure;
WiFiClient       tcpProbeClient;
PubSubClient     mqttClient(wifiClientPlain);

char cfgBroker[64]  = "";
char cfgDevName[20] = "";
char cfgWifiSsid[32] = "";
char cfgWifiPass[64] = "";
char mqttHost[48]   = "";
int  mqttPort       = 1883;
bool mqttTls        = false;
bool mqttConectado  = false;
bool wifiConectado  = false;
bool erroWifiPendente = false;
bool erroMqttPendente = false;
bool horarioConfigurado = false;
unsigned long lastWifiRetry = 0;
unsigned long lastMqttRetry = 0;
unsigned long startMs = 0;
int  modo = 0;

#define WIFI_TIMEOUT_MS     20000
#define MQTT_TIMEOUT_MS     45000
#define WIFI_RETRY_MS       15000
#define MQTT_RETRY_MS       10000
#define MQTT_MAX_TENTATIVAS 8
#define MQTT_SOCKET_TIMEOUT 20
#define TCP_SOCKET_TIMEOUT  20
#define TZ_SAO_PAULO "BRT3"

const char* NTP_SERVERS[] = {
  "pool.ntp.org",
  "time.google.com",
  "time.nist.gov",
};

// ── Provisioning states ───────────────────────────────────────
#define PROV_WIFI_SELECT 0
#define PROV_WIFI_PASS   1
#define PROV_BROKER      2
int provState = PROV_WIFI_SELECT;

// ── WiFi scan ─────────────────────────────────────────────────
#define MAX_NETWORKS 30
String wifiList[MAX_NETWORKS];
int32_t wifiRssi[MAX_NETWORKS];
uint8_t wifiEnc[MAX_NETWORKS];
int wifiCount = 0;
int wifiSelectedIndex = 0;
int wifiScrollOffset = 0;
int wifiScanAttempts = 0;
#define MAX_SCAN_ATTEMPTS 3

// ── Topicos MQTT ──────────────────────────────────────────────
#define TB_TELEMETRY "v1/devices/me/telemetry"
#define T_DEVICE     "microverdes/device/info"
#define T_NEBLINA   "microverdes/status/neblina"
#define T_IRR       "microverdes/cmd/irrigacao"
#define T_BANDEJA   "microverdes/bandeja/"

// ── Intervalos ────────────────────────────────────────────────
const unsigned long IV_SENSORES = 10000;
const unsigned long IV_BANDEJAS = 15000;
const unsigned long IV_DEVICE   = 30000;
const unsigned long IV_DISPLAY  = 1000;

// ── Instancias das structs ────────────────────────────────────
SensorSim simTemp = {27.0, 22.0, 32.0,   0.3,  0.05};
SensorSim simAr   = {75.0, 55.0, 92.0,   0.8,  0.10};
SensorSim simSolo = {68.0, 30.0, 95.0,   1.2, -0.15};
SensorSim simLuz  = {800.0,50.0, 3500.0,60.0,  2.0 };

Bandeja bandejas[] = {
  {"A1","Girassol A1", 72.0, 1.0},
  {"B2","Rabanete B2", 65.0, 1.2},
  {"C1","Ervilha C1",  55.0, 1.4},
  {"D3","Brocolis D3", 69.0, 0.9},
  {"E1","Mostarda E1", 48.0, 1.1},
};

Pub ultimas[3];
int pubCount = 0;

bool irrigacaoOn = false;
bool neblinaOn   = false;

// ── Numpad compartilhado ──────────────────────────────────────
const char NP_DIGITS[10] = {'1','2','3','4','5','6','7','8','9','0'};
const char NP_ACTIONS[5] = {'D','C','.', ':', 'O'};
const char* NP_LABELS[5] = {"DEL","CLR",".",":","OK"};

// Para password WiFi: usamos um conjunto diferente de acoes
const char NP_ACTIONS_PASS[5] = {'D','C','@','!','O'};
const char* NP_LABELS_PASS[5] = {"DEL","CLR","@","!","OK"};
const char NP_CHARS_PASS[14]  = {'@','!','#','$','%','&','*','-','_','+','=','?','/','~'};
int npCharPassIdx = 0; // indice no NP_CHARS_PASS para tecla extra

int npLinha    = 0;
int npCol      = 0;
int campoAtivo = 0;

char editBroker[64] = "";
char editDev[20]    = "";
char editWifiPass[64] = "";

#define PORTA_PAD ":1883"

// ── Timers / debounce ─────────────────────────────────────────
unsigned long lastSensores = 0;
unsigned long lastBandejas = 0;
unsigned long lastDevice   = 0;
unsigned long lastDisplay  = 0;
unsigned long lastBtn0     = 0;
unsigned long lastBtn1     = 0;
const int DEBOUNCE = 200;

// ═══════════════════════════════════════════════════════════════
//  SIMULACAO
// ═══════════════════════════════════════════════════════════════

float simPasso(SensorSim &s) {
  float r = ((float)random(-100,100) / 100.0) * s.delta;
  s.tend += ((float)random(-10,10) / 1000.0);
  s.tend  = constrain(s.tend, -0.5, 0.5);
  s.valor = constrain(s.valor + r + s.tend, s.minVal, s.maxVal);
  return s.valor;
}

float simBandeja(Bandeja &b) {
  b.u += ((float)random(-50,50) / 100.0) * b.d - 0.3;
  if (irrigacaoOn) b.u += 2.5;
  b.u = constrain(b.u, 20.0, 98.0);
  return b.u;
}

// ═══════════════════════════════════════════════════════════════
//  PUBLICACOES MQTT
// ═══════════════════════════════════════════════════════════════

void regPub(const char* t, const char* v) {
  ultimas[0] = ultimas[1];
  ultimas[1] = ultimas[2];
  snprintf(ultimas[2].t, sizeof(ultimas[2].t), "%s", t);
  snprintf(ultimas[2].v, sizeof(ultimas[2].v), "%s", v);
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 50)) {
    strftime(ultimas[2].h, sizeof(ultimas[2].h), "%H:%M:%S", &timeinfo);
  } else {
    snprintf(ultimas[2].h, sizeof(ultimas[2].h), "--:--:--");
  }
  if (pubCount < 3) pubCount++;
}

void configurarHorarioSaoPaulo() {
  if (horarioConfigurado) return;
  setenv("TZ", TZ_SAO_PAULO, 1);
  tzset();
  configTime(0, 0, NTP_SERVERS[0], NTP_SERVERS[1], NTP_SERVERS[2]);
  horarioConfigurado = true;
}

void pubTb(const char* resumo, const char* payload) {
  mqttClient.publish(TB_TELEMETRY, payload, false);
  regPub("thingsboard/telemetry", resumo);
}

void pub(const char* t, const char* v, bool r = true) {
  mqttClient.publish(t, v, r);
  regPub(t, v);
}

void publicarSensores() {
  float temp = dhtTempAtual;
  float ar   = dhtUmidAtual;
  float lux  = simPasso(simLuz);
  float solo = simPasso(simSolo);

  if (atualizarDht22()) {
    temp = dhtTempAtual;
    ar   = dhtUmidAtual;
  } else if (!dhtTemLeitura) {
    // Se o DHT22 ainda nao respondeu, mantemos a telemetria viva com fallback.
    temp = simPasso(simTemp);
    ar   = simPasso(simAr);
  }

  StaticJsonDocument<192> doc;
  doc["temperatura"]  = temp;
  doc["umidade_ar"]   = ar;
  doc["luminosidade"]  = lux;
  doc["umidade_solo"] = solo;
  doc["irrigacao"]    = irrigacaoOn ? "ON" : "OFF";
  doc["neblina"]      = neblinaOn ? "ON" : "OFF";
  char payload[192];
  char resumo[96];
  snprintf(resumo, sizeof(resumo), "T=%.1f U=%.1f L=%.0f S=%.1f",
           temp, ar, lux, solo);
  serializeJson(doc, payload);
  pubTb(resumo, payload);
}

void publicarBandejas() {
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
  unsigned long ms = millis()-startMs;
  unsigned long s  = ms/1000, m = s/60, h = m/60;
  s%=60; m%=60; h%=24;
  char up[20];
  snprintf(up, sizeof(up), "%02luh%02lum%02lus", h, m, s);
  doc["uptime"]    = up;
  doc["heap_free"] = ESP.getFreeHeap();
  doc["modo"]      = "simulacao";
  char payload[256];
  char resumo[80];
  snprintf(resumo, sizeof(resumo), "%s %s", cfgDevName, WiFi.localIP().toString().c_str());
  serializeJson(doc, payload);
  pub(T_DEVICE, payload);
}

bool atualizarDht22() {
  const unsigned long DHT_READ_MS = 2500;
  if (millis() - lastDhtRead < DHT_READ_MS) return dhtTemLeitura;
  lastDhtRead = millis();

  float temp = dht.readTemperature();
  float umid = dht.readHumidity();
  if (isnan(temp) || isnan(umid)) {
    Serial.println("[DHT22] leitura falhou");
    return false;
  }

  dhtTempAtual = temp;
  dhtUmidAtual  = umid;
  dhtTemLeitura = true;
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  NUMPAD (compartilhado: broker e wifi password)
// ═══════════════════════════════════════════════════════════════

void desenharNpTecla(int linha, int col, bool ativa, bool isPasswordMode) {
  int KY0 = 108, KY1 = 130, KH = 20;
  uint16_t bg = ativa ? C_KEY_ACT : C_KEY_BG;

  if (linha == 0) {
    int kw = 28, gap = 3;
    int kx = 4 + col*(kw+gap);
    tft.fillRoundRect(kx, KY0, kw, KH, 3, bg);
    tft.drawRoundRect(kx, KY0, kw, KH, 3, ativa ? C_GREEN : C_DIVIDER);
    tft.setTextColor(ativa ? C_WHITE : C_LGRAY, bg);
    tft.setTextDatum(MC_DATUM);
    tft.setTextSize(1);
    char lbl[2] = {NP_DIGITS[col], 0};
    tft.drawString(lbl, kx+kw/2, KY0+KH/2);
  } else {
    int widths[5] = {38, 38, 28, 28, 38};
    int kx = 4;
    for (int i = 0; i < col; i++) kx += widths[i]+3;
    int kw = widths[col];
    tft.fillRoundRect(kx, KY1, kw, KH, 3, bg);
    tft.drawRoundRect(kx, KY1, kw, KH, 3, ativa ? C_GREEN : C_DIVIDER);
    tft.setTextColor(ativa ? C_WHITE : C_LGRAY, bg);
    tft.setTextDatum(MC_DATUM);
    tft.setTextSize(1);

    if (isPasswordMode && col < 5) {
      // Mostra caractere especial rotativo na tecla @ apenas
      if (col == 2) {
        // Cicla pelos caracteres especiais a cada pressionada
        char lbl2[4];
        snprintf(lbl2, sizeof(lbl2), "%c~>", NP_CHARS_PASS[npCharPassIdx % 14]);
        tft.drawString(lbl2, kx+kw/2, KY1+KH/2);
      } else {
        tft.drawString(NP_LABELS_PASS[col], kx+kw/2, KY1+KH/2);
      }
    } else {
      tft.drawString(NP_LABELS[col], kx+kw/2, KY1+KH/2);
    }
  }
}

void desenharNumpad(bool isPasswordMode = false) {
  for (int c = 0; c < 10; c++) desenharNpTecla(0, c, (npLinha==0 && npCol==c), isPasswordMode);
  for (int c = 0; c < 5;  c++) desenharNpTecla(1, c, (npLinha==1 && npCol==c), isPasswordMode);
}

void moverCursor() {
  if (npLinha == 0) {
    npCol++;
    if (npCol >= 10) { npCol = 0; npLinha = 1; }
  } else {
    npCol++;
    if (npCol >= 5) { npCol = 0; npLinha = 0; }
  }
}

bool pressionarTeclaBroker() {
  char* campo  = (campoAtivo == 0) ? editBroker : editDev;
  int   maxLen = (campoAtivo == 0) ? 63 : 19;
  int   len    = strlen(campo);

  if (npLinha == 0) {
    if (len < maxLen) { campo[len] = NP_DIGITS[npCol]; campo[len+1] = '\0'; }
    return false;
  }

  char a = NP_ACTIONS[npCol];
  if (a == 'D') { if (len > 0) campo[len-1] = '\0'; return false; }
  if (a == 'C') { campo[0] = '\0'; return false; }
  if (a == '.' || a == ':') {
    if (len < maxLen) { campo[len] = a; campo[len+1] = '\0'; }
    return false;
  }
  if (a == 'O') {
    if (campoAtivo == 0) {
      if (!strchr(editBroker, ':'))
        strncat(editBroker, PORTA_PAD, sizeof(editBroker)-strlen(editBroker)-1);
      campoAtivo = 1; npLinha = 0; npCol = 0;
    } else {
      return true;
    }
  }
  return false;
}

bool pressionarTeclaWifiPass() {
  int   maxLen = 63;
  int   len    = strlen(editWifiPass);

  if (npLinha == 0) {
    // Digitos
    if (len < maxLen) { editWifiPass[len] = NP_DIGITS[npCol]; editWifiPass[len+1] = '\0'; }
    return false;
  }

  // Linha 1: acoes especificas para password
  char a = NP_ACTIONS_PASS[npCol];
  if (a == 'D') { if (len > 0) editWifiPass[len-1] = '\0'; return false; }
  if (a == 'C') { editWifiPass[0] = '\0'; return false; }
  if (a == '@') {
    // Caractere especial: cicla pelos caracteres especiais
    if (len < maxLen) {
      editWifiPass[len] = NP_CHARS_PASS[npCharPassIdx % 14];
      editWifiPass[len+1] = '\0';
      npCharPassIdx++;
    }
    return false;
  }
  if (a == '!') {
    // Outro caractere especial fixo (ponto de exclamacao)
    if (len < maxLen) { editWifiPass[len] = '!'; editWifiPass[len+1] = '\0'; }
    return false;
  }
  if (a == 'O') {
    // OK - confirmar senha
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  TELAS DE PROVISIONAMENTO
// ═══════════════════════════════════════════════════════════════

void desenharTelaScanWiFi() {
  tft.fillScreen(C_BG);

  // Header
  tft.fillRect(0, 0, TFT_W, 22, C_HEADER);
  tft.setTextColor(C_GREEN, C_HEADER);
  tft.setTextDatum(ML_DATUM);
  tft.setTextSize(1);
  tft.drawString("sauderealmicroverdes.club", 6, 11);
  tft.setTextColor(C_AMBER, C_HEADER);
  tft.setTextDatum(MR_DATUM);
  tft.drawString("REDES WiFi", TFT_W-6, 11);

  if (wifiCount == 0) {
    tft.setTextColor(C_GRAY, C_BG);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("Escaneando redes...", TFT_W/2, TFT_H/2 - 10);
    tft.drawString("Aperte BTN1 para escanear", TFT_W/2, TFT_H/2 + 10);
    return;
  }

  // Lista de redes
  int y = 28;
  int lh = 17;
  int maxVisible = 7;
  
  // Ajusta scroll
  if (wifiSelectedIndex < wifiScrollOffset) wifiScrollOffset = wifiSelectedIndex;
  if (wifiSelectedIndex >= wifiScrollOffset + maxVisible) wifiScrollOffset = wifiSelectedIndex - maxVisible + 1;
  if (wifiScrollOffset < 0) wifiScrollOffset = 0;
  if (wifiScrollOffset > wifiCount - maxVisible) wifiScrollOffset = max(0, wifiCount - maxVisible);

  for (int i = wifiScrollOffset; i < wifiCount && i < wifiScrollOffset + maxVisible; i++) {
    bool selected = (i == wifiSelectedIndex);
    uint16_t bg = selected ? C_SEL_BG : C_BG;
    tft.fillRect(0, y, TFT_W, lh, bg);

    // Indicador de selecao
    if (selected) {
      tft.setTextColor(C_GREEN, bg);
      tft.setTextDatum(ML_DATUM);
      tft.drawString(">", 2, y + lh/2);
    }

    // Icone de criptografia
    bool open = (wifiEnc[i] == 0);
    if (open) {
      tft.setTextColor(C_GREEN, bg);
      tft.drawString("[O]", 14, y + lh/2);
    } else {
      tft.setTextColor(C_AMBER, bg);
      tft.drawString("[#]", 14, y + lh/2);
    }

    // Nome da rede (truncado)
    tft.setTextColor(selected ? C_WHITE : C_LGRAY, bg);
    tft.setTextDatum(ML_DATUM);
    String ssid = wifiList[i];
    if (ssid.length() > 22) ssid = ssid.substring(0, 22) + "..";
    tft.drawString(ssid, 36, y + lh/2);

    // RSSI
    tft.setTextColor(C_GRAY, bg);
    tft.setTextDatum(MR_DATUM);
    char rssiStr[8];
    snprintf(rssiStr, sizeof(rssiStr), "%d dBm", wifiRssi[i]);
    tft.drawString(rssiStr, TFT_W - 4, y + lh/2);

    y += lh;
  }

  // Rodape
  tft.setTextColor(C_GRAY, C_BG);
  tft.setTextDatum(ML_DATUM);
  char footer[40];
  snprintf(footer, sizeof(footer), "%d redes | BTN0=nav BTN1=sel", wifiCount);
  tft.drawString(footer, 4, TFT_H - 12);
}

void desenharTelaWifiPass() {
  tft.fillScreen(C_BG);

  // Header
  tft.fillRect(0, 0, TFT_W, 22, C_HEADER);
  tft.setTextColor(C_GREEN, C_HEADER);
  tft.setTextDatum(ML_DATUM);
  tft.setTextSize(1);
  tft.drawString("sauderealmicroverdes.club", 6, 11);
  tft.setTextColor(C_AMBER, C_HEADER);
  tft.setTextDatum(MR_DATUM);
  tft.drawString("SENHA WiFi", TFT_W-6, 11);

  // Nome da rede selecionada
  int y = 27;
  tft.setTextColor(C_DKGREEN, C_BG);
  tft.setTextDatum(ML_DATUM);
  tft.drawString("Rede:", 6, y);
  tft.setTextColor(C_WHITE, C_BG);
  String ssid = wifiSelectedIndex < wifiCount ? wifiList[wifiSelectedIndex] : "?";
  if (ssid.length() > 28) ssid = ssid.substring(0, 28) + "..";
  tft.drawString(ssid, 48, y);
  y += 13;

  // Campo de senha
  tft.setTextColor(C_GREEN, C_BG);
  tft.drawString("Senha:", 6, y);
  y += 11;

  uint16_t bgPass = C_ACTIVE;
  tft.fillRoundRect(4, y, 230, 18, 3, bgPass);
  tft.drawRoundRect(4, y, 230, 18, 3, C_GREEN);

  tft.setTextColor(C_WHITE, bgPass);
  tft.setTextDatum(ML_DATUM);

  // Mostra asteriscos para a senha
  char masked[66];
  int passLen = strlen(editWifiPass);
  for (int i = 0; i < passLen && i < 30; i++) masked[i] = '*';
  masked[passLen] = '\0';
  char display[34];
  snprintf(display, sizeof(display), "%s%s", masked, passLen < 30 ? "_" : "");
  tft.drawString(display, 8, y + 9);

  y += 24;

  // Instrucoes
  tft.setTextColor(C_GRAY, C_BG);
  tft.setTextDatum(ML_DATUM);
  tft.drawString("BTN0=nav  BTN1=tecla", 6, y);
  y += 12;
  tft.drawString("Tecla @ cicla caracteres especiais", 6, y);

  desenharNumpad(true);
}

void desenharTelaProvisionamento() {
  tft.fillScreen(C_BG);

  tft.fillRect(0, 0, TFT_W, 22, C_HEADER);
  tft.setTextColor(C_GREEN, C_HEADER);
  tft.setTextDatum(ML_DATUM);
  tft.setTextSize(1);
  tft.drawString("sauderealmicroverdes.club", 6, 11);
  tft.setTextColor(C_AMBER, C_HEADER);
  tft.setTextDatum(MR_DATUM);
  tft.drawString("CONFIG BROKER", TFT_W-6, 11);

  int y = 27;

  // Info WiFi
  tft.setTextColor(C_DKGREEN, C_BG);
  tft.setTextDatum(ML_DATUM);
  tft.drawString("WiFi:", 6, y);
  tft.setTextColor(C_WHITE, C_BG);
  String ssid = wifiSelectedIndex < wifiCount ? wifiList[wifiSelectedIndex] : cfgWifiSsid;
  tft.drawString(ssid.substring(0, 24), 48, y);
  y += 13;

  // Auth info
  tft.setTextColor(C_DKGREEN, C_BG);
  tft.drawString("Token:", 6, y);
  tft.setTextColor(C_GREEN, C_BG);
  tft.drawString("QBlEQkAvzAALcjiCiyxI", 62, y);
  y += 14;

  // campo broker
  tft.setTextDatum(ML_DATUM);
  tft.setTextColor(campoAtivo==0 ? C_GREEN : C_GRAY, C_BG);
  tft.drawString("Broker MQTT  (ip:porta):", 6, y);
  y += 11;

  uint16_t bgBk = (campoAtivo == 0) ? C_ACTIVE : C_INACTIVE;
  tft.fillRoundRect(4, y, 230, 18, 3, bgBk);
  tft.drawRoundRect(4, y, 230, 18, 3, campoAtivo==0 ? C_GREEN : C_DIVIDER);

  tft.setTextColor(C_WHITE, bgBk);
  tft.setTextDatum(ML_DATUM);
  char db[66];
  snprintf(db, sizeof(db), "%s%s", editBroker, campoAtivo==0 ? "_" : "");
  tft.drawString(db, 8, y+9);
  y += 24;

  // campo devname
  tft.setTextColor(campoAtivo==1 ? C_GREEN : C_GRAY, C_BG);
  tft.setTextDatum(ML_DATUM);
  tft.drawString("Nome dispositivo:", 6, y);
  y += 11;
  uint16_t bgDv = (campoAtivo == 1) ? C_ACTIVE : C_INACTIVE;
  tft.fillRoundRect(4, y, 150, 18, 3, bgDv);
  tft.drawRoundRect(4, y, 150, 18, 3, campoAtivo==1 ? C_GREEN : C_DIVIDER);
  tft.setTextColor(C_WHITE, bgDv);
  tft.setTextDatum(ML_DATUM);
  char dd[22];
  snprintf(dd, sizeof(dd), "%s%s", editDev, campoAtivo==1 ? "_" : "");
  tft.drawString(dd, 8, y+9);

  tft.setTextColor(C_GRAY, C_BG);
  tft.setTextDatum(MR_DATUM);
  tft.drawString("BTN0=nav  BTN1=ok", TFT_W-4, y+9);

  desenharNumpad(false);
}

void desenharMonitor() {
  tft.fillScreen(C_BG);

  // header
  tft.fillRect(0, 0, TFT_W, 24, C_HEADER);
  tft.setTextColor(C_GREEN, C_HEADER);
  tft.setTextDatum(ML_DATUM);
  tft.setTextSize(1);
  tft.drawString("sauderealmicroverdes.club", 6, 12);

  // linhas de info
  int y = 32;
  int lh = 17;

  unsigned long ms = millis()-startMs;
  unsigned long s  = ms/1000, m = s/60, h = m/60;
  s%=60; m%=60; h%=24;
  char up[20];
  snprintf(up, sizeof(up), "%02luh %02lum %02lus", h, m, s);

  tft.setTextColor(C_GRAY,  C_BG); tft.setTextDatum(ML_DATUM); tft.drawString("Uptime   :", 6, y);
  tft.setTextColor(C_AMBER, C_BG); tft.drawString(up, 84, y);
  y += lh;

  tft.setTextColor(C_GRAY,  C_BG); tft.drawString("IP local :", 6, y);
  tft.setTextColor(C_WHITE, C_BG); tft.drawString(wifiConectado ? WiFi.localIP().toString().c_str() : "...", 84, y);
  y += lh;

  tft.setTextColor(C_GRAY,    C_BG); tft.drawString("Device   :", 6, y);
  tft.setTextColor(C_DKGREEN, C_BG); tft.drawString(cfgDevName, 84, y);
  y += lh;

  // divisoria
  y += 2;
  tft.drawFastHLine(0, y, TFT_W, C_DIVIDER);
  y += 5;
  tft.setTextColor(C_GRAY, C_BG);
  tft.drawString("Ultimas publicacoes:", 6, y);
  y += 11;

  // header tabela
  tft.fillRect(0, y, TFT_W, 11, C_DIVIDER);
  tft.setTextColor(C_LGRAY, C_DIVIDER);
  tft.setTextDatum(ML_DATUM); tft.drawString("Topico", 6, y+5);
  tft.setTextDatum(MR_DATUM);
  tft.drawString("Valor", 236, y+5);
  tft.drawString("Hora", TFT_W-4, y+5);
  y += 11;

  // linhas da tabela
  int vis = min(pubCount, 3);
  int ini = 3 - vis;
  for (int i = 0; i < 3; i++) {
    uint16_t cRow = (i % 2 == 0) ? C_ROW_EVEN : C_ROW_ODD;
    tft.fillRect(0, y, TFT_W, 14, cRow);
    if (i < vis) {
      int idx = ini + i;
      String top = String(ultimas[idx].t);
      top.replace("microverdes/", "");
      tft.setTextColor(C_WHITE, cRow); tft.setTextDatum(ML_DATUM);
      tft.drawString(top.substring(0, 18), 6, y+7);
      tft.setTextColor(C_GREEN, cRow); tft.setTextDatum(MR_DATUM);
      tft.drawString(ultimas[idx].v, 236, y+7);
      tft.setTextColor(C_GRAY,  cRow);
      tft.drawString(ultimas[idx].h, TFT_W-4, y+7);
    } else {
      tft.setTextColor(C_DIVIDER, cRow); tft.setTextDatum(ML_DATUM);
      tft.drawString("---", 6, y+7);
    }
    y += 14;
  }
}

// ═══════════════════════════════════════════════════════════════
//  NVS + HELPERS
// ═══════════════════════════════════════════════════════════════

bool carregarConfig() {
  prefs.begin(NVS_NS, true);
  bool ok = prefs.getBool(NVS_DONE, false);
  if (ok) {
    prefs.getString(NVS_BROKER,   cfgBroker,  sizeof(cfgBroker));
    prefs.getString(NVS_DEVNAME,  cfgDevName, sizeof(cfgDevName));
    prefs.getString(NVS_WIFISSID, cfgWifiSsid, sizeof(cfgWifiSsid));
    prefs.getString(NVS_WIFIPASS, cfgWifiPass, sizeof(cfgWifiPass));
    normalizarBroker(cfgBroker);
  }
  prefs.end();
  return ok;
}

void salvarConfig() {
  prefs.begin(NVS_NS, false);
  prefs.putString(NVS_BROKER,   cfgBroker);
  prefs.putString(NVS_DEVNAME,  cfgDevName);
  prefs.putString(NVS_WIFISSID, cfgWifiSsid);
  prefs.putString(NVS_WIFIPASS, cfgWifiPass);
  prefs.putBool(NVS_DONE, true);
  prefs.end();
}

void limparConfig() {
  prefs.begin(NVS_NS, false);
  prefs.clear();
  prefs.end();
}

void gerarNome(char* buf, int maxLen) {
  uint32_t r = esp_random() & 0xFFFF;
  snprintf(buf, maxLen, "SR-2026-%04X", r);
}

void normalizarBroker(char* s) {
  if (!s) return;
  int start = 0;
  while (s[start] == ' ' || s[start] == '\t') start++;
  if (start > 0) memmove(s, s + start, strlen(s + start) + 1);
  int len = strlen(s);
  while (len > 0 && (s[len - 1] == ' ' || s[len - 1] == '\t')) s[--len] = '\0';
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

bool brokerUsaTls(int port) {
  return (port == 8883 || port == 8884);
}

void prepararSocketMqtt() {
  mqttClient.disconnect();
  wifiClientPlain.stop();
  wifiClientSecure.stop();
  if (mqttTls) {
    wifiClientSecure.setInsecure();
    wifiClientSecure.setTimeout(TCP_SOCKET_TIMEOUT);
  } else {
    wifiClientPlain.setTimeout(TCP_SOCKET_TIMEOUT);
  }
}

bool configurarMqttClient() {
  normalizarBroker(cfgBroker);
  if (!parseBroker(cfgBroker, mqttHost, sizeof(mqttHost), &mqttPort)) {
    Serial.println("[MQTT] broker invalido");
    return false;
  }
  mqttTls = brokerUsaTls(mqttPort);
  prepararSocketMqtt();
  if (mqttTls) {
    mqttClient.setClient(wifiClientSecure);
    Serial.printf("[MQTT] TLS %s:%d\n", mqttHost, mqttPort);
  } else {
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

bool testarTcpBroker() {
  tcpProbeClient.stop();
  tcpProbeClient.setTimeout(TCP_SOCKET_TIMEOUT);
  Serial.printf("[TCP] testando %s:%d\n", mqttHost, mqttPort);
  unsigned long t0 = millis();
  bool ok = tcpProbeClient.connect(mqttHost, mqttPort);
  unsigned long ms = millis() - t0;
  Serial.printf("[TCP] %s em %lu ms\n", ok ? "OK" : "FALHA", ms);
  tcpProbeClient.stop();
  return ok;
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

bool tentarConectarMqttOnce() {
  if (!configurarMqttClient()) return false;
  if (strlen(cfgDevName) == 0) gerarNome(cfgDevName, sizeof(cfgDevName));
  cfgDevName[sizeof(cfgDevName) - 1] = '\0';

  Serial.printf("[MQTT] client_id=%s user=%s pass=%s\n",
                cfgDevName,
                MQTT_USER ? MQTT_USER : "null",
                MQTT_PASS ? "****" : "null");

  if (MQTT_USER && MQTT_USER[0] != '\0')
    return mqttClient.connect(cfgDevName, MQTT_USER, MQTT_PASS);
  return mqttClient.connect(cfgDevName);
}

const char* nomeStatusWifi() {
  switch (WiFi.status()) {
    case WL_IDLE_STATUS:     return "idle";
    case WL_NO_SSID_AVAIL:     return "rede nao encontrada";
    case WL_CONNECT_FAILED:    return "senha incorreta";
    case WL_CONNECTION_LOST:   return "conexao perdida";
    case WL_DISCONNECTED:      return "desconectado";
    default:                   return "falha desconhecida";
  }
}

bool conectarWifi() {
  tft.fillScreen(C_BG);
  tft.setTextColor(C_AMBER, C_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(1);
  tft.drawString("Conectando WiFi...", TFT_W/2, TFT_H/2-16);
  tft.drawString(cfgWifiSsid, TFT_W/2, TFT_H/2);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(100);
  WiFi.setSleep(false);
  WiFi.begin(cfgWifiSsid, cfgWifiPass);

  Serial.printf("[WiFi] conectando a %s\n", cfgWifiSsid);

  unsigned long inicio = millis();
  int dots = 0;
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < WIFI_TIMEOUT_MS) {
    delay(500);
    dots = (dots + 1) % 4;
    char msg[24];
    snprintf(msg, sizeof(msg), "aguarde%s", dots == 0 ? "" : dots == 1 ? "." : dots == 2 ? ".." : "...");
    tft.fillRect(0, TFT_H/2 + 12, TFT_W, 12, C_BG);
    tft.setTextColor(C_GRAY, C_BG);
    tft.drawString(msg, TFT_W/2, TFT_H/2 + 18);
  }

  wifiConectado = (WiFi.status() == WL_CONNECTED);
  if (wifiConectado) {
    Serial.printf("[WiFi] OK %s RSSI %d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    configurarHorarioSaoPaulo();
    tft.fillScreen(C_BG);
    tft.setTextColor(C_GREEN, C_BG);
    tft.drawString("WiFi conectado!", TFT_W/2, TFT_H/2 - 10);
    tft.setTextColor(C_WHITE, C_BG);
    tft.drawString(WiFi.localIP().toString().c_str(), TFT_W/2, TFT_H/2 + 8);
    delay(800);
    return true;
  }

  Serial.printf("[WiFi] FALHA status=%d (%s)\n", WiFi.status(), nomeStatusWifi());
  tft.fillScreen(C_BG);
  tft.setTextColor(C_RED, C_BG);
  tft.drawString("Erro ao conectar WiFi", TFT_W/2, TFT_H/2 - 30);
  tft.setTextColor(C_AMBER, C_BG);
  tft.drawString(cfgWifiSsid, TFT_W/2, TFT_H/2 - 14);
  tft.setTextColor(C_GRAY, C_BG);
  tft.drawString(nomeStatusWifi(), TFT_W/2, TFT_H/2 + 2);
  tft.drawString("BTN1 = tentar novamente", TFT_W/2, TFT_H/2 + 16);
  return false;
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  if (String(topic) == T_IRR)     irrigacaoOn = (msg == "ON");
  if (String(topic) == T_NEBLINA) neblinaOn   = (msg == "ON");
}

void mostrarErroTcp() {
  tft.fillScreen(C_BG);
  tft.setTextColor(C_RED, C_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(1);
  tft.drawString("TCP falhou no broker", TFT_W/2, TFT_H/2 - 30);
  tft.setTextColor(C_AMBER, C_BG);
  tft.drawString(cfgBroker, TFT_W/2, TFT_H/2 - 14);
  tft.setTextColor(C_GRAY, C_BG);
  tft.drawString("Rede pode bloquear porta 1883", TFT_W/2, TFT_H/2 + 2);
  tft.drawString("Teste outro WiFi/hotspot", TFT_W/2, TFT_H/2 + 16);
  if (modo == 0) tft.drawString("BTN1 = tentar novamente", TFT_W/2, TFT_H/2 + 30);
}

void mostrarErroMqtt(int state) {
  tft.fillScreen(C_BG);
  tft.setTextColor(C_RED, C_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(1);
  tft.drawString("Erro ao conectar MQTT", TFT_W/2, TFT_H/2 - 34);
  tft.setTextColor(C_AMBER, C_BG);
  tft.drawString(cfgBroker, TFT_W/2, TFT_H/2 - 18);
  tft.setTextColor(C_GRAY, C_BG);
  char det[48];
  snprintf(det, sizeof(det), "%s (%d)", nomeStatusMqtt(state), state);
  tft.drawString(det, TFT_W/2, TFT_H/2 - 2);
  tft.drawString(mqttTls ? "porta TLS (8883)" : "porta TCP (1883)", TFT_W/2, TFT_H/2 + 12);
  if (state == -2)
    tft.drawString("WiFi OK, mas TCP bloqueado", TFT_W/2, TFT_H/2 + 26);
  else
    tft.drawString("Verifique IP, porta e broker", TFT_W/2, TFT_H/2 + 26);
  if (modo == 0) tft.drawString("BTN1 = tentar novamente", TFT_W/2, TFT_H/2 + 40);
}

bool conectarMqtt() {
  if (!wifiConectado || WiFi.status() != WL_CONNECTED) return false;

  delay(800);

  tft.fillScreen(C_BG);
  tft.setTextColor(C_AMBER, C_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(1);
  tft.drawString("Conectando ao broker...", TFT_W/2, TFT_H/2 - 24);
  tft.drawString(cfgBroker, TFT_W/2, TFT_H/2 - 8);

  if (!configurarMqttClient()) return false;

  tft.setTextColor(C_GRAY, C_BG);
  tft.drawString("Testando TCP...", TFT_W/2, TFT_H/2 + 10);
  if (!testarTcpBroker()) {
    mostrarErroTcp();
    return false;
  }

  unsigned long inicio = millis();
  int tentativa = 0;
  int ultimoErro = -4;

  while (!mqttClient.connected() && millis() - inicio < MQTT_TIMEOUT_MS && tentativa < MQTT_MAX_TENTATIVAS) {
    tentativa++;
    Serial.printf("[MQTT] tentativa %d em %s:%d (%s)\n",
                  tentativa, mqttHost, mqttPort, mqttTls ? "TLS" : "TCP");

    char msg[28];
    snprintf(msg, sizeof(msg), "MQTT %d/%d", tentativa, MQTT_MAX_TENTATIVAS);
    tft.fillRect(0, TFT_H/2 + 18, TFT_W, 12, C_BG);
    tft.setTextColor(C_GRAY, C_BG);
    tft.drawString(msg, TFT_W/2, TFT_H/2 + 24);

    if (tentarConectarMqttOnce()) {
      mqttConectado = true;
      mqttClient.subscribe(T_IRR);
      mqttClient.subscribe(T_NEBLINA);
      Serial.println("[MQTT] conectado");
      tft.fillScreen(C_BG);
      tft.setTextColor(C_GREEN, C_BG);
      tft.drawString("MQTT conectado!", TFT_W/2, TFT_H/2);
      delay(600);
      return true;
    }

    ultimoErro = mqttClient.state();
    Serial.printf("[MQTT] falhou state=%d (%s)\n", ultimoErro, nomeStatusMqtt(ultimoErro));
    delay(2000);
  }

  mqttConectado = false;
  mostrarErroMqtt(ultimoErro);
  return false;
}

bool iniciarConexoes(bool salvarErroProvisionamento) {
  if (!configurarMqttClient()) {
    tft.fillScreen(C_BG);
    tft.setTextColor(C_RED, C_BG);
    tft.setTextDatum(MC_DATUM);
    tft.setTextSize(1);
    tft.drawString("Broker invalido", TFT_W/2, TFT_H/2 - 10);
    tft.setTextColor(C_GRAY, C_BG);
    tft.drawString("Use ip:porta (ex: 192.168.1.10:1883)", TFT_W/2, TFT_H/2 + 8);
    if (salvarErroProvisionamento) erroMqttPendente = true;
    return false;
  }

  if (!conectarWifi()) {
    if (salvarErroProvisionamento) erroWifiPendente = true;
    return false;
  }

  if (!conectarMqtt()) {
    if (salvarErroProvisionamento) erroMqttPendente = true;
    return false;
  }

  erroWifiPendente = false;
  erroMqttPendente = false;
  startMs = millis();
  publicarDevice();
  publicarSensores();
  publicarBandejas();
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  WIFI SCAN
// ═══════════════════════════════════════════════════════════════

void escanearRedes() {
  tft.fillScreen(C_BG);
  tft.fillRect(0, 0, TFT_W, 22, C_HEADER);
  tft.setTextColor(C_GREEN, C_HEADER);
  tft.setTextDatum(ML_DATUM);
  tft.setTextSize(1);
  tft.drawString("sauderealmicroverdes.club", 6, 11);
  tft.setTextColor(C_AMBER, C_HEADER);
  tft.setTextDatum(MR_DATUM);
  tft.drawString("ESCANEANDO...", TFT_W-6, 11);

  tft.setTextColor(C_GRAY, C_BG);
  tft.setTextDatum(MC_DATUM);
  tft.drawString("Buscando redes WiFi...", TFT_W/2, TFT_H/2 - 10);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(200);

  wifiCount = 0;
  
  int n = WiFi.scanNetworks();
  Serial.printf("[WiFi] scan: %d redes encontradas\n", n);

  if (n <= 0) {
    tft.setTextColor(C_RED, C_BG);
    tft.drawString("Nenhuma rede encontrada!", TFT_W/2, TFT_H/2 + 10);
    tft.setTextColor(C_GRAY, C_BG);
    tft.drawString("BTN1 = tentar novamente", TFT_W/2, TFT_H/2 + 26);
    return;
  }

  // Ordena por RSSI (melhor sinal primeiro)
  int indices[n];
  for (int i = 0; i < n; i++) indices[i] = i;
  
  // Simple bubble sort by RSSI
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (WiFi.RSSI(indices[j]) < WiFi.RSSI(indices[j+1])) {
        int temp = indices[j];
        indices[j] = indices[j+1];
        indices[j+1] = temp;
      }
    }
  }

  for (int i = 0; i < n && i < MAX_NETWORKS; i++) {
    int idx = indices[i];
    String ssid = WiFi.SSID(idx);
    if (ssid.length() > 0) { // Ignora redes ocultas
      wifiList[wifiCount] = ssid;
      wifiRssi[wifiCount] = WiFi.RSSI(idx);
      wifiEnc[wifiCount] = WiFi.encryptionType(idx);
      wifiCount++;
    }
  }

  WiFi.scanDelete();
  
  Serial.printf("[WiFi] %d redes listadas (ocultas ignoradas)\n", wifiCount);

  wifiSelectedIndex = 0;
  wifiScrollOffset = 0;
}

// ═══════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(300);
  randomSeed(esp_random());

  pinMode(BTN0, INPUT_PULLUP);
  pinMode(BTN1, INPUT_PULLUP);
  dht.begin();

  tft.init();
  tft.setRotation(1);
  tft.fillScreen(C_BG);

  // splash
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(1);
  tft.setTextColor(C_GREEN,   C_BG); tft.drawString("sauderealmicroverdes.club", TFT_W/2, TFT_H/2-22);
  tft.setTextColor(C_GRAY,    C_BG); tft.drawString("LilyGo T-Display S3",       TFT_W/2, TFT_H/2-6);
  tft.setTextColor(C_AMBER,   C_BG); tft.drawString("iniciando...",               TFT_W/2, TFT_H/2+10);
  tft.setTextColor(C_DIVIDER, C_BG); tft.drawString("segure BTN0 p/ resetar",    TFT_W/2, TFT_H/2+26);
  delay(2000);

  // reset forcado: BTN0 no boot
  if (digitalRead(BTN0) == LOW) {
    limparConfig();
    tft.fillScreen(C_BG);
    tft.setTextColor(C_RED, C_BG);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("Configuracao apagada!", TFT_W/2, TFT_H/2);
    tft.drawString("Reinicie o dispositivo.", TFT_W/2, TFT_H/2+14);
    while (true) delay(1000);
  }

  bool configurado = carregarConfig();

  if (configurado) {
    modo = 1;
    if (iniciarConexoes(false)) {
      desenharMonitor();
    } else {
      lastWifiRetry = millis();
      lastMqttRetry = millis();
      desenharMonitor();
    }
  } else {
    modo = 0;
    provState = PROV_WIFI_SELECT;
    editBroker[0] = '\0';
    editWifiPass[0] = '\0';
    editDev[0] = '\0';
    gerarNome(editDev, sizeof(editDev));
    npLinha = 0; npCol = 0; campoAtivo = 0; npCharPassIdx = 0;

    // Escaneia as redes ja no setup
    escanearRedes();
    desenharTelaScanWiFi();
  }
}

// ═══════════════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════════════

void loop() {

  if (modo == 0) {
    bool b0 = (digitalRead(BTN0) == LOW && millis()-lastBtn0 > DEBOUNCE);
    bool b1 = (digitalRead(BTN1) == LOW && millis()-lastBtn1 > DEBOUNCE);

    // ── WiFi Scan State ───────────────────────────────────────
    if (provState == PROV_WIFI_SELECT) {
      if (b0) {
        lastBtn0 = millis();
        if (wifiCount > 0) {
          wifiSelectedIndex++;
          if (wifiSelectedIndex >= wifiCount) wifiSelectedIndex = 0;
          desenharTelaScanWiFi();
        }
      }

      if (b1) {
        lastBtn1 = millis();
        if (wifiCount == 0) {
          // Tenta escanear novamente
          escanearRedes();
          desenharTelaScanWiFi();
        } else {
          // Selecionou uma rede
          strncpy(cfgWifiSsid, wifiList[wifiSelectedIndex].c_str(), sizeof(cfgWifiSsid)-1);
          cfgWifiSsid[sizeof(cfgWifiSsid)-1] = '\0';

          // Se rede aberta (sem senha), vai direto para broker
          if (wifiEnc[wifiSelectedIndex] == 0) {
            editWifiPass[0] = '\0';
            provState = PROV_BROKER;
            npLinha = 0; npCol = 0; campoAtivo = 0;
            desenharTelaProvisionamento();
          } else {
            // Rede com senha: vai para tela de digitar senha
            editWifiPass[0] = '\0';
            npLinha = 0; npCol = 0; npCharPassIdx = 0;
            provState = PROV_WIFI_PASS;
            desenharTelaWifiPass();
          }
        }
      }
      return;
    }

    // ── WiFi Password State ───────────────────────────────────
    if (provState == PROV_WIFI_PASS) {
      if (b0) {
        lastBtn0 = millis();
        moverCursor();
        desenharTelaWifiPass();
      }

      if (b1) {
        lastBtn1 = millis();
        bool pronto = pressionarTeclaWifiPass();
        desenharTelaWifiPass();

        if (pronto) {
          if (strlen(editWifiPass) == 0) {
            // Se apertou OK sem senha, volta pra selecao
            provState = PROV_WIFI_SELECT;
            desenharTelaScanWiFi();
          } else {
            strncpy(cfgWifiPass, editWifiPass, sizeof(cfgWifiPass)-1);
            cfgWifiPass[sizeof(cfgWifiPass)-1] = '\0';

            // Tenta conectar ao WiFi
            if (conectarWifi()) {
              // WiFi conectou! Vai para configuracao do broker
              provState = PROV_BROKER;
              npLinha = 0; npCol = 0; campoAtivo = 0;
              desenharTelaProvisionamento();
            } else {
              // Falhou - volta pra tela de senha
              erroWifiPendente = true;
              // Aguarda no loop pra tentar de novo
            }
          }
        }
      }

      // Se wifi falhou e BTN1 foi pressionado para tentar novamente
      if (erroWifiPendente && b1 && millis()-lastBtn1 > DEBOUNCE) {
        lastBtn1 = millis();
        if (conectarWifi()) {
          erroWifiPendente = false;
          provState = PROV_BROKER;
          npLinha = 0; npCol = 0; campoAtivo = 0;
          desenharTelaProvisionamento();
        } else {
          // Volta pra tela de senha
          desenharTelaWifiPass();
        }
      }
      return;
    }

    // ── Broker Config State ───────────────────────────────────
    if (provState == PROV_BROKER) {
      if (b0) {
        lastBtn0 = millis();
        moverCursor();
        desenharTelaProvisionamento();
      }

      if (b1) {
        lastBtn1 = millis();

        if (erroWifiPendente || erroMqttPendente) {
          if (iniciarConexoes(true)) {
            modo = 1;
            desenharMonitor();
          }
          return;
        }

        bool pronto = pressionarTeclaBroker();
        desenharTelaProvisionamento();

        if (pronto && strlen(editBroker) > 4) {
          strncpy(cfgBroker,  editBroker, sizeof(cfgBroker)-1);
          cfgBroker[sizeof(cfgBroker)-1] = '\0';
          normalizarBroker(cfgBroker);
          strncpy(cfgDevName, editDev, sizeof(cfgDevName)-1);
          cfgDevName[sizeof(cfgDevName)-1] = '\0';
          salvarConfig();
          if (iniciarConexoes(true)) {
            modo = 1;
            desenharMonitor();
          }
        }
      }
      return;
    }
    return;
  }

  // ── modo monitoramento ──────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    wifiConectado = false;
    mqttConectado = false;
    if (millis() - lastWifiRetry >= WIFI_RETRY_MS) {
      lastWifiRetry = millis();
      conectarWifi();
      if (wifiConectado) lastMqttRetry = 0;
    }
  } else {
    wifiConectado = true;
    if (!mqttClient.connected()) {
      mqttConectado = false;
      if (millis() - lastMqttRetry >= MQTT_RETRY_MS) {
        lastMqttRetry = millis();
        if (!configurarMqttClient()) {
          Serial.println("[MQTT] broker invalido no monitor");
        } else {
          conectarMqtt();
        }
      }
    } else {
      mqttConectado = true;
    }
  }

  if (mqttClient.connected()) mqttClient.loop();

  unsigned long agora = millis();
  if (agora-lastSensores >= IV_SENSORES) { lastSensores = agora; publicarSensores(); }
  if (agora-lastBandejas >= IV_BANDEJAS) { lastBandejas = agora; publicarBandejas(); }
  if (agora-lastDevice   >= IV_DEVICE)   { lastDevice   = agora; publicarDevice();   }
  if (agora-lastDisplay  >= IV_DISPLAY)  { lastDisplay  = agora; desenharMonitor();  }

  // BTN0 segurado 3s - apaga config e reinicia
  if (digitalRead(BTN0) == LOW) {
    if (millis()-lastBtn0 > 3000) { limparConfig(); ESP.restart(); }
  } else {
    lastBtn0 = millis();
  }
}
