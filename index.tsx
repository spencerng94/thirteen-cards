import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Add error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Add error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  const error = new Error("Could not find root element to mount to");
  console.error(error);
  throw error;
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Application Error</h1>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      <pre>${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>
      <p>Check the browser console for more details.</p>
    </div>
  `;
}