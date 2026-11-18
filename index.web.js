import {browserFieldworkEnabled} from './src/offline/fieldworkConfig';
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
// Production builds always install the shell. Development installs its network-first worker only when
// browser fieldwork is enabled for this (loopback) host, so local offline testing works without production sync.
if ((process.env.NODE_ENV === 'production' || browserFieldworkEnabled()) && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./fieldwork-worker.js').catch(error => console.error('Offline shell could not be installed',error)));
}
