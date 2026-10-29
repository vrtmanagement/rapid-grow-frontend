
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PermissionProvider } from './context/PermissionContext';
import { ToastProvider } from './components/ui/Toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PermissionProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </PermissionProvider>
  </React.StrictMode>
);
