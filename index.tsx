import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { SessionProvider } from './components/SessionProvider';
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
  // Handle AbortError from OAuth exchanges gracefully
  if (event.reason?.name === 'AbortError' || 
      event.reason?.message?.includes('aborted') ||
      event.reason?.message?.includes('signal is aborted')) {
    console.warn('Unhandled AbortError (likely from OAuth exchange) - this is expected behavior');
    event.preventDefault(); // Prevent unhandled rejection error
    return;
  }
  
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior (console error)
  // This is especially important for OAuth flows where redirects might interrupt promises
  if (event.reason?.message?.includes('OAuth') || 
      event.reason?.message?.includes('redirect') ||
      event.reason?.code === 'AUTH_REDIRECT') {
    console.warn('OAuth redirect detected - this is expected behavior');
    event.preventDefault(); // Prevent unhandled rejection error
  }
});


const rootElement = document.getElementById('root');
if (!rootElement) {
  const error = new Error("Could not find root element to mount to");
  console.error('App: ERROR - Root element not found!', error);
  throw error;
}


// AuthGuard Component: Delays rendering by 100ms to give browser time to settle cookies
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = React.useState(false);
  
  React.useEffect(() => {
    // Give browser 100ms 'breather' to settle cookies before checking session
    const timer = setTimeout(() => {
      setReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-400 text-lg">Initializing...</div>
      </div>
    );
  }
  
  return <>{children}</>;
};

try {
  const root = ReactDOM.createRoot(rootElement);
  
  // NOTE: React.StrictMode is explicitly disabled for Auth
  // StrictMode causes double-mounting which can interrupt OAuth redirects
  // AuthGuard provides additional delay to let browser settle cookies
  root.render(
    // <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthGuard>
            <SessionProvider>
              <App />
            </SessionProvider>
          </AuthGuard>
        </BrowserRouter>
      </ErrorBoundary>
    // </React.StrictMode>
  );
  
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