import React from 'react';
import FieldworkLauncher from './src/components/FieldworkWorkspace.web';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

const WebApp = () => React.createElement(React.Fragment, null, React.createElement(App), React.createElement(FieldworkLauncher));
AppRegistry.registerComponent(appName, () => WebApp);

const rootTag = document.getElementById('root');
if (rootTag) {
  rootTag.style.height = '100%';
}

AppRegistry.runApplication(appName, {rootTag});
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./fieldwork-worker.js').catch(error => console.error('Offline shell could not be installed',error)));
}
