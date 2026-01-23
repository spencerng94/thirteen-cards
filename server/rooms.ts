// ============================================================================
// ROOMS MODULE - Hybrid Approach: Local Map + Supabase
// ============================================================================
// This module uses a hybrid approach:
// - Local Map for fast game logic operations
// - Supabase for room discovery and persistence across restarts
// ============================================================================

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with graceful fallback
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Prioritize service role key for better permissions, fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ ROOMS: Supabase credentials not found - using local Map only');
  console.warn('   SUPABASE_URL/VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.warn('   SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  console.warn('   Room discovery will be limited to local Map (rooms won\'t persist across restarts)');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON';
  console.log(`✅ ROOMS: Supabase client initialized with ${keyType} key`);
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
  hostId: string; // ID of the player who created the room
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
// LOCAL MAP SINGLETON - For Fast Game Logic
// ============================================================================

// Declare global type for the singleton Map
declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_ROOMS_MAP__: Map<string, GameRoom> | undefined;
}

// Initialize or reuse existing Map from global (survives hot reloads)
let roomsMap: Map<string, GameRoom>;

const existingGlobalMap = (global as any).__GLOBAL_ROOMS_MAP__;

if (existingGlobalMap instanceof Map) {
  roomsMap = existingGlobalMap;
  console.log(`💎 ROOMS: REUSING existing Map with ${roomsMap.size} rooms`);
} else {
  roomsMap = new Map<string, GameRoom>();
  (global as any).__GLOBAL_ROOMS_MAP__ = roomsMap;
  console.log(`💎 ROOMS: Created new Map`);
}

// Export the singleton Map - used for fast game logic operations
export const rooms = roomsMap;

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

// Convert GameRoom to database format (Sets -> arrays, etc.)
function serializeRoomForDB(room: GameRoom): any {
  return {
    id: room.id,
    status: room.status,
    host_id: room.hostId,
    players: room.players,
    room_name: room.roomName,
    is_public: room.isPublic,
    turn_duration: room.turnDuration,
    // Only save essential lobby state for discovery
    // Full game state stays in memory
  };
}

// Convert database format to GameRoom (arrays -> Sets, etc.)
function deserializeRoomFromDB(data: any): GameRoom {
  // Fallback: if hostId is missing or invalid, use the first player's ID (legacy support)
  const players = data.players || [];
  let hostId = data.host_id || (players.length > 0 && players[0]?.id) || '';
  
  // CRITICAL: If hostId is "guest" or invalid, use first player's ID instead
  if (hostId === 'guest' || hostId === 'GUEST' || hostId.trim() === '') {
    hostId = players.length > 0 && players[0]?.id ? players[0].id : '';
    if (hostId === 'guest' || hostId === 'GUEST') {
      console.warn('⚠️ ROOMS: First player also has invalid ID, hostId will be empty');
      hostId = '';
    }
  }
  
  return {
    id: data.id,
    status: data.status || 'LOBBY',
    hostId: hostId,
    players: players,
    currentPlayerIndex: data.current_player_index ?? 0,
    currentPlayPile: data.current_play_pile || [],
    roundHistory: data.round_history || [],
    lastPlayerToPlayId: data.last_player_to_play_id ?? null,
    finishedPlayers: data.finished_players || [],
    isFirstTurnOfGame: data.is_first_turn_of_game ?? true,
    turnEndTime: data.turn_end_time,
    turnTimer: undefined, // Not persisted
    isPublic: data.is_public ?? false,
    roomName: data.room_name || '',
    turnDuration: data.turn_duration ?? 30000,
    turnStartTime: data.turn_start_time,
    playerSpeedData: data.player_speed_data || {},
    playerMutedByAfk: new Set(data.player_muted_by_afk || []),
    quickMoveRewardGiven: new Set(data.quick_move_reward_given || [])
  };
}

// ============================================================================
// ROOM MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Creates a new room and adds the player as the first player
 * Saves to both local Map (for game logic) and Supabase (for discovery)
 */
