
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PermissionProvider } from './context/PermissionContext';

if (typeof window !== 'undefined' && !window.location.hash && window.location.pathname === '/review') {
  window.location.replace(`${window.location.origin}/#/review`);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PermissionProvider>
      <App />
    </PermissionProvider>
  </React.StrictMode>
);
