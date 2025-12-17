import { io, Socket } from 'socket.io-client';

// In a real deployment, this would be an env variable. 
// For this vibe code, we assume the server runs on port 3001 locally.
const SERVER_URL = 'http://localhost:3001';

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