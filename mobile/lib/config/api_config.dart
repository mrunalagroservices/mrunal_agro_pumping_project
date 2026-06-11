/// Production backend (Render). Override with --dart-define=API_BASE_URL=...
/// for local testing against backend/scripts/local-mqtt-broker.js setups.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://mrunal-agro-pumping-project.onrender.com/api/v1',
);
