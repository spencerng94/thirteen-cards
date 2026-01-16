
import { io, Socket } from 'socket.io-client';

const getEnv = (key: string): string | undefined => {
  try {
    if (typeof (import.meta as any).env !== 'undefined') {
      return (import.meta as any).env[key];
    }
  } catch (e) {}
  
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {}
  
  return undefined;
};

const getSocketUrl = (): string => {
  const envUrl = getEnv('VITE_SERVER_URL');
  if (envUrl) return envUrl;
  
  // Use environment-based URL
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProduction 
      ? (getEnv('VITE_PROD_SERVER_URL') || 'https://your-prod-server.com')
      : 'http://localhost:3001';
  }
  
  return 'http://localhost:3001';
};

const SERVER_URL = getSocketUrl();

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: false, // Disable automatic reconnection to prevent infinite loops
  timeout: 5000,
  transports: ['websocket', 'polling'],
});

// Suppress connection errors in console to prevent noise
socket.on('connect_error', (error) => {
  // Only log in development, suppress in production
  if (import.meta.env.DEV) {
    console.warn('Socket connection error (non-blocking):', error.message);
  }
});

export const connectSocket = () => {
  // Only connect if not already connected and not manually disconnected
  if (!socket.connected && !socket.disconnected) {
    try {
    socket.connect();
    } catch (error) {
      // Silently fail - UI should continue to work
      if (import.meta.env.DEV) {
        console.warn('Socket connect attempt failed:', error);
      }
    }
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};
