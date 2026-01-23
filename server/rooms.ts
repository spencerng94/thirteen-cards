// ============================================================================
// ROOMS SINGLETON - True Singleton Pattern for Game Rooms
// ============================================================================
// This module provides a singleton Map that persists across:
// - Multiple socket connections
// - Hot reloads (tsx watch, nodemon)
// - Module re-imports
// ============================================================================

// CRITICAL: Log module load to detect re-imports
const MODULE_LOAD_TIME = Date.now();
const MODULE_LOAD_ID = Math.random().toString(36).substring(7);
console.log(`📦 rooms.ts MODULE LOADED at ${new Date().toISOString()}, ID: ${MODULE_LOAD_ID}, PID: ${process.pid}`);

// Import GameRoom type from server.ts (we'll define it here to avoid circular deps)
// Types are defined inline to avoid circular dependencies
enum Suit { Spades = 0, Clubs = 1, Diamonds = 2, Hearts = 3 }
enum Rank { Three = 3, Four = 4, Five = 5, Six = 6, Seven = 7, Eight = 8, Nine = 9, Ten = 10, Jack = 11, Queen = 12, King = 13, Ace = 14, Two = 15 }

interface Card {
  rank: Rank;
  suit: Suit;
  id: string;
}

type AiDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

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
  difficulty?: AiDifficulty;
  isOffline?: boolean;
  reconnectionTimeout?: any;
  isAfk?: boolean;
  consecutiveTimeouts?: number;
  selected_sleeve_id?: string;
}

interface PlayTurn {
  playerId: string;
  cards: Card[];
  comboType: string;
}

interface PlayerSpeedData {
  quickMoveStreak: number;
  totalSpeedGold: number;
  totalSpeedXp: number;
}

export interface GameRoom {
  id: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: Player[];
  currentPlayerIndex: number;
  currentPlayPile: PlayTurn[];
  roundHistory: PlayTurn[][];
  lastPlayerToPlayId: string | null; 
  finishedPlayers: string[];
  isFirstTurnOfGame: boolean;
  turnEndTime?: number;
  turnTimer?: any;
  isPublic: boolean;
  roomName: string;
  turnDuration: number; // In ms
  turnStartTime?: number;
  playerSpeedData: Record<string, PlayerSpeedData>;
  playerMutedByAfk: Set<string>;
  quickMoveRewardGiven: Set<string>;
}

// Simplified Player interface for room creation/joining
export interface SimplePlayer {
  id: string;
  name: string;
  avatar: string;
}

// ============================================================================
// SINGLETON MAP INITIALIZATION
// ============================================================================

// Declare global type for the singleton Map
declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_ROOMS_MAP__: Map<string, GameRoom> | undefined;
}

// Initialize or reuse existing Map from global (survives hot reloads)
// TRUE SINGLETON: Only one Map instance exists per Node.js process
// CRITICAL: This code runs ONCE at module load - NEVER inside connection handlers
// CRITICAL: If this module is re-imported, we MUST reuse the existing Map from global
let roomsMap: Map<string, GameRoom>;

// CRITICAL: ALWAYS check global first - if Map exists, REUSE IT (never create new)
// This check MUST happen FIRST, before any other logic
// Even if this module is re-imported, we MUST reuse the existing Map
const existingGlobalMap = (global as any).__GLOBAL_ROOMS_MAP__;

if (existingGlobalMap instanceof Map) {
  // Map exists - REUSE IT (never create a new one)
  // This is the CRITICAL path - we MUST use the existing Map
  roomsMap = existingGlobalMap;
  const existingSize = roomsMap.size;
  if (existingSize > 0) {
    console.log(`💎 ROOMS SINGLETON: REUSING existing Map with ${existingSize} rooms (module re-import detected)`);
    console.log(`📋 Existing room keys:`, Array.from(roomsMap.keys()));
  } else {
    console.log(`💎 ROOMS SINGLETON: REUSING existing Map (empty)`);
  }
  // CRITICAL: Verify we're using the exact same Map instance
  if (roomsMap !== existingGlobalMap) {
    console.error(`🚨 CRITICAL: Map reference changed during reuse!`);
    throw new Error('Map reference integrity violation');
  }
  // CRITICAL: Ensure global reference is still set (defensive check)
  if ((global as any).__GLOBAL_ROOMS_MAP__ !== roomsMap) {
    console.error(`🚨 CRITICAL: Global Map reference was changed!`);
    // Restore it immediately
    (global as any).__GLOBAL_ROOMS_MAP__ = roomsMap;
    throw new Error('Global Map reference was modified - restored but this should not happen');
  }
} else if (existingGlobalMap !== undefined) {
  // Something exists but it's not a Map - this is a critical error
  console.error(`🚨 CRITICAL: __GLOBAL_ROOMS_MAP__ exists but is not a Map!`);
  console.error(`🚨 Type:`, typeof existingGlobalMap);
  console.error(`🚨 Value:`, existingGlobalMap);
  console.error(`🚨 Constructor:`, existingGlobalMap?.constructor?.name);
  throw new Error('__GLOBAL_ROOMS_MAP__ exists but is not a Map - cannot recover');
} else {
  // Map doesn't exist - create it (only on first server start)
  roomsMap = new Map<string, GameRoom>();
  (global as any).__GLOBAL_ROOMS_MAP__ = roomsMap;
  console.log(`💎 ROOMS SINGLETON: Created new Map (first time)`);
}

