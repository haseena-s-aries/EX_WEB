// Public browser configuration. Never put passwords or signing keys here.
(function () {
  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  // HTTP development pages use the loopback HTTP API, avoiding development
  // certificate failures. HTTPS pages retain HTTPS; IIS uses API port 338.
  var localApi = ['339', '440'].includes(window.location.port)
    ? 'https://localhost:338/api'
    : window.location.protocol === 'http:'
      ? 'http://localhost:5235/api'
      : 'https://localhost:7288/api';
  window.EX_SURVEY_CONFIG = {
    // 'local' enables browser fieldwork ONLY on loopback hosts (localhost/127.0.0.1) for local testing.
    // Production hosts stay disabled. Use true only after separate production authorization.
    browserFieldworkEnabled: 'local',
    // Set registrationEnabled to false to hide public registration links.
    apiBaseUrl: isLocal ? localApi : 'https://139.5.189.155:338/api',
  };
}());
