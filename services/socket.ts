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
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
    
    if (isProduction) {
      const prodUrl = getEnv('VITE_PROD_SERVER_URL');
      if (prodUrl) return prodUrl;
      // Use secure protocol if page is HTTPS
      return `${protocol}://${hostname}:3001`;
    }
    
    // Dynamic socket URL based on hostname
    return hostname === 'localhost' || hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : `${protocol}://${hostname}:3001`;
  }
  
  return 'http://localhost:3001'; // Use localhost for development (socket server port)
};

const SERVER_URL = getSocketUrl();

// Dynamic socket URL - use hostname from window.location and match protocol
const SOCKET_URL = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : (() => {
          const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
          return `${protocol}://${window.location.hostname}:3001`;
        })())
  : SERVER_URL;

// CRITICAL: Export a single shared socket instance
// This ensures Lobby and App components use the same socket instance
// If different instances were created, the server might not have "authenticated" the Lobby's socket yet
export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  forceNew: true,
  reconnectionAttempts: 5,
  timeout: 10000,
});

// Verify singleton pattern - log if multiple instances are created (shouldn't happen)
if (typeof window !== 'undefined') {
  (window as any).__SOCKET_INSTANCE__ = (window as any).__SOCKET_INSTANCE__ || socket;
  if ((window as any).__SOCKET_INSTANCE__ !== socket) {
    console.warn('⚠️ Multiple socket instances detected! This may cause connection issues.');
  }
}

// Connection event logging (only in development)
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('✅ Socket connected to:', SOCKET_URL);
    isConnecting = false;
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    console.error('Attempted to connect to:', SOCKET_URL);
    isConnecting = false;
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ Socket disconnected:', reason);
    isConnecting = false;
  });
} else {
  // In production, only log critical errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection failed');
    isConnecting = false;
  });
  
  socket.on('connect', () => {
    isConnecting = false;
  });
  
  socket.on('disconnect', () => {
    isConnecting = false;
  });
}

let isConnecting = false;

export const connectSocket = () => {
  // Prevent duplicate connection attempts
  if (socket.connected) {
    return; // Already connected, no action needed
  }
  
  if (isConnecting) {
    return; // Connection already in progress
  }
  
  isConnecting = true;
  
  try {
    if (import.meta.env.DEV) {
      console.log('🔌 Connecting to socket server:', SERVER_URL);
    }
    socket.connect();
    
    // Reset connecting flag after a short delay
    setTimeout(() => {
      isConnecting = false;
    }, 1000);
  } catch (error) {
    isConnecting = false;
    // Silently fail - UI should continue to work
    if (import.meta.env.DEV) {
      console.warn('Socket connect attempt failed:', error);
    }
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};
