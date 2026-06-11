/// Production backend (Render). Override with --dart-define=API_BASE_URL=...
/// for local testing against backend/scripts/local-mqtt-broker.js setups.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://mrunal-agro-pumping-project.onrender.com/api/v1',
);

/// Socket.IO server (same backend, without the /api/v1 prefix). Override with
/// --dart-define=SOCKET_BASE_URL=... to match a custom API_BASE_URL.
const String socketBaseUrl = String.fromEnvironment(
  'SOCKET_BASE_URL',
  defaultValue: 'https://mrunal-agro-pumping-project.onrender.com',
);
