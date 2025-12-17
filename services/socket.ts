import { io, Socket } from 'socket.io-client';

// Use optional chaining to safely access env, as it might not be defined in all environments immediately
const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3001';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};