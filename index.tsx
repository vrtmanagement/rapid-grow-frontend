
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PermissionProvider } from './context/PermissionContext';

if (typeof window !== 'undefined' && !window.location.hash && window.location.pathname !== '/') {
  const nextPath = `${window.location.pathname}${window.location.search || ''}`;
  window.location.replace(`${window.location.origin}/#${nextPath}`);
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
