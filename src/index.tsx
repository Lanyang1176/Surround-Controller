import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useDeviceStore } from './stores/deviceStore';

function initDeviceBridge() {
  window.electronAPI?.onFullState((state) => {
    useDeviceStore.getState().applyFullState(state);
  });

  window.electronAPI?.onConnectionState((state) => {
    useDeviceStore.getState().setConnectionState(state as any);
  });

  window.electronAPI?.requestFullState().then((state) => {
    if (state) useDeviceStore.getState().applyFullState(state);
  });
}

initDeviceBridge();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
