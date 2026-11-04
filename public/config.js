// Public browser configuration. Never put passwords or signing keys here.
(function () {
  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  // npm run web uses the local dotnet HTTPS profile. IIS uses API port 441.
  var localApi = window.location.port === '440'
    ? 'https://localhost:339/api'
    : 'https://localhost:7288/api';
  window.EX_SURVEY_CONFIG = {
    apiBaseUrl: isLocal ? localApi : 'https://139.5.189.155:339/api',
  };
}());
