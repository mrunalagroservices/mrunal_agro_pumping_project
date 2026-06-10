# ESP32 Pump Gateway Firmware

PlatformIO project for the ESP32 gateway that controls farm motors/pumps and
reports sensor data over MQTT.

## Setup

1. Install [PlatformIO](https://platformio.org/) (CLI or VS Code extension).
2. Copy the config template and fill in your credentials:
   ```bash
   cp src/config.h.example src/config.h
   ```
   - `WIFI_SSID` / `WIFI_PASSWORD` — the farm's WiFi network
   - `MQTT_HOST` / `MQTT_USERNAME` / `MQTT_PASSWORD` — from the backend's `.env` (`MQTT_BROKER`, `MQTT_USERNAME`, `MQTT_PASSWORD`)
   - `ORG_ID` / `API_KEY` — copy from the `devices` row created via `POST /api/v1/devices` in the backend
   - `RELAY_PINS` — GPIO pins wired to your relay module, one per `relay_channel` (1-indexed)
   - `SENSORS` — GPIO/ADC pins for any sensors, with a conversion function to engineering units. The `channel` string must match the `sensors.channel` value registered for this device in the backend.
3. Build and upload:
   ```bash
   pio run -t upload
   pio device monitor
   ```

## Wiring notes

- Most relay modules are **active-LOW** (default `RELAY_ACTIVE_LOW true`) — driving the
  GPIO LOW energizes the relay coil and turns the motor ON. If your relay board is
  active-HIGH, set this to `false`.
- Use GPIOs 16/17/18/19/21/22/23/25-27/32/33 for relay outputs (avoid 34-39, input-only).
- Use GPIOs 32-39 (ADC1) for analog sensors — ADC2 (0,2,4,12-15,25-27) conflicts with WiFi.

## Protocol

| Topic | Direction | Payload |
|---|---|---|
| `farm/{ORG_ID}/{API_KEY}/sensors` | publish, every 30s | `{ "<channel>": <value>, ... }` |
| `farm/{ORG_ID}/{API_KEY}/status` | publish, every 60s + on change (retained, LWT=offline) | `{ "status": "online", "firmware_version", "ip", "relay_states": {"1":"on",...} }` |
| `farm/{ORG_ID}/{API_KEY}/command` | subscribe | `{ "action": "turn_on"\|"turn_off", "relay_channel": 1, "duration": <seconds, 0=indefinite> }` |

On `turn_on` with `duration > 0`, the relay auto-shuts-off after `duration` seconds and
publishes an updated `status` so the dashboard reflects the change immediately.

## Production hardening (before field deployment)

- Replace `espClient.setInsecure()` with HiveMQ Cloud's root CA certificate
- Consider WiFiManager for field WiFi provisioning instead of hardcoded credentials
- Add a watchdog timer (`esp_task_wdt`) in case `loop()` ever stalls
