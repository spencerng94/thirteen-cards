/**
 * Complete TypeScript Socket.IO Server Example
 * 
 * This example demonstrates a multiplayer game server with:
 * - Single global rooms Map shared across all socket connections
 * - Room creation and joining that works across all clients
 * - Proper type definitions for Room and Player
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Card {
  rank: number;
  suit: number;
  id: string;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  socketId: string;
  hand: Card[];
  isHost: boolean;
  hasPassed: boolean;
  finishedRank: number | null;
  isBot?: boolean;
  isOffline?: boolean;
  selected_sleeve_id?: string;
}

interface PlayTurn {
  playerId: string;
  cards: Card[];
  comboType: string;
}

interface Room {
  id: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: Player[];
  currentPlayerIndex: number;
  currentPlayPile: PlayTurn[];
  roundHistory: PlayTurn[][];
  lastPlayerToPlayId: string | null;
  finishedPlayers: string[];
  isFirstTurnOfGame: boolean;
  isPublic: boolean;
  roomName: string;
  turnDuration: number; // In milliseconds
  turnStartTime?: number;
  playerSpeedData: Record<string, { quickMoveStreak: number; totalSpeedGold: number; totalSpeedXp: number }>;
  playerMutedByAfk: Set<string>;
  quickMoveRewardGiven: Set<string>;
}

// ============================================================================
// GLOBAL ROOMS MAP - Single source of truth for all connections
// ============================================================================

/**
 * CRITICAL: This is the ONLY rooms Map declaration in the entire server.
 * Using Node.js 'global' object ensures the Map persists across hot reloads
 * and is shared by ALL socket connections.
 */
const globalRooms = (global as any).__GLOBAL_ROOMS_MAP__ || new Map<string, Room>();
(global as any).__GLOBAL_ROOMS_MAP__ = globalRooms;

// Export the rooms Map - all handlers MUST use this reference
export const rooms = globalRooms;

// Log initialization
if (globalRooms.size === 0 && !(global as any).__ROOMS_INITIALIZED__) {
  (global as any).__ROOMS_INITIALIZED__ = true;
  console.log("💎 GLOBAL ROOMS INITIALIZED - New Map created");
} else {
  console.log("💎 GLOBAL ROOMS REUSED - Existing Map (survived hot reload), size:", globalRooms.size);
}
console.log("💎 GLOBAL ROOMS Map size:", rooms.size);
console.log("💎 GLOBAL ROOMS Map identity check:", rooms === (global as any).__GLOBAL_ROOMS_MAP__);

// ============================================================================
// EXPRESS & HTTP SERVER SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

const httpServer = createServer(app);

// ============================================================================
// SOCKET.IO SERVER SETUP
// ============================================================================

// Ensure only one Socket.IO server instance exists
let io: Server;
if ((global as any).__SOCKET_IO_SERVER__) {
  io = (global as any).__SOCKET_IO_SERVER__;
  console.log("♻️ Reusing existing Socket.IO server instance");
} else {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });
  (global as any).__SOCKET_IO_SERVER__ = io;
  console.log("✅ New Socket.IO server instance created");
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize user input to prevent XSS attacks
 */
function sanitizeInput(input: string, maxLength: number): string {
  return (input || '').trim().substring(0, maxLength).replace(/[<>\"'&]/g, '') || 'GUEST';
}

/**
 * Get public rooms list for lobby display
 */
function getPublicRoomsList(): Array<{ id: string; roomName: string; playerCount: number; turnDuration: number }> {
  return Array.from(rooms.values())
    .filter(room => room.isPublic && room.status === 'LOBBY' && room.players.length < 4)
    .map(room => ({
      id: room.id,
      roomName: room.roomName,
      playerCount: room.players.length,
      turnDuration: room.turnDuration
    }));
}

/**
 * Broadcast game state to all players in a room
 */
function broadcastState(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const state = {
    roomId: room.id,
    status: room.status,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      hasPassed: p.hasPassed,
      finishedRank: p.finishedRank,
      isBot: p.isBot,
      isOffline: p.isOffline,
      selected_sleeve_id: p.selected_sleeve_id
    })),
    currentPlayerIndex: room.currentPlayerIndex,
    currentPlayPile: room.currentPlayPile,
    roundHistory: room.roundHistory,
    lastPlayerToPlayId: room.lastPlayerToPlayId,
    finishedPlayers: room.finishedPlayers,
    isFirstTurnOfGame: room.isFirstTurnOfGame,
    isPublic: room.isPublic,
    roomName: room.roomName,
    turnDuration: room.turnDuration,
    turnStartTime: room.turnStartTime
  };

  io.to(roomId).emit('game_state', state);
  io.to(roomId).emit('room_update', state);
}

