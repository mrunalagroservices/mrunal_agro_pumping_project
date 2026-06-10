/*
 * Mrunal Agro Pumping - ESP32 Controller (bench test)
 *
 * Connects to WiFi + a local MQTT broker, subscribes to the command topic
 * to drive relay channel 1 (wired to the onboard LED on GPIO2 for this
 * bench test), and reports status back to the dashboard.
 *
 * Required Libraries (install via Arduino IDE > Library Manager):
 * - PubSubClient by Nick O'Leary
 * - ArduinoJson by Benoit Blanchon (v7+)
 *
 * Board: ESP32 Dev Module
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURATION - CHANGE THESE VALUES
// ============================================================

// WiFi Credentials — must be the SAME network as the Mac running the backend
const char* WIFI_SSID     = "Airtel_nish_4793";   // <-- fill in your home WiFi name
const char* WIFI_PASSWORD = "air14414";

// Local MQTT broker (backend/scripts/local-mqtt-broker.js, port 1883, no auth)
const char* MQTT_HOST     = "192.168.1.4";       // Mac's LAN IP
const int   MQTT_PORT     = 1883;
const char* MQTT_USERNAME = "";
const char* MQTT_PASSWORD = "";

// Device identity — matches the "controller" device created in the backend
// Topics become: farm/{ORG_ID}/{API_KEY}/sensors|status|command
const char* ORG_ID           = "1";
const char* API_KEY          = "pump_600527edb5d1d8243d5dfe72ad8b7cd7";
const char* FIRMWARE_VERSION = "1.0.0-test";

// Relay channel 1 ("Motor" actuator) -> onboard LED on GPIO2
#define RELAY_PIN 2
#define RELAY_ACTIVE_LOW true    // this LED wiring is active-LOW (LOW = on)

// Timing
const unsigned long SENSOR_PUBLISH_INTERVAL_MS = 30000;
const unsigned long STATUS_PUBLISH_INTERVAL_MS = 60000;

// ============================================================
// STATE
// ============================================================

WiFiClient espClient;
PubSubClient mqttClient(espClient);

bool relayState = false;
unsigned long relayAutoOffAt = 0;
unsigned long lastSensorPublish = 0;
unsigned long lastStatusPublish = 0;

String topicCommand;
String topicSensors;
String topicStatus;

// ============================================================
// RELAY
// ============================================================

void setRelay(bool on) {
  relayState = on;
  bool pinLevel = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PIN, pinLevel ? HIGH : LOW);
  Serial.printf("[Relay] %s\n", on ? "ON" : "OFF");
}

// ============================================================
// WIFI
// ============================================================

void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("\n[WiFi] Connected, IP: ");
  Serial.println(WiFi.localIP());
}

// ============================================================
// MQTT PUBLISH HELPERS
// ============================================================

void publishStatus() {
  JsonDocument doc;
  doc["status"] = "online";
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["ip"] = WiFi.localIP().toString();

  JsonObject relays = doc["relay_states"].to<JsonObject>();
  relays["1"] = relayState ? "on" : "off";

  String payload;
  serializeJson(doc, payload);
  mqttClient.publish(topicStatus.c_str(), payload.c_str(), true); // retained
  Serial.print("[MQTT] status -> ");
  Serial.println(payload);
}

void publishSensors() {
  // No sensors wired for this bench test. Publishing an empty object keeps
  // the heartbeat going; add real channels here once sensors are connected.
  JsonDocument doc;
  String payload;
  serializeJson(doc, payload);
  mqttClient.publish(topicSensors.c_str(), payload.c_str());
}

// ============================================================
// MQTT COMMAND HANDLER
// ============================================================

void onMqttMessage(char *topic, byte *payload, unsigned int length) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
    return;
  }

  const char *action = doc["action"] | "";
  int relayChannel = doc["relay_channel"] | 0;
  long duration = doc["duration"] | 0; // seconds, 0 = indefinite

  if (relayChannel != 1) {
    Serial.printf("[MQTT] Ignoring command for relay_channel %d (only channel 1 wired)\n", relayChannel);
    return;
  }

  if (strcmp(action, "turn_on") == 0) {
    setRelay(true);
    relayAutoOffAt = duration > 0 ? millis() + (unsigned long)duration * 1000UL : 0;
    Serial.printf("[Relay] ON (duration=%lds)\n", duration);
  } else if (strcmp(action, "turn_off") == 0) {
    setRelay(false);
    relayAutoOffAt = 0;
    Serial.println("[Relay] OFF");
  } else {
    Serial.printf("[MQTT] Unknown action: %s\n", action);
    return;
  }

  publishStatus(); // report new relay state immediately so the dashboard updates
}

// ============================================================
// MQTT CONNECT
// ============================================================

void connectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting...");
    String clientId = String("esp32-") + API_KEY;
    String willPayload = "{\"status\":\"offline\"}";

    bool ok = mqttClient.connect(
      clientId.c_str(),
      MQTT_USERNAME, MQTT_PASSWORD,
      topicStatus.c_str(), 1, true, willPayload.c_str()
    );

    if (ok) {
      Serial.println(" connected");
      mqttClient.subscribe(topicCommand.c_str(), 1);
      publishStatus();
    } else {
      Serial.printf(" failed, rc=%d, retrying in 5s\n", mqttClient.state());
      delay(5000);
    }
  }
}

// ============================================================
// SETUP / LOOP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("\n========================================");
  Serial.println("Mrunal Agro Pumping - ESP32 Controller");
  Serial.println("========================================\n");

  topicCommand = String("farm/") + ORG_ID + "/" + API_KEY + "/command";
  topicSensors = String("farm/") + ORG_ID + "/" + API_KEY + "/sensors";
  topicStatus  = String("farm/") + ORG_ID + "/" + API_KEY + "/status";

  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false); // motor OFF on boot

  connectWiFi();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setBufferSize(512);

  connectMqtt();

  Serial.println("\nSetup complete!\n");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqttClient.connected()) connectMqtt();
  mqttClient.loop();

  unsigned long now = millis();

  // Auto-off timer (duration-based commands)
  if (relayAutoOffAt != 0 && (long)(now - relayAutoOffAt) >= 0) {
    setRelay(false);
    relayAutoOffAt = 0;
    Serial.println("[Relay] auto-off (duration elapsed)");
    publishStatus();
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
