import { io, Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';

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
  
  // Check if running on mobile/Capacitor
  const isMobile = Capacitor.isNativePlatform();
  
  // Use local network IP for mobile devices and development
  if (isMobile) {
    return 'http://10.0.0.131:3001';
  }
  
  // Use environment-based URL for web
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isProduction) {
      return getEnv('VITE_PROD_SERVER_URL') || 'https://your-prod-server.com';
    }
    // For development, use localhost on port 3001 (socket server port)
    return window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://localhost:3001';
  }
  
  return 'http://localhost:3001'; // Use localhost for development (socket server port)
};

const SERVER_URL = getSocketUrl();

// For development, use localhost:3001 directly
const SOCKET_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : SERVER_URL;

export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  timeout: 10000,
});

// Connection event logging
socket.on('connect', () => {
  console.log('✅ Socket connected to:', SOCKET_URL);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error.message);
  console.error('Attempted to connect to:', SOCKET_URL);
});

socket.on('disconnect', (reason) => {
  console.warn('⚠️ Socket disconnected:', reason);
});

export const connectSocket = () => {
  // Only connect if not already connected
  if (!socket.connected) {
    try {
      console.log('connectSocket: Attempting to connect to', SERVER_URL);
      socket.connect();
    } catch (error) {
      // Silently fail - UI should continue to work
      if (import.meta.env.DEV) {
        console.warn('Socket connect attempt failed:', error);
      }
    }
  } else {
    console.log('connectSocket: Socket already connected');
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};
