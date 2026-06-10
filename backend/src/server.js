require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');
const { startMqttService } = require('./mqtt/mqtt.service');
const { startScheduler } = require('./jobs/scheduler');

const PORT = process.env.PORT || 3010;

const server = http.createServer(app);

const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL || 'http://localhost:3000')
  : '*';

initSocket(server, corsOrigin);
startMqttService();
startScheduler();

server.listen(PORT, () => {
  console.log(`[Server] Mrunal Agro Pumping API running on port ${PORT}`);
});