export async function createRoom(
  player: SimplePlayer,
  roomName: string,
  isPublic: boolean = false,
  turnTimer: number = 30
): Promise<GameRoom> {
  // Generate unique 4-character room ID
  // Use alphanumeric characters (A-Z, 0-9) for readability
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 4; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Ensure uniqueness by checking if room already exists
  // If it exists, generate a new one (very unlikely with 36^4 = 1.6M combinations)
  while (rooms.has(roomId)) {
    roomId = '';
    for (let i = 0; i < 4; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  // Validate turn timer
  const validTurnTimer = [0, 15, 30, 60].includes(turnTimer) ? turnTimer : 30;
  
  // Create new room with full GameRoom structure
  // CRITICAL: Explicitly set hostId to the creator's ID
  // Validate that player.id is not "guest" or invalid
  let creatorId = player.id;
  if (!creatorId || creatorId === 'guest' || creatorId === 'GUEST' || creatorId.trim() === '' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creatorId)) {
    console.error(`❌ ROOMS: Invalid creatorId provided: "${creatorId}". This should never happen - player.id must be a valid UUID.`);
    throw new Error(`Invalid player ID: ${creatorId}. Player ID must be a valid UUID.`);
  }
  // Ensure hostId uses creatorId (with fallback to player.id if somehow creatorId is invalid)
  const hostId = creatorId || player.id;
  const room: GameRoom = {
    id: roomId,
    status: 'LOBBY',
    hostId: hostId, // Explicitly set the creator as the host
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
  
  // Save to local Map first (for fast game logic)
  rooms.set(roomId, room);
  console.log(`✅ ROOMS: Created room '${roomId}' in local Map with hostId: ${room.hostId}`);
  
  // Save initial lobby state to Supabase (for discovery)
  // CRITICAL: Ensure host_id is included in the insert
  if (supabase) {
    const roomData = serializeRoomForDB(room);
    // Double-check that host_id is present
    if (!roomData.host_id) {
      console.error('❌ ROOMS: host_id missing from serialized room data! Setting it now...');
      roomData.host_id = creatorId;
    }
    console.log(`📤 ROOMS: Inserting room to Supabase with host_id: ${roomData.host_id}, is_public: ${roomData.is_public}`);
    const { error } = await supabase
      .from('rooms')
      .insert(roomData);
    
    if (error) {
      console.error('❌ ROOMS: Error saving room to Supabase (non-critical):', error);
      console.error('   Room data:', JSON.stringify(roomData, null, 2));
      // Don't throw - room is in memory and can still be used
    } else {
      console.log(`✅ ROOMS: Saved room '${roomId}' to Supabase for discovery with host_id: ${roomData.host_id}, is_public: ${roomData.is_public}`);
    }
  } else {
    console.log(`⚠️ ROOMS: Room '${roomId}' created in local Map only (Supabase not configured)`);
  }
  
  return room;
}

/**
 * Joins a player to an existing room
 * Checks local Map first, then Supabase if not found (rehydration)
 */
export async function joinRoom(player: SimplePlayer, roomId: string): Promise<GameRoom> {
  console.log(`🔍 ROOMS: Joining room '${roomId}' by player: ${player.name}`);
  
  // FIRST: Check local Map (fast path)
  let room = rooms.get(roomId);
  
  if (!room) {
    // NOT in local Map - check Supabase and rehydrate (if available)
    if (supabase) {
      console.log(`🔄 ROOMS: Room '${roomId}' not in local Map, checking Supabase...`);
      
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (error || !data) {
        console.error(`❌ ROOMS: Room '${roomId}' not found in Supabase:`, error);
        throw new Error(`Room '${roomId}' not found`);
      }
      
      // Rehydrate: Deserialize and add to local Map
      room = deserializeRoomFromDB(data);
      rooms.set(roomId, room);
      console.log(`✅ ROOMS: Rehydrated room '${roomId}' from Supabase to local Map`);
    } else {
      // Supabase not configured - can't rehydrate
      throw new Error(`Room '${roomId}' not found (Supabase not configured)`);
    }
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
  
  // Update Supabase with new player list (for discovery)
  if (supabase) {
    const roomData = serializeRoomForDB(room);
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ players: roomData.players })
      .eq('id', roomId);
    
    if (updateError) {
      console.error('❌ ROOMS: Error updating room in Supabase (non-critical):', updateError);
      // Don't throw - room is updated in memory
    }
  }
  
  console.log(`✅ ROOMS: Player ${player.name} joined room '${roomId}'`);
  console.log(`📋 ROOMS: Room '${roomId}' now has ${room.players.length} players`);
  
  return room;
}

/**
 * Gets a room by ID - checks local Map first, then Supabase
 */
export function getRoom(roomId: string): GameRoom | undefined {
  return rooms.get(roomId);
}

/**
 * Fetches a room by ID from Supabase (for rehydration)
 */
export async function fetchRoom(roomId: string): Promise<GameRoom | undefined> {
  // First check local Map
  const localRoom = rooms.get(roomId);
  if (localRoom) {
    return localRoom;
  }
  
  // Not in Map - fetch from Supabase (if available)
  if (!supabase) {
    return undefined;
  }
  
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  
  if (error || !data) {
    return undefined;
  }
  
  // Rehydrate to local Map
  const room = deserializeRoomFromDB(data);
  rooms.set(roomId, room);
  return room;
}

/**
 * Gets all public rooms from Supabase (for discovery)
 * Falls back to local Map if Supabase is not configured
 */
export async function getPublicRooms(): Promise<Array<{ id: string; name: string; playerCount: number; turnTimer: number }>> {
  if (!supabase) {
    // Fallback to local Map
    return Array.from(rooms.values())
      .filter(room => room.isPublic && room.status === 'LOBBY' && room.players.length < 4)
      .map(room => ({
        id: room.id,
        name: room.roomName,
        playerCount: room.players.length,
        turnTimer: room.turnDuration / 1000 // Convert back to seconds
      }));
  }
  
  // Fetch all LOBBY rooms first to check is_public values
  const { data: allLobbyRooms, error: fetchError } = await supabase
    .from('rooms')
    .select('id, room_name, players, turn_duration, is_public, status')
    .eq('status', 'LOBBY');
  
  if (fetchError) {
    console.error('❌ ROOMS: Error fetching lobby rooms:', fetchError);
    return [];
  }
  
  if (!allLobbyRooms) {
    console.log('📋 ROOMS: No lobby rooms found in Supabase');
    return [];
  }
  
  console.log(`📋 ROOMS: Found ${allLobbyRooms.length} total lobby rooms in Supabase`);
  
  // DEBUG: Check is_public values - might be stored as string "true" instead of boolean
  const publicRoomsData = allLobbyRooms.filter(room => {
    const isPublic = room.is_public === true || room.is_public === 'true' || String(room.is_public) === 'true';
    return isPublic;
  });
  
  console.log(`📋 ROOMS: After isPublic filter: ${publicRoomsData.length} public rooms`);
  console.log(`📋 ROOMS: Sample is_public values:`, allLobbyRooms.slice(0, 3).map(r => ({ id: r.id, is_public: r.is_public, type: typeof r.is_public })));
  
  const data = publicRoomsData;
  
  if (data.length === 0) {
    console.log('📋 ROOMS: No public rooms found after filtering');
    return [];
  }
  
  // Deduplicate by room ID before processing
  const uniqueRoomData = Array.from(
    new Map(data.map(room => [room.id, room])).values()
  );
  console.log(`📋 ROOMS: After deduplication, ${uniqueRoomData.length} unique rooms`);
  
  const publicRooms = uniqueRoomData
    .map(room => {
      const players = room.players || [];
      return {
        id: room.id,
        name: room.room_name || '',
        playerCount: players.length,
        turnTimer: (room.turn_duration || 30000) / 1000 // Convert back to seconds
      };
    })
    .filter(room => {
      // Filter out full rooms (4+ players)
      const roomData = uniqueRoomData.find(r => r.id === room.id);
      const players = roomData?.players || [];
      return players.length < 4;
    });
  
  console.log(`📋 ROOMS: After filtering full rooms, ${publicRooms.length} public rooms available`);
  return publicRooms;
}

/**
 * Gets all room IDs from Supabase (falls back to local Map)
 */
export async function getAllRoomIds(): Promise<string[]> {
  if (!supabase) {
    // Fallback to local Map
    return Array.from(rooms.keys());
  }
  
  const { data, error } = await supabase
    .from('rooms')
    .select('id');
  
  if (error || !data) {
    console.error('❌ ROOMS: Error fetching room IDs:', error);
    return [];
  }
  
  return data.map(row => row.id);
}

/**
 * Gets total room count from Supabase (falls back to local Map)
 */
export async function getRoomCount(): Promise<number> {
  if (!supabase) {
    // Fallback to local Map
    return rooms.size;
  }
  
  const { count, error } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ ROOMS: Error counting rooms:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Deletes a room from both Map and Supabase
 */
export async function deleteRoom(roomId: string): Promise<void> {
  // Remove from local Map
  rooms.delete(roomId);
  
  // Remove from Supabase (if configured)
  if (supabase) {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);
    
    if (error) {
      console.error(`❌ ROOMS: Error deleting room '${roomId}' from Supabase:`, error);
      // Don't throw - room is removed from memory
    }
  }
  
  console.log(`✅ ROOMS: Deleted room '${roomId}'`);
}
