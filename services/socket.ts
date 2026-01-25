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
  if (envUrl) {
    console.log('📡 Using VITE_SERVER_URL from environment:', envUrl);
    return envUrl;
  }
  
  // Check if running on mobile/Capacitor
  const isMobile = Capacitor.isNativePlatform();
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // For mobile devices in development, use local network IP
  if (isMobile) {
    // Check for environment variable first
    const mobileDevUrl = getEnv('VITE_MOBILE_DEV_URL');
    if (mobileDevUrl) {
      console.log('📡 Using VITE_MOBILE_DEV_URL:', mobileDevUrl);
      return mobileDevUrl;
    }
    
    // In development, use local IP (not hardcoded to playthirteen.app)
    if (isDev) {
      // Default to common local development IP, but allow override via env
      const localIp = getEnv('VITE_LOCAL_IP') || '10.0.0.131';
      const url = `http://${localIp}:3001`;
      console.log('📡 Mobile DEV mode - using local IP:', url);
      return url;
    }
    
    // In production mobile, use the production server
    const prodUrl = getEnv('VITE_PROD_SERVER_URL');
    if (prodUrl) {
      console.log('📡 Mobile PROD mode - using VITE_PROD_SERVER_URL:', prodUrl);
      return prodUrl;
    }
    
    // Fallback: use https for production mobile
    console.log('📡 Mobile PROD mode - using default HTTPS URL');
    return 'https://playthirteen.app:3001';
  }
  
  // Use environment-based URL for web
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
    
    if (isProduction) {
      const prodUrl = getEnv('VITE_PROD_SERVER_URL');
      if (prodUrl) {
        console.log('📡 Web PROD mode - using VITE_PROD_SERVER_URL:', prodUrl);
        return prodUrl;
      }
      // Use secure protocol if page is HTTPS
      const url = `${protocol}://${hostname}:3001`;
      console.log('📡 Web PROD mode - using hostname:', url);
      return url;
    }
    
    // Dynamic socket URL based on hostname (development)
    const url = hostname === 'localhost' || hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : `${protocol}://${hostname}:3001`;
    console.log('📡 Web DEV mode - using:', url);
    return url;
  }
  
  console.log('📡 Fallback - using localhost');
  return 'http://localhost:3001'; // Use localhost for development (socket server port)
};

const SERVER_URL = getSocketUrl();
const SOCKET_URL = SERVER_URL; // Use the URL from getSocketUrl() which handles all cases

// CRITICAL: Export a single shared socket instance
// This ensures Lobby and App components use the same socket instance
// If different instances were created, the server might not have "authenticated" the Lobby's socket yet
export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  forceNew: true,
  reconnectionAttempts: 5,
  timeout: 10000,
  // For SSL/TLS issues in development, allow self-signed certificates
  // Note: socket.io-client doesn't directly support rejectUnauthorized,
  // but we can handle errors gracefully with better logging
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// Verify singleton pattern - log if multiple instances are created (shouldn't happen)
if (typeof window !== 'undefined') {
  (window as any).__SOCKET_INSTANCE__ = (window as any).__SOCKET_INSTANCE__ || socket;
  if ((window as any).__SOCKET_INSTANCE__ !== socket) {
    console.warn('⚠️ Multiple socket instances detected! This may cause connection issues.');
  }
}

// Comprehensive connection event logging for debugging
socket.on('connect', () => {
  console.log('✅ Socket connected successfully to:', SOCKET_URL);
  console.log('📡 Socket ID:', socket.id);
  console.log('📡 Transport:', socket.io.engine.transport.name);
  isConnecting = false;
});

socket.on('connect_error', (error: Error) => {
  // Detailed error logging for debugging connection issues
  console.error('❌ ========== SOCKET CONNECTION ERROR ==========');
  console.error('❌ Error Message:', error.message);
  console.error('❌ Error Type:', error.name);
  console.error('❌ Attempted URL:', SOCKET_URL);
  console.error('❌ Error Details:', error);
  
  // Check for specific error types
  if (error.message.includes('timeout')) {
    console.error('❌ Connection Timeout: Server may be unreachable or slow');
  } else if (error.message.includes('xhr poll error')) {
    console.error('❌ XHR Poll Error: Network issue or CORS problem');
  } else if (error.message.includes('websocket error')) {
    console.error('❌ WebSocket Error: WSS/SSL issue or server not accepting WS connections');
  } else if (error.message.includes('ECONNREFUSED')) {
    console.error('❌ Connection Refused: Server is not running or port is closed');
  } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
    console.error('❌ DNS Error: Cannot resolve hostname');
  } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
    console.error('❌ SSL Certificate Error: Certificate validation failed');
    console.error('💡 Tip: For development, ensure server uses valid SSL or configure rejectUnauthorized');
  }
  
  console.error('❌ ============================================');
  isConnecting = false;
});

socket.on('disconnect', (reason: string) => {
  console.warn('⚠️ Socket disconnected. Reason:', reason);
  console.warn('⚠️ Socket ID was:', socket.id);
  isConnecting = false;
  
  // Log specific disconnect reasons
  if (reason === 'io server disconnect') {
    console.warn('⚠️ Server forcefully disconnected the socket');
  } else if (reason === 'io client disconnect') {
    console.warn('⚠️ Client manually disconnected');
  } else if (reason === 'ping timeout') {
    console.warn('⚠️ Ping timeout - server did not respond');
  } else if (reason === 'transport close') {
    console.warn('⚠️ Transport closed - connection lost');
  } else if (reason === 'transport error') {
    console.warn('⚠️ Transport error - network issue');
  }
});

socket.on('reconnect_attempt', (attemptNumber: number) => {
  console.log('🔄 Reconnection attempt #', attemptNumber, 'to:', SOCKET_URL);
});

socket.on('reconnect', (attemptNumber: number) => {
  console.log('✅ Reconnected after', attemptNumber, 'attempt(s)');
});

socket.on('reconnect_error', (error: Error) => {
  console.error('❌ Reconnection error:', error.message);
});

socket.on('reconnect_failed', () => {
  console.error('❌ Reconnection failed after all attempts');
});

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
