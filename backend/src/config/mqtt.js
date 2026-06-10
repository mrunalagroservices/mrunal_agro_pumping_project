const mqtt = require('mqtt');

let client = null;

function connectMqtt() {
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
  if (!client) throw new Error('MQTT client not initialized — call connectMqtt() first');
  return client;
}

// Publishes an actuator command to farm/{org_id}/{api_key}/command
function publishCommand(orgId, apiKey, payload) {
  const topic = `farm/${orgId}/${apiKey}/command`;
  getClient().publish(topic, JSON.stringify(payload), { qos: 1 });
}

module.exports = { connectMqtt, getClient, publishCommand };