/**
 * Broadcast public rooms list to all connected clients
 */
function broadcastPublicLobbies(): void {
  const publicRooms = getPublicRoomsList();
  io.emit('public_rooms_list', publicRooms);
}

// ============================================================================
// SOCKET.IO CONNECTION HANDLER
// ============================================================================

// Ensure handlers are registered only once
if ((global as any).__SOCKET_HANDLERS_REGISTERED__) {
  console.log("⚠️ Socket handlers already registered, skipping...");
} else {
  (global as any).__SOCKET_HANDLERS_REGISTERED__ = true;

  io.on('connection', (socket: Socket) => {
    console.log('🚀 SOCKET CONNECTED:', socket.id);
    console.log('📋 Connection handler - Rooms Map size:', rooms.size);
    console.log('📋 Connection handler - Using global Map:', rooms === (global as any).__GLOBAL_ROOMS_MAP__);

    // CRITICAL: Verify we're using the correct global Map instance
    if (rooms !== (global as any).__GLOBAL_ROOMS_MAP__) {
      console.error('❌ CRITICAL: rooms reference mismatch in connection handler!');
      throw new Error('rooms must reference global.__GLOBAL_ROOMS_MAP__');
    }

    // Send initial public rooms list
    socket.emit('public_rooms_list', getPublicRoomsList());

    // ========================================================================
    // CREATE ROOM HANDLER
    // ========================================================================
    socket.on('create_room', (data: {
      name: string;
      avatar: string;
      playerId?: string;
      isPublic?: boolean;
      roomName?: string;
      turnTimer?: number;
      selected_sleeve_id?: string;
    }) => {
      console.log('✅ CREATE_ROOM: Creating room...', data);
      console.log('📋 CREATE_ROOM: Rooms Map size before:', rooms.size);
      console.log('📋 CREATE_ROOM: Using global Map:', rooms === (global as any).__GLOBAL_ROOMS_MAP__);
      console.log('📋 CREATE_ROOM: Current room keys:', Array.from(rooms.keys()));

      // Generate unique room ID
      const roomId = "LOBBY_" + Math.random().toString(36).substring(7).toUpperCase();
      console.log(`🔑 CREATE_ROOM: Generated roomId: '${roomId}'`);

      // Join socket to the room
      socket.join(roomId);

      // Immediately notify client of room creation (for UI navigation)
      socket.emit('room_created', { roomId, settings: data });
      console.log(`🚀 SERVER: Sent room_created for ID: '${roomId}'`);

      // Sanitize and validate input
      const sanitizedName = sanitizeInput(data.name || 'GUEST', 20);
      const sanitizedAvatar = sanitizeInput(data.avatar || ':smile:', 50);
      const sanitizedRoomName = data.roomName 
        ? sanitizeInput(data.roomName, 24) 
        : `${sanitizedName.toUpperCase()}'S MATCH`;
      
      // Validate turn timer (0, 15, 30, or 60 seconds)
      const validTurnTimer = typeof data.turnTimer === 'number' && [0, 15, 30, 60].includes(data.turnTimer) 
        ? data.turnTimer 
        : 30;
      
      const sanitizedSleeveId = data.selected_sleeve_id && typeof data.selected_sleeve_id === 'string' && data.selected_sleeve_id.length <= 50
        ? data.selected_sleeve_id.trim()
        : undefined;

      try {
        const playerId = data.playerId || uuidv4();

        // Create new room object
        const newRoom: Room = {
          id: roomId,
          status: 'LOBBY',
          currentPlayerIndex: 0,
          currentPlayPile: [],
          roundHistory: [],
          lastPlayerToPlayId: null,
          finishedPlayers: [],
          isFirstTurnOfGame: true,
          isPublic: data.isPublic === true,
          roomName: sanitizedRoomName,
          turnDuration: validTurnTimer * 1000, // Convert to milliseconds
          players: [{
            id: playerId,
            name: sanitizedName,
            avatar: sanitizedAvatar,
            socketId: socket.id,
            hand: [],
            isHost: true,
            hasPassed: false,
            finishedRank: null,
            selected_sleeve_id: sanitizedSleeveId
          }],
          playerSpeedData: {},
          playerMutedByAfk: new Set(),
          quickMoveRewardGiven: new Set()
        };

        // CRITICAL: Save room to the GLOBAL Map (shared across all connections)
        rooms.set(roomId, newRoom);

        // Verify room was saved
        console.log(`✅ CREATE_ROOM: Room SAVED in memory with key: '${roomId}'`);
        console.log(`📋 CREATE_ROOM: Rooms Map size after save:`, rooms.size);
        console.log(`📋 CREATE_ROOM: All room keys:`, Array.from(rooms.keys()));
        console.log(`🔍 CREATE_ROOM: Room exists in Map:`, rooms.has(roomId));

        // Send game state to the creator
        const savedRoom = rooms.get(roomId);
        if (!savedRoom) {
          console.error('❌ CRITICAL: Room not found after save!');
          socket.emit('error', 'Failed to create room');
          return;
        }

        broadcastState(roomId);
        broadcastPublicLobbies();

        console.log(`🎮 Room ${roomId} created by ${sanitizedName}`);
        console.log(`✅ Room created and saved. Map size: ${rooms.size}, Room exists: ${rooms.has(roomId)}`);

      } catch (error) {
        console.error('❌ Error creating room:', error);
        socket.emit('error', 'Unable to create room. Please try again.');
      }
    });

    // ========================================================================
    // JOIN ROOM HANDLER
    // ========================================================================
    socket.on('join_room', (data: {
      roomId: string;
      name: string;
      avatar: string;
      playerId?: string;
      selected_sleeve_id?: string;
    }) => {
      const requestedId = data.roomId;
      console.log(`🔍 JOIN_ROOM: Client is looking for: '${requestedId}'`);
      console.log('📋 JOIN_ROOM: Rooms Map size:', rooms.size);
      console.log('📋 JOIN_ROOM: Using global Map:', rooms === (global as any).__GLOBAL_ROOMS_MAP__);
      const roomKeys = Array.from(rooms.keys());
      console.log(`📋 JOIN_ROOM: All room keys BEFORE lookup:`, roomKeys);
      console.log(`📋 JOIN_ROOM: Total rooms in memory:`, roomKeys.length);

      // Validate roomId format
      if (!requestedId || typeof requestedId !== 'string') {
        console.error('❌ Invalid roomId format:', requestedId, typeof requestedId);
        socket.emit('error', 'Invalid room code.');
        return;
      }

      // Accept either 4-character codes (ABCD) or LOBBY_XXXXX format
      const isValidFormat = /^[A-Z0-9]{4}$/i.test(requestedId) || /^LOBBY_[A-Z0-9]+$/i.test(requestedId);
      if (!isValidFormat) {
        console.error('❌ RoomId format validation failed:', requestedId);
        socket.emit('error', 'Invalid room code.');
        return;
      }

      // CRITICAL: Look up room from the SAME global Map
      const room = rooms.get(requestedId);
      
      if (!room) {
        console.error(`❌ Room not found: '${requestedId}'`);
        console.error(`📋 Available rooms:`, Array.from(rooms.keys()));
        console.error(`🔍 String comparison check:`);
        Array.from(rooms.keys()).forEach(key => {
          console.error(`  - Stored: '${key}' (length: ${key.length}) | Requested: '${requestedId}' (length: ${requestedId.length}) | Match: ${key === requestedId}`);
        });
        socket.emit('error', 'Room not found.');
        return;
      }

      console.log(`✅ Room found! Exact match: '${requestedId}'`);

      // Check if room is joinable
      if (room.status !== 'LOBBY' || room.players.length >= 4) {
        console.error('❌ Room not joinable:', { status: room.status, playerCount: room.players.length });
        socket.emit('error', room.status !== 'LOBBY' ? 'Match in progress.' : 'Lobby is full.');
        return;
      }

      console.log(`✅ Room joinable: '${requestedId}'`, { status: room.status, playerCount: room.players.length });

      // Sanitize input
      const sanitizedName = sanitizeInput(data.name || 'GUEST', 20);
      const sanitizedAvatar = sanitizeInput(data.avatar || ':smile:', 50);
      const sanitizedSleeveId = data.selected_sleeve_id && typeof data.selected_sleeve_id === 'string' && data.selected_sleeve_id.length <= 50
        ? data.selected_sleeve_id.trim()
        : undefined;

      const playerId = data.playerId || uuidv4();

      // Check if player is reconnecting
      const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
      if (existingPlayerIndex !== -1) {
        // Reconnection: update socket ID
        const player = room.players[existingPlayerIndex];
        player.socketId = socket.id;
        player.isOffline = false;
        if (sanitizedSleeveId !== undefined) {
          player.selected_sleeve_id = sanitizedSleeveId;
        }
        console.log(`🔄 Player reconnected: ${sanitizedName} (${playerId})`);
      } else {
        // New player: add to room
        room.players.push({
          id: playerId,
          name: sanitizedName,
          avatar: sanitizedAvatar,
          socketId: socket.id,
          hand: [],
          isHost: false,
          hasPassed: false,
          finishedRank: null,
          selected_sleeve_id: sanitizedSleeveId
        });
        console.log(`👤 New player joined: ${sanitizedName} (${playerId})`);
      }

      // Join socket room
      socket.join(requestedId);

      // Send game state to the joining player
      broadcastState(requestedId);

      // Send player's hand if they have one
      const player = room.players.find(p => p.id === playerId);
      if (player && !player.isBot && !player.isOffline && player.hand.length > 0) {
        socket.emit('player_hand', player.hand);
      }

      console.log(`👤 Player ${socket.id} (${sanitizedName}) joined '${requestedId}'`);
      console.log(`✅ Room found and player added. Map size: ${rooms.size}, Room exists: ${rooms.has(requestedId)}`);

      // Broadcast updated public rooms list
      broadcastPublicLobbies();
    });

    // ========================================================================
    // DISCONNECT HANDLER
    // ========================================================================
    socket.on('disconnect', () => {
      console.log('👋 SOCKET DISCONNECTED:', socket.id);
      // Handle player disconnection logic here if needed
    });

    // ========================================================================
    // CATCH-ALL LOGGER (for debugging)
    // ========================================================================
    socket.onAny((event, ...args) => {
      console.log(`📡 RECEIVED EVENT: ${event}`, args);
    });
  });

  console.log('✅ Socket handlers registered');
}

// ============================================================================
// START SERVER
// ============================================================================

// Ensure server only starts once
if (!process.env.SERVER_STARTED) {
  process.env.SERVER_STARTED = 'true';
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💎 Global rooms Map initialized with ${rooms.size} rooms`);
    console.log(`📡 Socket.IO server ready for connections`);
  });
} else {
  console.log('⚠️ Server already started, skipping listen()');
}

// Export for testing or external use
export { io, app, httpServer };