// CRITICAL: Ensure the global reference is always set and is the same instance
if ((global as any).__GLOBAL_ROOMS_MAP__ !== roomsMap) {
  console.error(`🚨 CRITICAL: Global Map reference mismatch!`);
  throw new Error('Global Map reference integrity violation');
}

// Add initialization flag to detect if Map was replaced
if (!(roomsMap as any).__INITIALIZED__) {
  Object.defineProperty(roomsMap, '__INITIALIZED__', {
    value: true,
    writable: false,
    configurable: false,
    enumerable: false
  });
}

// CRITICAL: Override Map.clear() to prevent accidental clearing
// This ensures the Map can never be cleared, even if someone calls .clear()
const originalClear = roomsMap.clear.bind(roomsMap);
roomsMap.clear = function() {
  console.error('🚨 CRITICAL: Map.clear() was called! This should NEVER happen!');
  console.error('🚨 Stack trace:', new Error().stack);
  // DO NOT clear the Map - just log the error
  // If you see this error, find and remove the code calling .clear()
  throw new Error('CRITICAL: rooms Map.clear() was called - this is not allowed');
};

// Export the singleton Map - all handlers use this reference
// CRITICAL: This is the SINGLE source of truth
// CRITICAL: This export is NEVER reassigned - it always points to the same Map instance
export const rooms = roomsMap;

// CRITICAL: Final verification - ensure export matches global
if (rooms !== roomsMap || rooms !== (global as any).__GLOBAL_ROOMS_MAP__) {
  console.error('🚨 CRITICAL: rooms export mismatch!');
  console.error('📋 rooms:', rooms);
  console.error('📋 roomsMap:', roomsMap);
  console.error('📋 global.__GLOBAL_ROOMS_MAP__:', (global as any).__GLOBAL_ROOMS_MAP__);
  throw new Error('rooms export must reference the same Map instance');
}

// Log initialization status
const globalMapRef = (global as any).__GLOBAL_ROOMS_MAP__;
console.log(`💎 ROOMS SINGLETON: Map size: ${rooms.size}, Identity: ${rooms === globalMapRef}`);
console.log(`💎 ROOMS SINGLETON: Module loaded at ${new Date().toISOString()}, PID: ${process.pid}, Module ID: ${MODULE_LOAD_ID}`);
console.log(`💎 ROOMS SINGLETON: Global Map exists: ${!!globalMapRef}`);
console.log(`💎 ROOMS SINGLETON: Global Map is Map: ${globalMapRef instanceof Map}`);
if (globalMapRef) {
  console.log(`💎 ROOMS SINGLETON: Global Map size: ${globalMapRef.size}`);
  console.log(`💎 ROOMS SINGLETON: Global Map keys: [${Array.from(globalMapRef.keys()).join(', ')}]`);
}

// ============================================================================
// ROOM MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Creates a new room and adds the player as the first player
 */
