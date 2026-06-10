const mqtt = require('mqtt');

let client = null;

// Returns null (instead of connecting) when MQTT_BROKER is not configured,
// so the API/dashboard can be developed and tested without a broker.
function connectMqtt() {
  if (!process.env.MQTT_BROKER) {
    console.log('[MQTT] MQTT_BROKER not set — MQTT disabled');
    return null;
  }

  client = mqtt.connect(process.env.MQTT_BROKER, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 5000,
    clientId: `pumping-backend-${Math.random().toString(16).slice(2, 10)}`
  });

  client.on('connect', () => console.log('[MQTT] Connected to broker'));
  client.on('reconnect', () => console.log('[MQTT] Reconnecting...'));
  client.on('error', (err) => console.error('[MQTT] Error:', err.message));
  client.on('close', () => console.log('[MQTT] Connection closed'));

  return client;
}

function getClient() {
  return client;
}

// Publishes an actuator command to farm/{org_id}/{api_key}/command.
// No-op when MQTT is disabled (no broker configured).
function publishCommand(orgId, apiKey, payload) {
  if (!client) {
    console.log(`[MQTT] Skipping publish (MQTT disabled): farm/${orgId}/${apiKey}/command`, payload);
    return;
  }
  const topic = `farm/${orgId}/${apiKey}/command`;
  client.publish(topic, JSON.stringify(payload), { qos: 1 });
}

module.exports = { connectMqtt, getClient, publishCommand };
