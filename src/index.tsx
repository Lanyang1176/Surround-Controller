import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createMockFullDeviceState } from './dev/mockDevice';
import { useDeviceStore } from './stores/deviceStore';

function initMockDevice() {
  const store = useDeviceStore.getState();
  store.applyFullState(createMockFullDeviceState());
  store.setConnectionState('connected');
}

initMockDevice();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
