// Mrunal Agro — ESP32 Pump/Motor Gateway
//
// - Connects to WiFi + MQTT (HiveMQ Cloud, TLS)
// - Subscribes to farm/{ORG_ID}/{API_KEY}/command  -> drives relays (motors/pumps)
// - Publishes  farm/{ORG_ID}/{API_KEY}/sensors     -> periodic sensor readings
// - Publishes  farm/{ORG_ID}/{API_KEY}/status      -> heartbeat + relay states (LWT = offline)
//
// Copy config.h.example -> config.h and fill in your WiFi/MQTT/device credentials.

#include <WiFi.h>
#include "config.h"
#if MQTT_USE_TLS
#include <WiFiClientSecure.h>
#else
#include <WiFiClient.h>
#endif
#include <PubSubClient.h>
#include <ArduinoJson.h>

#if MQTT_USE_TLS
WiFiClientSecure espClient;
#else
WiFiClient espClient;
#endif
PubSubClient mqtt(espClient);

bool relayState[RELAY_COUNT];                 // true = ON
unsigned long relayAutoOffAt[RELAY_COUNT];    // millis() target for auto-off, 0 = no timer

unsigned long lastSensorPublish = 0;
unsigned long lastStatusPublish = 0;

String topicCommand;
String topicSensors;
String topicStatus;

void setRelay(int index, bool on) {
  relayState[index] = on;
  bool pinLevel = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PINS[index], pinLevel ? HIGH : LOW);
}

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] Connected, IP: %s\n", WiFi.localIP().toString().c_str());
}

void publishStatus() {
  JsonDocument doc;
  doc["status"] = "online";
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["ip"] = WiFi.localIP().toString();

  JsonObject relays = doc["relay_states"].to<JsonObject>();
  for (int i = 0; i < RELAY_COUNT; i++) {
    relays[String(i + 1)] = relayState[i] ? "on" : "off";
  }

  String payload;
  serializeJson(doc, payload);
  mqtt.publish(topicStatus.c_str(), payload.c_str(), true); // retained
}

void publishSensors() {
  JsonDocument doc;
  for (int i = 0; i < SENSOR_COUNT; i++) {
    if (SENSORS[i].pin < 0) continue;
    int raw = analogRead(SENSORS[i].pin);
    doc[SENSORS[i].channel] = SENSORS[i].convert(raw);
  }

  String payload;
  serializeJson(doc, payload);
  mqtt.publish(topicSensors.c_str(), payload.c_str());
}

void onMqttMessage(char *topic, byte *payload, unsigned int length) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
    return;
  }

  const char *action = doc["action"] | "";
  int relayChannel = doc["relay_channel"] | 0; // 1-indexed, matches actuators.relay_channel
  long duration = doc["duration"] | 0;         // seconds, 0 = indefinite

  if (relayChannel < 1 || relayChannel > RELAY_COUNT) {
    Serial.printf("[MQTT] Invalid relay_channel: %d\n", relayChannel);
    return;
  }
  int idx = relayChannel - 1;

  if (strcmp(action, "turn_on") == 0) {
    setRelay(idx, true);
    relayAutoOffAt[idx] = duration > 0 ? millis() + (unsigned long)duration * 1000UL : 0;
    Serial.printf("[Relay %d] ON (duration=%lds)\n", relayChannel, duration);
  } else if (strcmp(action, "turn_off") == 0) {
    setRelay(idx, false);
    relayAutoOffAt[idx] = 0;
    Serial.printf("[Relay %d] OFF\n", relayChannel);
  } else {
    Serial.printf("[MQTT] Unknown action: %s\n", action);
    return;
  }

  publishStatus(); // report new relay state immediately so the dashboard updates
}

void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("[MQTT] Connecting...");
    String clientId = String("esp32-") + API_KEY;
    String willPayload = "{\"status\":\"offline\"}";

    bool ok = mqtt.connect(
      clientId.c_str(),
      MQTT_USERNAME, MQTT_PASSWORD,
      topicStatus.c_str(), 1, true, willPayload.c_str()
    );

    if (ok) {
      Serial.println(" connected");
      mqtt.subscribe(topicCommand.c_str(), 1);
      publishStatus();
    } else {
      Serial.printf(" failed, rc=%d, retrying in 5s\n", mqtt.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  topicCommand = String("farm/") + ORG_ID + "/" + API_KEY + "/command";
  topicSensors = String("farm/") + ORG_ID + "/" + API_KEY + "/sensors";
  topicStatus  = String("farm/") + ORG_ID + "/" + API_KEY + "/status";

  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    setRelay(i, false); // all motors OFF on boot
  }

  for (int i = 0; i < SENSOR_COUNT; i++) {
    if (SENSORS[i].pin >= 0) pinMode(SENSORS[i].pin, INPUT);
  }

  connectWiFi();

#if MQTT_USE_TLS
  espClient.setInsecure(); // TODO: pin HiveMQ's root CA for production
#endif
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);

  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  unsigned long now = millis();

  // Auto-off timers (duration-based commands)
  for (int i = 0; i < RELAY_COUNT; i++) {
    if (relayAutoOffAt[i] != 0 && (long)(now - relayAutoOffAt[i]) >= 0) {
      setRelay(i, false);
      relayAutoOffAt[i] = 0;
      Serial.printf("[Relay %d] auto-off (duration elapsed)\n", i + 1);
      publishStatus();
    }
  }

  if (now - lastSensorPublish >= SENSOR_PUBLISH_INTERVAL_MS) {
    publishSensors();
    lastSensorPublish = now;
  }

  if (now - lastStatusPublish >= STATUS_PUBLISH_INTERVAL_MS) {
    publishStatus();
    lastStatusPublish = now;
  }
}
