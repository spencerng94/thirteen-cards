import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

console.log('App: Step 1 - Starting initialization...');

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

console.log('App: Step 2 - Setting up root element...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  const error = new Error("Could not find root element to mount to");
  console.error('App: ERROR - Root element not found!', error);
  throw error;
}

console.log('App: Step 3 - Root element found, creating React root...');

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('App: Step 4 - React root created, rendering app with ErrorBoundary...');
  
  // NOTE: React.StrictMode is temporarily disabled for OAuth testing
  // StrictMode causes double-mounting which can interrupt OAuth redirects
  // Re-enable after OAuth is confirmed working
  root.render(
    // <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    // </React.StrictMode>
  );
  
  console.log('App: Step 5 - App rendered successfully!');
} catch (error) {
  console.error('App: ERROR - Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace; background: #000; min-height: 100vh;">
      <h1>Application Error</h1>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      <pre>${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>
      <p>Check the browser console for more details.</p>
    </div>
  `;
}