export function createRoom(
  player: SimplePlayer,
  roomName: string,
  isPublic: boolean = false,
  turnTimer: number = 30
): GameRoom {
  // Generate unique room ID
  const roomId = "LOBBY_" + Math.random().toString(36).substring(7).toUpperCase();
  
  // Validate turn timer
  const validTurnTimer = [0, 15, 30, 60].includes(turnTimer) ? turnTimer : 30;
  
  // Create new room with full GameRoom structure
  const room: GameRoom = {
    id: roomId,
    status: 'LOBBY',
    currentPlayerIndex: 0,
    currentPlayPile: [],
    roundHistory: [],
    lastPlayerToPlayId: null,
    finishedPlayers: [],
    isFirstTurnOfGame: true,
    isPublic: isPublic,
    roomName: roomName,
    turnDuration: validTurnTimer * 1000, // Convert to milliseconds
    players: [{
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      socketId: '', // Will be set by the socket handler
      hand: [],
      isHost: true,
      hasPassed: false,
      finishedRank: null
    }],
    playerSpeedData: {},
    playerMutedByAfk: new Set(),
    quickMoveRewardGiven: new Set()
  };
  
  // Save to singleton Map
  // CRITICAL: Verify we're using the correct Map instance
  const globalMap = (global as any).__GLOBAL_ROOMS_MAP__;
  if (rooms !== globalMap) {
    console.error('🚨 CRITICAL: rooms !== globalMap in createRoom!');
    throw new Error('Map instance mismatch in createRoom');
  }
  
  // Store Map size before adding (for verification)
  const sizeBefore = rooms.size;
  
  rooms.set(roomId, room);
  
  // Mark that rooms have been created (for defensive checks)
  (global as any).__ROOMS_EVER_CREATED__ = true;
  
  // Verify room was saved
  const savedRoom = rooms.get(roomId);
  if (!savedRoom) {
    throw new Error(`Failed to save room ${roomId} to Map`);
  }
  
  // Double-check the global Map also has it
  const globalRoom = globalMap.get(roomId);
  if (!globalRoom) {
    console.error('🚨 CRITICAL: Room saved to rooms but not found in globalMap!');
    throw new Error(`Room ${roomId} not found in globalMap after save`);
  }
  
  // Verify Map size increased
  if (rooms.size !== sizeBefore + 1) {
    console.error(`🚨 CRITICAL: Map size didn't increase! Before: ${sizeBefore}, After: ${rooms.size}`);
    throw new Error(`Map size mismatch after room creation`);
  }
  
  console.log(`✅ ROOMS: Created room '${roomId}' by ${player.name}`);
  console.log(`📋 ROOMS: Map size: ${rooms.size}, Keys: [${Array.from(rooms.keys()).join(', ')}]`);
  console.log(`📋 ROOMS: Global Map size: ${globalMap.size}, Keys: [${Array.from(globalMap.keys()).join(', ')}]`);
  console.log(`🔍 ROOMS: Room exists in Map: ${rooms.has(roomId)}`);
  console.log(`🔍 ROOMS: Room exists in globalMap: ${globalMap.has(roomId)}`);
  
  return savedRoom;
}

/**
 * Joins a player to an existing room
 */
export function joinRoom(player: SimplePlayer, roomId: string): GameRoom {
  console.log(`🔍 ROOMS: Joining room '${roomId}' by player: ${player.name}`);
  console.log(`📋 ROOMS: Map size: ${rooms.size}, All keys: [${Array.from(rooms.keys()).join(', ')}]`);
  
  // Look up room from singleton Map
  const room = rooms.get(roomId);
  
  if (!room) {
    const availableRooms = Array.from(rooms.keys());
    console.error(`❌ ROOMS: Room '${roomId}' not found`);
    console.error(`📋 ROOMS: Available rooms: [${availableRooms.join(', ')}]`);
    throw new Error(`Room '${roomId}' not found`);
  }
  
  // Check if room is joinable
  if (room.status !== 'LOBBY') {
    throw new Error(`Room '${roomId}' is not in LOBBY status (current: ${room.status})`);
  }
  
  if (room.players.length >= 4) {
    throw new Error(`Room '${roomId}' is full (${room.players.length}/4 players)`);
  }
  
  // Check if player is already in room (reconnection)
  const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
  if (existingPlayerIndex !== -1) {
    console.log(`🔄 ROOMS: Player ${player.name} reconnecting to room '${roomId}'`);
    const existingPlayer = room.players[existingPlayerIndex];
    existingPlayer.name = player.name;
    existingPlayer.avatar = player.avatar;
    existingPlayer.isOffline = false;
    return room;
  }
  
  // Add new player to room
  room.players.push({
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    socketId: '', // Will be set by the socket handler
    hand: [],
    isHost: false,
    hasPassed: false,
    finishedRank: null
  });
  
  console.log(`✅ ROOMS: Player ${player.name} joined room '${roomId}'`);
  console.log(`📋 ROOMS: Room '${roomId}' now has ${room.players.length} players`);
  console.log(`📋 ROOMS: Map size: ${rooms.size}, Room exists: ${rooms.has(roomId)}`);
  
  return room;
}

/**
 * Gets a room by ID
 */
export function getRoom(roomId: string): GameRoom | undefined {
  return rooms.get(roomId);
}

/**
 * Gets all public rooms
 */
export function getPublicRooms(): Array<{ id: string; name: string; playerCount: number; turnTimer: number }> {
  return Array.from(rooms.values())
    .filter(room => room.isPublic && room.status === 'LOBBY' && room.players.length < 4)
    .map(room => ({
      id: room.id,
      name: room.roomName,
      playerCount: room.players.length,
      turnTimer: room.turnDuration / 1000 // Convert back to seconds
    }));
}

/**
 * Gets all room IDs
 */
export function getAllRoomIds(): string[] {
  return Array.from(rooms.keys());
}

/**
 * Gets total room count
 */
export function getRoomCount(): number {
  return rooms.size;
}
