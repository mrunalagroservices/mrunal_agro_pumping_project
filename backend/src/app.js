const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./modules/auth/auth.routes');
const farmRoutes = require('./modules/farms/farm.routes');
const deviceRoutes = require('./modules/devices/device.routes');
const sensorRoutes = require('./modules/sensors/sensor.routes');
const actuatorRoutes = require('./modules/actuators/actuator.routes');
const automationRoutes = require('./modules/automation/automation.routes');
const scheduleRoutes = require('./modules/schedules/schedule.routes');
const alertRoutes = require('./modules/alerts/alert.routes');
const organizationRoutes = require('./modules/organizations/organization.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const ordersRoutes = require('./modules/orders/orders.routes');
const shopSettingsRoutes = require('./modules/shop-settings/shop-settings.routes');
const searchRoutes = require('./modules/search/search.routes');
const productsRoutes = require('./modules/products/products.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

// In development allow any localhost port so the dashboard/mobile dev server can connect freely.
// In production lock it to a comma-separated allowlist from FRONTEND_URL.
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (() => {
      const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim());
      return (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS: origin not allowed'));
        }
      };
    })()
  : (origin, callback) => {
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('CORS: origin not allowed'));
      }
    };

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/farms', farmRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/sensors', sensorRoutes);
app.use('/api/v1/actuators', actuatorRoutes);
app.use('/api/v1/automation-rules', automationRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/shop-settings', shopSettingsRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/products', productsRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'mrunal-agro-pumping-backend' }));

app.use((req, res) => res.status(404).json({ success: false, message: `${req.method} ${req.path} not found` }));

app.use(errorHandler);

module.exports = app;
