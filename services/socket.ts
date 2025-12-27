
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

const SERVER_URL = getEnv('VITE_SERVER_URL') || 'http://localhost:3001';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};
