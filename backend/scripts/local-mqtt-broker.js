// Tiny local MQTT broker for development/testing — lets the ESP32 firmware and the
// backend talk to each other on the LAN without provisioning HiveMQ Cloud.
//
// Run with: node scripts/local-mqtt-broker.js
// Then point both backend/.env (MQTT_BROKER) and firmware/config.h (MQTT_HOST/PORT)
// at this machine's LAN IP, port 1883.

const Aedes = require('aedes').Aedes;
const net = require('net');

const PORT = process.env.MQTT_PORT || 1883;

(async () => {
  const aedes = await Aedes.createBroker();
  const server = net.createServer(aedes.handle);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[local-mqtt-broker] Listening on 0.0.0.0:${PORT}`);
  });

  aedes.on('client', (client) => {
    console.log(`[local-mqtt-broker] Client connected: ${client.id}`);
  });

  aedes.on('clientDisconnect', (client) => {
    console.log(`[local-mqtt-broker] Client disconnected: ${client.id}`);
  });

  aedes.on('publish', (packet, client) => {
    if (client && !packet.topic.startsWith('$SYS')) {
      console.log(`[local-mqtt-broker] ${client.id} -> ${packet.topic}: ${packet.payload.toString()}`);
    }
  });
})();
