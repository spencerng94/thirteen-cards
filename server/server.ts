// ============================================================================
// PROCESS IDENTITY - Verify single process execution
// ============================================================================
import "dotenv/config";

console.log("🔥 SERVER START", {
  pid: process.pid,
  startedAt: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
});

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, clearRateLimit } from './rateLimiter';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Types Mirroring Client
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
  selected_sleeve_id?: string; // Card sleeve ID for this player
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

// GameRoom interface is now imported from './rooms' - removed local declaration

// Import socket mappings from roomStore
import { socketToRoom, socketToPlayerId } from './roomStore';

// Import room functions, Map, and types from rooms.ts (hybrid: Map + Supabase)
import { rooms, createRoom, joinRoom, getRoom, fetchRoom, getPublicRooms, getAllRoomIds, deleteRoom, type SimplePlayer, type GameRoom } from './rooms';

// Import serializeRoomForDB for updating Supabase
// Note: serializeRoomForDB is not exported from rooms.ts, so we'll define it locally
const serializeRoomForDB = (room: GameRoom): any => {
  return {
    id: room.id,
    status: room.status,
    host_id: room.hostId, // CRITICAL: Include host_id in serialization
    players: room.players,
    room_name: room.roomName,
    is_public: room.isPublic,
    turn_duration: room.turnDuration,
    current_player_index: room.currentPlayerIndex,
    current_play_pile: room.currentPlayPile,
    round_history: room.roundHistory,
    last_player_to_play_id: room.lastPlayerToPlayId,
    finished_players: room.finishedPlayers,
    is_first_turn_of_game: room.isFirstTurnOfGame
  };
};

// ============================================================================
// ROOM STORE - Using singleton from rooms.ts
// ============================================================================
// The rooms Map and all room management functions are now imported from rooms.ts
// which provides a true singleton that persists across hot reloads and connections

// All in-house emote trigger codes (excluding premium/remote-only emotes)
const IN_HOUSE_EMOTES = [':smile:', ':blush:', ':cool:', ':annoyed:', ':heart_eyes:', ':money_mouth_face:', ':robot:', ':devil:', ':girly:'];

// Shuffle function for randomizing emote selection
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get a random emote from the shuffled array
const getRandomEmote = (): string => {
  const shuffled = shuffleArray(IN_HOUSE_EMOTES);
  return shuffled[Math.floor(Math.random() * shuffled.length)];
};

// Get a random CPU name that hasn't been used in the room
const getRandomCPUName = (usedNames: Set<string>): string => {
  const availableNames = CPU_NAMES.filter(name => !usedNames.has(name));
  if (availableNames.length === 0) {
    // If all names are used, fallback to adding a number
    const baseName = CPU_NAMES[Math.floor(Math.random() * CPU_NAMES.length)];
    let counter = 1;
    let candidate = `${baseName} ${counter}`;
    while (usedNames.has(candidate)) {
      counter++;
      candidate = `${baseName} ${counter}`;
    }
    return candidate;
  }
  return availableNames[Math.floor(Math.random() * availableNames.length)];
};

// Auto-fill empty slots with CPU players
const autoFillCPUPlayers = (room: GameRoom) => {
  if (room.status !== 'LOBBY' || room.players.length >= 4) return;
  
  const usedNames = new Set(room.players.map(p => p.name));
  const slotsToFill = 4 - room.players.length;
  
  for (let i = 0; i < slotsToFill; i++) {
    const cpuName = getRandomCPUName(usedNames);
    usedNames.add(cpuName);
    const botId = 'bot-' + Math.random().toString(36).substr(2, 9);
    room.players.push({
      id: botId,
      name: cpuName,
      avatar: getRandomEmote(),
      socketId: 'BOT',
      hand: [],
      isHost: false,
      hasPassed: false,
      finishedRank: null,
      isBot: true,
      difficulty: 'MEDIUM'
    });
  }
  
  broadcastState(room.id);
  broadcastPublicLobbies();
};

const BOT_NAMES = ['TSUBU', 'MUNCHIE', 'KUMA', 'VALKYRIE', 'SABER', 'LANCE', 'PHANTOM', 'GHOST', 'REAPER', 'VOID', 'SPECTRE'];
// CPU names from fun_bot_names table (fallback to local array)
const CPU_NAMES = ['Skibidi Shiba', 'Six 7', 'Chill Guy', 'Tragic', 'Bet', 'Fr fr', 'Hyphy', 'Rice Guy', '1v3', 'Hi'];
const RECONNECTION_GRACE_PERIOD = 30000; 
const DEFAULT_TURN_DURATION_MS = 60000; 

// Initialize Supabase client for webhook processing
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase) {
  console.warn('⚠️ Supabase not configured for webhooks. Payment processing will not work.');
}

// RevenueCat webhook secret
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

// Stripe Configuration
// Required Environment Variables:
// - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... for testing, sk_live_... for production)
//   Get from: https://dashboard.stripe.com/apikeys
// - STRIPE_WEBHOOK_SECRET: Your Stripe webhook signing secret (whsec_...)
//   Get from: https://dashboard.stripe.com/webhooks (after creating webhook endpoint)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
  "https://playthirteen.app",
  "https://thirteen-cards.vercel.app",
  "http://localhost:5173"
];

// If FRONTEND_URL env var is set, add it to the list (for backwards compatibility)
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ============================================================================
// STRIPE WEBHOOK ROUTE - MUST BE ABOVE express.json() middleware
// ============================================================================
// This route MUST be defined BEFORE app.use(express.json()) to preserve
// the raw request body as a Buffer for Stripe signature verification.
// If express.json() processes the body first, it will be parsed as a JS object
// and Stripe signature verification will fail.
/**
 * Stripe Webhook Endpoint
 * 
 * IMPORTANT: This route MUST use express.raw() to preserve the raw body
 * for Stripe signature verification. Do NOT use express.json() here.
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 *   Equivalent to: const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
 * - STRIPE_WEBHOOK_SECRET: Your Stripe webhook signing secret (whsec_...)
 * 
 * Configure in Stripe Dashboard:
 * 1. Go to Developers > Webhooks
 * 2. Add endpoint: https://your-render-app.onrender.com/api/webhooks/stripe
 * 3. Select event: checkout.session.completed
 * 4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET
 */
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    
    const sig = req.headers['stripe-signature'] as string;
    const rawBody = req.body as Buffer; // req.body is now a Buffer, not a parsed object
    
    if (!sig) {
      console.error('❌ Missing Stripe signature header');
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }
    
    if (!rawBody || rawBody.length === 0) {
      console.error('❌ Empty request body');
      return res.status(400).json({ error: 'Empty request body' });
    }
    
    return await handleStripeWebhook(rawBody, sig, res);
  } catch (error: any) {
    console.error('❌ Stripe webhook endpoint error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ============================================================================
// GENERAL MIDDLEWARE - Applied to all routes AFTER webhook routes
// ============================================================================
app.use(express.json()); // Parse JSON bodies for all other routes

// ============================================================================
// SOCKET.IO SERVER - Created EXACTLY ONCE at module load
// ============================================================================
// Guard: Prevent multiple Server instances
if (globalThis.__SOCKET_IO_SERVER__) {
  console.error('❌ CRITICAL: Socket.IO Server already exists! Multiple instances detected.');
  throw new Error('Socket.IO Server can only be created once');
}

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store reference to prevent duplicate creation
globalThis.__SOCKET_IO_SERVER__ = io;

// Guard: Prevent handler double-registration
// Global declarations are now at the top of the file (line 92)

if (globalThis.__SOCKET_HANDLERS_REGISTERED__) {
  console.error('❌ CRITICAL: Socket handlers already registered! Multiple registrations detected.');
  throw new Error('Socket handlers can only be registered once');
}
console.log('✅ Socket.IO Server created (PID:', process.pid, ')');

// ============================================================================
// ROOM STORE - Using Supabase from rooms.ts
// ============================================================================
// Room management functions are imported from rooms.ts which uses Supabase
// as the persistent storage layer instead of in-memory Maps
console.log('📦 Room functions imported from rooms.ts (Supabase-backed)');

// --- Logic Helpers ---

const getCardScore = (card: Card): number => card.rank * 10 + card.suit;
const sortCards = (cards: Card[]): Card[] => [...cards].sort((a, b) => getCardScore(a) - getCardScore(b));
const getHighestCard = (cards: Card[]): Card => {
  const sorted = sortCards(cards);
  return sorted[sorted.length - 1];
};

const getComboType = (cards: Card[]): string => {
  const sorted = sortCards(cards);
  const len = sorted.length;
  if (len === 0) return 'INVALID';
  if (len === 1) return 'SINGLE';
  const isSameRank = sorted.every(c => c.rank === sorted[0].rank);
  if (isSameRank) {
    if (len === 2) return 'PAIR';
    if (len === 3) return 'TRIPLE';
    if (len === 4) return 'QUAD';
  }
  let isRun = true;
  for (let i = 0; i < len - 1; i++) {
    if (sorted[i].rank === Rank.Two || sorted[i+1].rank === Rank.Two || sorted[i+1].rank !== sorted[i].rank + 1) {
      isRun = false; break;
    }
  }
  if (isRun && len >= 3) return 'RUN';
  if (len === 6) {
    const is3Pairs = sorted[0].rank === sorted[1].rank && sorted[2].rank === sorted[3].rank && sorted[4].rank === sorted[5].rank && 
                     sorted[2].rank === sorted[0].rank + 1 && sorted[4].rank === sorted[2].rank + 1 && sorted[5].rank !== Rank.Two;
    if (is3Pairs) return 'BOMB';
  }
  if (len === 8) {
    const is4Pairs = sorted[0].rank === sorted[1].rank && sorted[2].rank === sorted[3].rank && sorted[4].rank === sorted[5].rank && sorted[6].rank === sorted[7].rank &&
                     sorted[2].rank === sorted[0].rank + 1 && sorted[4].rank === sorted[2].rank + 1 && sorted[6].rank === sorted[4].rank + 1 && sorted[7].rank !== Rank.Two;
    if (is4Pairs) return '4_PAIRS';
  }
  return 'INVALID';
};

const validateMove = (playedCards: Card[], playPile: PlayTurn[], isFirstTurn: boolean): { isValid: boolean; reason: string } => {
  const pType = getComboType(playedCards);
  if (pType === 'INVALID') return { isValid: false, reason: 'Invalid combo.' };
  if (isFirstTurn && playPile.length === 0) {
    if (!playedCards.some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) {
      return { isValid: false, reason: 'Must start with 3♠.' };
    }
  }
  if (playPile.length === 0) return { isValid: true, reason: 'Lead' };
  const lastTurn = playPile[playPile.length - 1];
  const lastCards = lastTurn.cards;
  const lType = getComboType(lastCards);
  const pHigh = getHighestCard(playedCards);
  const lHigh = getHighestCard(lastCards);
  
  if (lType === 'SINGLE' && lHigh.rank === Rank.Two && ['QUAD', 'BOMB', '4_PAIRS'].includes(pType)) return { isValid: true, reason: 'Chop!' };
  if (lType === 'PAIR' && lHigh.rank === Rank.Two && ['QUAD', '4_PAIRS'].includes(pType)) return { isValid: true, reason: 'Chop!' };
  if (lType === 'QUAD' && pType === 'QUAD' && getCardScore(pHigh) > getCardScore(lHigh)) return { isValid: true, reason: 'Chop!' };
  if (lType === 'BOMB' && pType === 'BOMB' && getCardScore(pHigh) > getCardScore(lHigh)) return { isValid: true, reason: 'Chop!' };
  if (lType === '4_PAIRS' && pType === '4_PAIRS' && getCardScore(pHigh) > getCardScore(lHigh)) return { isValid: true, reason: 'Chop!' };
  if (pType === '4_PAIRS' && (lType === 'BOMB' || lType === 'QUAD')) return { isValid: true, reason: 'Mega Bomb!' };
  
  if (pType !== lType || playedCards.length !== lastCards.length) return { isValid: false, reason: 'Combo mismatch.' };
  return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Beat.' } : { isValid: false, reason: 'Too low.' };
};

const getNextActivePlayerIndex = (room: GameRoom, startIndex: number, ignorePass: boolean = false): number => {
  if (room.players.length === 0) return 0;
  for (let i = 1; i <= room.players.length; i++) {
    const idx = (startIndex + i) % room.players.length;
    const p = room.players[idx];
    if (p.finishedRank) continue; 
    if (!ignorePass && p.hasPassed) continue; 
    return idx;
  }
  return startIndex; 
};

const resetRound = (room: GameRoom) => {
  if (room.currentPlayPile.length > 0) room.roundHistory.push([...room.currentPlayPile]);
  room.currentPlayPile = [];
  room.players.forEach(p => p.hasPassed = false);
  room.lastPlayerToPlayId = null;
};

// --- AI LOGIC (Full Restore) ---

const getAllPairs = (hand: Card[]) => {
  const pairs: Card[][] = [];
  const sorted = sortCards(hand);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].rank === sorted[i+1].rank) {
      pairs.push([sorted[i], sorted[i+1]]);
      i++; 
    }
  }
  return pairs;
};

const getAllTriples = (hand: Card[]) => {
  const triples: Card[][] = [];
  const sorted = sortCards(hand);
  for (let i = 0; i < sorted.length - 2; i++) {
    if (sorted[i].rank === sorted[i+1].rank && sorted[i].rank === sorted[i+2].rank) {
      triples.push([sorted[i], sorted[i+1], sorted[i+2]]);
      i += 2;
    }
  }
  return triples;
};

const getAllQuads = (hand: Card[]) => {
  const quads: Card[][] = [];
  const sorted = sortCards(hand);
  for (let i = 0; i < sorted.length - 3; i++) {
    if (sorted[i].rank === sorted[i+1].rank && sorted[i].rank === sorted[i+2].rank && sorted[i].rank === sorted[i+3].rank) {
      quads.push(sorted.slice(i, i + 4));
      i += 3;
    }
  }
  return quads;
};

const findBestMove = (hand: Card[], playPile: PlayTurn[], isFirstTurn: boolean): Card[] | null => {
  const sorted = sortCards(hand);
  if (playPile.length === 0) {
    if (isFirstTurn) {
        const threeS = sorted.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
        return threeS ? [threeS] : [sorted[0]];
    }
    const triples = getAllTriples(sorted);
    if (triples.length > 0) return triples[0];
    const pairs = getAllPairs(sorted);
    if (pairs.length > 0) return pairs[0];
    return [sorted[0]];
  }
  
  const lastTurn = playPile[playPile.length - 1];
  const lastCards = lastTurn.cards;
  const lType = getComboType(lastCards);
  const lHigh = getHighestCard(lastCards);
  
  if (lType === 'SINGLE') {
    const match = sorted.find(c => getCardScore(c) > getCardScore(lHigh));
    if (match) return [match];
  } else if (lType === 'PAIR') {
    const pairs = getAllPairs(sorted);
    const match = pairs.find(p => getCardScore(getHighestCard(p)) > getCardScore(lHigh));
    if (match) return match;
  } else if (lType === 'TRIPLE') {
    const triples = getAllTriples(sorted);
    const match = triples.find(t => getCardScore(getHighestCard(t)) > getCardScore(lHigh));
    if (match) return match;
  } else if (lType === 'RUN') {
    const targetLen = lastCards.length;
    for (let i = 0; i <= sorted.length - targetLen; i++) {
        const candidate = sorted.slice(i, i + targetLen);
        if (getComboType(candidate) === 'RUN' && getCardScore(getHighestCard(candidate)) > getCardScore(lHigh)) return candidate;
    }
  }
  
  // Special: Chops
  if (lHigh.rank === Rank.Two) {
      const quads = getAllQuads(sorted);
      if (quads.length > 0) return quads[0];
  }
  
  return null;
};

// --- Game Logic ---

const getGameStateData = (room: GameRoom) => ({
  roomId: room.id,
  status: room.status,
  hostId: room.hostId,
  isPublic: room.isPublic,
  roomName: room.roomName,
  turnDuration: Math.floor(room.turnDuration / 1000),
  players: room.players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    cardCount: p.hand.length,
    isHost: p.isHost,
    hasPassed: p.hasPassed,
    finishedRank: p.finishedRank,
    isBot: p.isBot,
    difficulty: p.difficulty,
    isOffline: p.isOffline,
    isAfk: p.isAfk || false,
    mutedByAfk: room.playerMutedByAfk ? room.playerMutedByAfk.has(p.id) : false,
    selected_sleeve_id: p.selected_sleeve_id
  })),
  currentPlayerId: room.status === 'PLAYING' ? room.players[room.currentPlayerIndex]?.id : null,
  currentPlayPile: room.currentPlayPile,
  roundHistory: room.roundHistory,
  lastPlayerToPlayId: room.lastPlayerToPlayId,
  finishedPlayers: room.finishedPlayers,
  isFirstTurnOfGame: room.isFirstTurnOfGame,
  turnEndTime: room.turnEndTime,
  // Include speed bonuses when game is finished
  speedBonuses: room.status === 'FINISHED' && room.playerSpeedData ? 
    Object.entries(room.playerSpeedData).reduce((acc, [playerId, data]) => {
      acc[playerId] = { gold: data.totalSpeedGold, xp: data.totalSpeedXp };
      return acc;
    }, {} as Record<string, { gold: number; xp: number }>) : undefined
});

const broadcastState = async (roomId: string) => {
  // First check local Map (fast path)
  let room = rooms.get(roomId);
  
  // If not in Map, try to fetch from Supabase and rehydrate
  if (!room) {
    room = await fetchRoom(roomId);
    if (!room) {
      console.error('❌ broadcastState: Room not found', { roomId });
      return;
    }
  }
  
  const state = getGameStateData(room);
  
  // CRITICAL: Broadcast to ALL players in the room using io.to(roomId)
  // This ensures both host and non-host players receive the update
  const sockets = await io.in(roomId).fetchSockets();
  console.log(`📡 broadcastState: Broadcasting to room ${roomId}`, {
    status: state.status,
    playerCount: state.players?.length,
    connectedSockets: sockets.length,
    roomStatus: room.status
  });
  
  // Emit to all sockets in the room
  io.to(roomId).emit('game_state', state);
  io.to(roomId).emit('room_update', state); // Also emit room_update for compatibility
  
  // Send player hands individually to each player
  // Use socketToPlayerId mapping to find the correct socket for each player
  // This is more reliable than using p.socketId which might be stale
  for (const socket of sockets) {
    const playerId = socketToPlayerId[socket.id];
    if (playerId) {
      const player = room.players.find(p => p.id === playerId);
      if (player && !player.isBot && !player.isOffline && player.hand) {
        console.log(`📤 Sending player_hand to ${player.name} (${playerId}): ${player.hand.length} cards`);
        socket.emit('player_hand', player.hand);
      }
    }
  }
  
  // Also update socketId in player objects for future reference
  for (const socket of sockets) {
    const playerId = socketToPlayerId[socket.id];
    if (playerId) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.socketId = socket.id;
      }
    }
  }
};

const getPublicRoomsList = async (): Promise<Array<{ id: string; name: string; playerCount: number; turnTimer: number; hostName: string; hostAvatar: string }>> => {
  try {
    // Use the getPublicRooms function for consistency
    const publicRooms = await getPublicRooms();
    
    // CRITICAL: Ensure publicRooms is an array - explicit conversion
    let safePublicRooms: Array<any> = [];
    if (Array.isArray(publicRooms)) {
      safePublicRooms = publicRooms;
    } else if (publicRooms && typeof publicRooms === 'object') {
      // If it's an object (not array), try to convert it
      const publicRoomsAny = publicRooms as any;
      if (publicRoomsAny instanceof Map) {
        safePublicRooms = Array.from(publicRoomsAny.values());
      } else if (publicRoomsAny.constructor === Object) {
        // Plain object - convert to array
        safePublicRooms = Object.values(publicRoomsAny);
      } else {
        console.error('❌ getPublicRoomsList: getPublicRooms returned non-array object:', typeof publicRooms, publicRooms);
        return [];
      }
    } else {
      // null, undefined, or other - return empty array
      console.error('❌ getPublicRoomsList: getPublicRooms returned non-array:', typeof publicRooms, publicRooms);
      return [];
    }
    
    // Deduplicate by room ID before enhancing
    const uniqueRooms = Array.from(
      new Map(safePublicRooms.map(room => [room.id, room])).values()
    );
    console.log(`📋 getPublicRoomsList: ${safePublicRooms.length} rooms before dedup, ${uniqueRooms.length} after`);
    
    // Enhance with host information for compatibility
    const enhancedRooms = await Promise.all(uniqueRooms.map(async (room) => {
      try {
        const fullRoom = await fetchRoom(room.id);
        return {
          id: room.id,
          name: room.name,
          playerCount: room.playerCount,
          turnTimer: room.turnTimer,
          hostName: fullRoom?.players.find(p => p.isHost)?.name || 'Unknown',
          hostAvatar: fullRoom?.players.find(p => p.isHost)?.avatar || ':smile:'
        };
      } catch (error) {
        console.error(`❌ getPublicRoomsList: Error fetching room ${room.id}:`, error);
        // Return room without host info if fetch fails
        return {
          id: room.id,
          name: room.name,
          playerCount: room.playerCount,
          turnTimer: room.turnTimer,
          hostName: 'Unknown',
          hostAvatar: ':smile:'
        };
      }
    }));
    
    // Final deduplication pass on enhanced rooms
    const finalRooms = Array.from(
      new Map(enhancedRooms.map(room => [room.id, room])).values()
    );
    console.log(`📋 getPublicRoomsList: Returning ${finalRooms.length} unique enhanced rooms`);
    console.log("📋 Broadcasting Rooms:", finalRooms.length);
    
    // CRITICAL: Ensure we always return an array, even if empty
    return Array.isArray(finalRooms) ? finalRooms : [];
  } catch (error) {
    console.error('❌ getPublicRoomsList: Error:', error);
    return []; // Always return an array, even on error
  }
};

const broadcastPublicLobbies = async () => {
  const roomsList = await getPublicRoomsList();
  // CRITICAL: Ensure roomsList is always an array before broadcasting
  // Explicitly convert to array - handle null, undefined, objects, Maps, etc.
  let safeRoomsList: Array<any> = [];
  if (Array.isArray(roomsList)) {
    safeRoomsList = roomsList;
  } else if (roomsList && typeof roomsList === 'object') {
    const roomsListAny = roomsList as any;
    if (roomsListAny instanceof Map) {
      safeRoomsList = Array.from(roomsListAny.values());
    } else if (roomsListAny.constructor === Object) {
      safeRoomsList = Object.values(roomsListAny);
    } else {
      console.error('❌ broadcastPublicLobbies: roomsList is an object but not a Map or plain object:', roomsList);
      safeRoomsList = [];
    }
  } else {
    console.warn('❌ broadcastPublicLobbies: roomsList is not an array:', typeof roomsList, roomsList);
    safeRoomsList = [];
  }
  
  // Final check
  if (!Array.isArray(safeRoomsList)) {
    console.error('❌ broadcastPublicLobbies: safeRoomsList is still not an array after conversion!');
    safeRoomsList = [];
  }
  
  console.log("📋 Broadcasting Rooms:", safeRoomsList.length);
  console.log("📋 Broadcasting Rooms Type:", Array.isArray(safeRoomsList) ? 'Array' : typeof safeRoomsList);
  io.emit('public_rooms_list', safeRoomsList);
};

const startTurnTimer = async (roomId: string) => {
  // Check local Map first (fast path)
  let room = rooms.get(roomId);
  if (!room) {
    // Try to rehydrate from Supabase
    room = await fetchRoom(roomId);
  if (!room || room.status !== 'PLAYING') return;
  } else if (room.status !== 'PLAYING') {
    return;
  }
  if (room.turnTimer) clearTimeout(room.turnTimer);
  
  // Track when turn starts for quick move detection
  room.turnStartTime = Date.now();
  
  if (room.turnDuration === 0) {
    room.turnEndTime = undefined;
    return;
  }

  room.turnEndTime = Date.now() + room.turnDuration;
  room.turnTimer = setTimeout(() => { handleTurnTimeout(roomId); }, room.turnDuration);
};

const handleTurnTimeout = async (roomId: string) => {
  // Check local Map first (fast path)
  let room = rooms.get(roomId);
  if (!room) {
    // Try to rehydrate from Supabase
    room = await fetchRoom(roomId);
  if (!room || room.status !== 'PLAYING') return;
  } else if (room.status !== 'PLAYING') {
    return;
  }
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.finishedRank || currentPlayer.isBot) {
    room.currentPlayerIndex = getNextActivePlayerIndex(room, room.currentPlayerIndex, true);
    await startTurnTimer(roomId);
    await broadcastState(roomId);
    return;
  }
  
  // Track consecutive timeouts for AFK penalty
  if (!currentPlayer.consecutiveTimeouts) {
    currentPlayer.consecutiveTimeouts = 0;
  }
  currentPlayer.consecutiveTimeouts += 1;
  
  // AFK Penalty: 3 consecutive timeouts = mute + flag as AFK
  if (currentPlayer.consecutiveTimeouts >= 3) {
    currentPlayer.isAfk = true;
    if (!room.playerMutedByAfk) {
      room.playerMutedByAfk = new Set();
    }
    room.playerMutedByAfk.add(currentPlayer.id);
  }
  
  if (room.currentPlayPile.length === 0) {
    const sortedHand = sortCards(currentPlayer.hand);
    let cardToPlay = [sortedHand[0]];
    if (room.isFirstTurnOfGame) {
      const threeSpades = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
      if (threeSpades) cardToPlay = [threeSpades];
    }
    await handlePlay(roomId, currentPlayer.id, cardToPlay);
  } else {
    await handlePass(roomId, currentPlayer.id);
  }
};

const handlePlay = async (roomId: string, playerId: string, cards: Card[]) => {
  // Check local Map first (fast path)
  let room = rooms.get(roomId);
  if (!room) {
    // Try to rehydrate from Supabase
    room = await fetchRoom(roomId);
  if (!room) return;
  }
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId || currentPlayer.finishedRank) {
    return;
  }
  
  // SECURITY: Validate card ownership - ensure all cards exist in player's hand
  if (!cards || cards.length === 0) {
    if (!currentPlayer.isBot && currentPlayer.socketId) io.to(currentPlayer.socketId).emit('error', 'No cards provided.');
    return;
  }
  
  // Verify all cards are in the player's hand
  const handCardIds = new Set(currentPlayer.hand.map(c => c.id));
  const invalidCards = cards.filter(c => !handCardIds.has(c.id));
  if (invalidCards.length > 0) {
    if (!currentPlayer.isBot && currentPlayer.socketId) io.to(currentPlayer.socketId).emit('error', 'Invalid cards: you do not own these cards.');
    return;
  }
  
  // Verify no duplicate cards
  const cardIdSet = new Set(cards.map(c => c.id));
  if (cardIdSet.size !== cards.length) {
    if (!currentPlayer.isBot && currentPlayer.socketId) io.to(currentPlayer.socketId).emit('error', 'Duplicate cards detected.');
    return;
  }
  
  const sortedCards = sortCards(cards); // Ensure cards are sorted before further processing
  const validation = validateMove(sortedCards, room.currentPlayPile, room.isFirstTurnOfGame);
  if (!validation.isValid) {
    if (!currentPlayer.isBot && currentPlayer.socketId) io.to(currentPlayer.socketId).emit('error', validation.reason);
    return;
  }
  
  // Quick Move Detection (only for non-bot players, not skip turn spam)
  // Cap: Only give quick move reward once per game per player for online games
  let quickMoveReward: { gold: number; xp: number; isStreak: boolean } | null = null;
  if (!currentPlayer.isBot && room.turnStartTime) {
    const timeTaken = Date.now() - room.turnStartTime;
    const QUICK_MOVE_THRESHOLD = 5000; // 5 seconds
    
    if (timeTaken < QUICK_MOVE_THRESHOLD) {
      // Initialize speed data if needed
      if (!room.playerSpeedData) room.playerSpeedData = {};
      if (!room.playerSpeedData[playerId]) {
        room.playerSpeedData[playerId] = { quickMoveStreak: 0, totalSpeedGold: 0, totalSpeedXp: 0 };
      }
      
      // Initialize quick move reward tracking if needed
      if (!room.quickMoveRewardGiven) {
        room.quickMoveRewardGiven = new Set();
      }
      
      // Check if player has already received a quick move reward this game
      const hasReceivedReward = room.quickMoveRewardGiven.has(playerId);
      
      if (!hasReceivedReward) {
        const speedData = room.playerSpeedData[playerId];
        speedData.quickMoveStreak += 1;
        
        // Base rewards
        let goldReward = 10;
        let xpReward = 20;
        let isStreak = false;
        
        // Streak bonus: 3 quick moves in a row = double gold
        if (speedData.quickMoveStreak >= 3) {
          goldReward *= 2; // Double gold for streak
          isStreak = true;
        }
        
        speedData.totalSpeedGold += goldReward;
        speedData.totalSpeedXp += xpReward;
        
        quickMoveReward = { gold: goldReward, xp: xpReward, isStreak };
        
        // Mark that this player has received the reward
        room.quickMoveRewardGiven.add(playerId);
        
        // Emit quick move event to client
        if (currentPlayer.socketId) {
          io.to(currentPlayer.socketId).emit('quick_move_reward', { gold: goldReward, xp: xpReward, isStreak });
        }
      } else {
        // Still track streak for stats, but don't give reward
        const speedData = room.playerSpeedData[playerId];
        speedData.quickMoveStreak += 1;
      }
    } else {
      // Reset streak if move was not quick
      if (room.playerSpeedData && room.playerSpeedData[playerId]) {
        room.playerSpeedData[playerId].quickMoveStreak = 0;
      }
    }
  }
  
  if (room.turnTimer) clearTimeout(room.turnTimer);
  
  // Reset consecutive timeouts when player successfully plays
  if (currentPlayer.consecutiveTimeouts) {
    currentPlayer.consecutiveTimeouts = 0;
  }
  
  currentPlayer.hand = currentPlayer.hand.filter(c => !sortedCards.some(pc => pc.id === c.id));
  room.currentPlayPile.push({ playerId, cards: sortedCards, comboType: getComboType(sortedCards) });
  room.lastPlayerToPlayId = playerId;
  room.isFirstTurnOfGame = false;
  
  if (currentPlayer.hand.length === 0) {
    if (!room.finishedPlayers.includes(playerId)) {
      room.finishedPlayers.push(playerId);
      currentPlayer.finishedRank = room.finishedPlayers.length;
    }
    const remainingPlayers = room.players.filter(p => !p.finishedRank);
    if (remainingPlayers.length <= 1) {
        if (remainingPlayers.length === 1) {
          const loser = remainingPlayers[0];
          room.finishedPlayers.push(loser.id);
          loser.finishedRank = room.finishedPlayers.length;
        }
        room.status = 'FINISHED';
        resetRound(room);
        await broadcastState(roomId);
        
        // Schedule room deletion 30 seconds after game ends
        setTimeout(async () => {
          console.log(`🧹 Cleaning up finished game room: ${roomId}`);
          await deleteRoom(roomId);
          broadcastPublicLobbies();
        }, 30000); // 30 seconds
        
        return;
    }
  }

  // PROGRESS TURN
  const activeRemainingInRound = room.players.filter(p => !p.finishedRank && !p.hasPassed && p.id !== playerId);
  if (activeRemainingInRound.length === 0) {
     resetRound(room);
     // Round winner starts new round. If winner finished, next active person starts.
     let nextIdx = room.players.indexOf(currentPlayer);
     if (currentPlayer.finishedRank) {
        nextIdx = getNextActivePlayerIndex(room, nextIdx, true);
     }
     room.currentPlayerIndex = nextIdx;
  } else {
     room.currentPlayerIndex = getNextActivePlayerIndex(room, room.currentPlayerIndex);
  }
  
  await startTurnTimer(roomId);
  await broadcastState(roomId);
  await checkBotTurn(roomId);
};

const handlePass = async (roomId: string, playerId: string) => {
  // Check local Map first (fast path)
  let room = rooms.get(roomId);
  if (!room) {
    // Try to rehydrate from Supabase
    room = await fetchRoom(roomId);
  if (!room) return;
  }
  const currentPlayer = room.players[room.currentPlayerIndex];
  
  if (!currentPlayer || currentPlayer.id !== playerId) return;
  
  if (room.currentPlayPile.length === 0) {
    if (!currentPlayer.isBot && currentPlayer.socketId) io.to(currentPlayer.socketId).emit('error', 'Cannot pass leading move.');
    return;
  }

  // Reset consecutive timeouts when player successfully passes
  if (currentPlayer.consecutiveTimeouts) {
    currentPlayer.consecutiveTimeouts = 0;
  }

  // Reset quick move streak on pass (passing doesn't count as quick move)
  if (!currentPlayer.isBot && room.playerSpeedData && room.playerSpeedData[playerId]) {
    room.playerSpeedData[playerId].quickMoveStreak = 0;
  }

  if (room.turnTimer) clearTimeout(room.turnTimer);
  currentPlayer.hasPassed = true;
  
  // Who is still active in the round?
  const activeInRound = room.players.filter(p => !p.finishedRank && !p.hasPassed);
  let nextIdx = getNextActivePlayerIndex(room, room.currentPlayerIndex);
  
  if (activeInRound.length === 0) {
      // Unlikely, but reset if everyone is out
      resetRound(room);
      nextIdx = getNextActivePlayerIndex(room, room.currentPlayerIndex, true);
  } else if (activeInRound.length === 1 && activeInRound[0].id === room.lastPlayerToPlayId) {
    // Round reset: Only the king remains
    resetRound(room);
    nextIdx = room.players.indexOf(activeInRound[0]);
  } else if (room.players[nextIdx].id === room.lastPlayerToPlayId) {
    // If we land on the king but others have passed
    resetRound(room);
    if (room.players[nextIdx].finishedRank) {
        nextIdx = getNextActivePlayerIndex(room, nextIdx, true);
    }
  }
  
  room.currentPlayerIndex = nextIdx;
  await startTurnTimer(roomId);
  await broadcastState(roomId);
  await checkBotTurn(roomId);
};

const checkBotTurn = async (roomId: string) => {
  // Check local Map first (fast path)
  let room = rooms.get(roomId);
  if (!room) {
    // Try to rehydrate from Supabase
    room = await fetchRoom(roomId);
  if (!room || room.status !== 'PLAYING') {
    console.log('⚠️ checkBotTurn: Room not found or not PLAYING', { roomId, status: room?.status });
    return;
  }
  } else if (room.status !== 'PLAYING') {
    console.log('⚠️ checkBotTurn: Room not in PLAYING status', { roomId, status: room.status });
    return;
  }
  
  const curPlayer = room.players[room.currentPlayerIndex];
  console.log('🤖 checkBotTurn: Checking current player', { 
    roomId, 
    currentPlayerIndex: room.currentPlayerIndex,
    playerName: curPlayer?.name,
    isBot: curPlayer?.isBot,
    finishedRank: curPlayer?.finishedRank,
    handSize: curPlayer?.hand?.length,
    isFirstTurnOfGame: room.isFirstTurnOfGame
  });
  
  if (curPlayer?.isBot && !curPlayer.finishedRank) {
    // Random delay between 2-4 seconds
    const delay = 2000 + Math.random() * 2000;
    console.log(`🤖 checkBotTurn: Bot ${curPlayer.name} will play in ${Math.round(delay)}ms`);
    
    setTimeout(() => {
        const roomRef = rooms.get(roomId);
        if (!roomRef) {
          console.error('❌ checkBotTurn: Room not found in setTimeout callback', { roomId });
          return;
        }
        if (roomRef.status !== 'PLAYING') {
          console.log('⚠️ checkBotTurn: Room no longer in PLAYING status', { roomId, status: roomRef.status });
          return;
        }
        if (roomRef.currentPlayerIndex !== room.currentPlayerIndex) {
          console.log('⚠️ checkBotTurn: Current player index changed', { 
            roomId, 
            originalIndex: room.currentPlayerIndex, 
            currentIndex: roomRef.currentPlayerIndex 
          });
          return;
        }
        
        const currentBot = roomRef.players[roomRef.currentPlayerIndex];
        if (!currentBot || !currentBot.isBot || currentBot.finishedRank) {
          console.log('⚠️ checkBotTurn: Current player is no longer a bot or finished', { 
            roomId,
            isBot: currentBot?.isBot,
            finishedRank: currentBot?.finishedRank
          });
          return;
        }
        
        // Weighted random: 80% smart move, 20% mistake
        const shouldMakeMistake = Math.random() < 0.2;
        
        let move: Card[] | null = null;
        if (shouldMakeMistake) {
          // 20% chance: Make a mistake (play a random card or suboptimal move)
          const sortedHand = sortCards(currentBot.hand);
          if (roomRef.currentPlayPile.length === 0) {
            // Leading: play a random card (might not be optimal)
            // But if it's first turn, must play 3♠
            if (roomRef.isFirstTurnOfGame) {
              const threeSpades = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
              move = threeSpades ? [threeSpades] : [sortedHand[Math.floor(Math.random() * sortedHand.length)]];
            } else {
            move = [sortedHand[Math.floor(Math.random() * sortedHand.length)]];
            }
          } else {
            // Try to find a valid move, but pick a random one instead of best
            const lastTurn = roomRef.currentPlayPile[roomRef.currentPlayPile.length - 1];
            const lastCards = lastTurn.cards;
            const lType = getComboType(lastCards);
            const lHigh = getHighestCard(lastCards);
            
            // Try random valid moves
            const shuffled = [...sortedHand].sort(() => Math.random() - 0.5);
            for (const card of shuffled) {
              if (lType === 'SINGLE') {
                if (getCardScore(card) > getCardScore(lHigh)) {
                  move = [card];
                  break;
                }
              } else if (lType === 'PAIR') {
                const pairs = getAllPairs(sortedHand);
                if (pairs.length > 0) {
                  const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
                  if (getCardScore(getHighestCard(randomPair)) > getCardScore(lHigh)) {
                    move = randomPair;
                    break;
                  }
                }
              } else if (lType === 'TRIPLE') {
                const triples = getAllTriples(sortedHand);
                if (triples.length > 0) {
                  const randomTriple = triples[Math.floor(Math.random() * triples.length)];
                  if (getCardScore(getHighestCard(randomTriple)) > getCardScore(lHigh)) {
                    move = randomTriple;
                    break;
                  }
                }
              }
            }
          }
        } else {
          // 80% chance: Make a smart move
          move = findBestMove(currentBot.hand, roomRef.currentPlayPile, roomRef.isFirstTurnOfGame);
        }
        
        if (move) {
          console.log(`🤖 checkBotTurn: Bot ${currentBot.name} playing move`, { 
            moveLength: move.length, 
            isFirstTurn: roomRef.isFirstTurnOfGame,
            playPileLength: roomRef.currentPlayPile.length,
            cards: move.map(c => `${c.rank}-${c.suit}`)
          });
          handlePlay(roomId, currentBot.id, move);
        } else {
          if (roomRef.currentPlayPile.length === 0) {
            // Hard Fail-safe: leader must play (especially on first turn with 3♠)
            const sortedHand = sortCards(currentBot.hand);
            let cardToPlay = sortedHand[0];
            
            // If it's the first turn, try to find 3♠
            if (roomRef.isFirstTurnOfGame) {
              const threeSpades = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
              if (threeSpades) {
                cardToPlay = threeSpades;
                console.log(`🤖 checkBotTurn: Bot ${currentBot.name} playing 3♠ (first turn requirement)`);
          } else {
                console.log(`⚠️ checkBotTurn: Bot ${currentBot.name} doesn't have 3♠ but is starting - playing lowest card`);
              }
            }
            console.log(`🤖 checkBotTurn: Bot ${currentBot.name} playing fallback card (no move found)`, { 
              card: `${cardToPlay.rank}-${cardToPlay.suit}`,
              isFirstTurn: roomRef.isFirstTurnOfGame
            });
            handlePlay(roomId, currentBot.id, [cardToPlay]);
          } else {
            console.log(`🤖 checkBotTurn: Bot ${currentBot.name} passing (no valid move)`);
            handlePass(roomId, currentBot.id);
          }
        }
    }, delay);
  }
};

const performCleanup = async (roomId: string, playerId: string) => {
  // Check local Map first (fast path)
  let room = rooms.get(roomId);
  if (!room) {
    // Try to rehydrate from Supabase
    room = await fetchRoom(roomId);
  if (!room) return;
  }
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;
  const wasHost = room.players[playerIndex].isHost;
  
  if (room.status === 'PLAYING') {
    if (room.lastPlayerToPlayId === playerId) resetRound(room);
    if (room.currentPlayerIndex === playerIndex) {
       if (room.turnTimer) clearTimeout(room.turnTimer);
    } else if (room.currentPlayerIndex > playerIndex) {
       room.currentPlayerIndex--;
    }
  }

  room.players.splice(playerIndex, 1);
  
  if (room.status === 'PLAYING') {
    if (room.players.length > 0) {
      room.currentPlayerIndex %= room.players.length;
      if (room.isFirstTurnOfGame && !room.players.some(p => p.hand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades))) {
        room.isFirstTurnOfGame = false;
      }
      if (room.players[room.currentPlayerIndex].finishedRank) {
        room.currentPlayerIndex = getNextActivePlayerIndex(room, room.currentPlayerIndex, true);
      }
      startTurnTimer(roomId);
    }
  }

  const humans = room.players.filter(p => !p.isBot);
  if (humans.length === 0) {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    
    // For LOBBY rooms, give a grace period before deletion
    // This prevents rooms from being deleted immediately after creation
    if (room.status === 'LOBBY') {
      // Schedule deletion after 30 seconds
      setTimeout(async () => {
        const finalRoom = await fetchRoom(roomId);
        if (finalRoom) {
          const finalHumans = finalRoom.players.filter(p => !p.isBot);
          if (finalHumans.length === 0 && finalRoom.status === 'LOBBY') {
            console.log(`🧹 Cleaning up empty LOBBY room from performCleanup: ${roomId}`);
            await deleteRoom(roomId);
            broadcastPublicLobbies();
          }
        }
      }, 30000); // 30 second grace period
      return;
    }
    
    // For non-LOBBY rooms (PLAYING, FINISHED), delete immediately
    // Use deleteRoom to remove from both memory and Supabase
    await deleteRoom(roomId);
    broadcastPublicLobbies();
    return;
  }
  if (wasHost) humans[0].isHost = true;
  broadcastState(roomId);
  broadcastPublicLobbies();
};

const mapIdentity = (socket: Socket, roomId: string, playerId: string) => {
  socketToRoom[socket.id] = roomId;
  socketToPlayerId[socket.id] = playerId;
};

// ============================================================================
// SOCKET HANDLERS - Registered exactly once at module load
// ============================================================================
// Guard: Prevent double registration
if (globalThis.__SOCKET_HANDLERS_REGISTERED__) {
  console.error('❌ CRITICAL: Socket handlers already registered! Skipping duplicate registration.');
  throw new Error('Socket handlers can only be registered once');
}

console.log('📡 Registering socket handlers...');

// Mark handlers as registered BEFORE registering to prevent race conditions
globalThis.__SOCKET_HANDLERS_REGISTERED__ = true;

io.on('connection', (socket: Socket) => {
  console.log('🚀 SOCKET CONNECTED:', socket.id);
  
  // ============================================================================
  // ROOM MANAGEMENT - Using Supabase
  // ============================================================================
  // All room operations now use Supabase as the source of truth via rooms.ts
  // No in-memory Map is used - all data is persisted in the database
  
  // Catch-All logger to see ALL events
  socket.onAny((event, ...args) => {
    console.log(`📡 RECEIVED EVENT: ${event}`, args);
  });

  // Send initial public rooms list automatically on connection
  getPublicRoomsList().then(roomsList => {
    // CRITICAL: Ensure roomsList is always an array before emitting
    // Explicitly convert to array - handle null, undefined, objects, Maps, etc.
    let safeRoomsList: Array<any> = [];
    if (Array.isArray(roomsList)) {
      safeRoomsList = roomsList;
    } else if (roomsList && typeof roomsList === 'object') {
      const roomsListAny = roomsList as any;
      if (roomsListAny instanceof Map) {
        safeRoomsList = Array.from(roomsListAny.values());
      } else if (roomsListAny.constructor === Object) {
        safeRoomsList = Object.values(roomsListAny);
      } else {
        console.error('❌ Connection handler: roomsList is an object but not a Map or plain object:', roomsList);
        safeRoomsList = [];
      }
    } else {
      console.warn('❌ Connection handler: roomsList is not an array:', typeof roomsList, roomsList);
      safeRoomsList = [];
    }
    
    // Final check
    if (!Array.isArray(safeRoomsList)) {
      console.error('❌ Connection handler: safeRoomsList is still not an array after conversion!');
      safeRoomsList = [];
    }
    
    console.log("📋 Broadcasting Rooms:", safeRoomsList.length);
    console.log("📋 Broadcasting Rooms Type:", Array.isArray(safeRoomsList) ? 'Array' : typeof safeRoomsList);
    socket.emit('public_rooms_list', safeRoomsList);
  }).catch(error => {
    console.error('❌ Error sending initial public rooms list:', error);
    socket.emit('public_rooms_list', []); // Always emit empty array on error
  });

  socket.on('create_room', async (data, callback) => {
    // CRITICAL: Log at the very start to confirm Render is receiving the event
    console.log('📡 RECEIVED create_room');
    
    // Ensure callback is always called, even on errors
    const sendResponse = (response: { roomId?: string; error?: string }) => {
      if (callback && typeof callback === 'function') {
        try {
          callback(response);
        } catch (err) {
          console.error('❌ Error calling create_room callback:', err);
          socket.emit('error', response.error || 'Room creation failed');
        }
      } else {
        if (response.error) {
          socket.emit('error', response.error);
        } else if (response.roomId) {
          socket.emit('room_created', { roomId: response.roomId, settings: data });
        }
      }
    };
    
    try {
      console.log('✅ CREATE_ROOM: Received request from', socket.id, data);
      
    // Rate limit check
    const rateLimitResult = checkRateLimit(socket.id, 'create_room');
    if (!rateLimitResult.allowed) {
        const errorMsg = 'You\'re creating rooms too quickly. Please wait a moment and try again.';
        console.warn('⚠️ CREATE_ROOM: Rate limited', socket.id);
        sendResponse({ error: errorMsg });
      return;
    }
    
    // SECURITY: Sanitize and validate input
      const { name, avatar, playerId, isPublic, roomName, turnTimer, selected_sleeve_id } = data;
    const sanitizedName = (name || 'GUEST').trim().substring(0, 20).replace(/[<>\"'&]/g, '') || 'GUEST';
    const sanitizedAvatar = (avatar || ':smile:').trim().substring(0, 50);
    const sanitizedRoomName = roomName ? roomName.trim().substring(0, 24).replace(/[<>\"'&]/g, '') : `${sanitizedName.toUpperCase()}'S MATCH`;
    const validTurnTimer = typeof turnTimer === 'number' && [0, 15, 30, 60].includes(turnTimer) ? turnTimer : 30;
    const sanitizedSleeveId = selected_sleeve_id && typeof selected_sleeve_id === 'string' && selected_sleeve_id.length <= 50 ? selected_sleeve_id.trim() : undefined;
    
    // CRITICAL: Ensure isPublic is treated as a boolean
    // If the client sends it as a string "true", convert it
    const validIsPublic = typeof isPublic === 'boolean' ? isPublic : String(isPublic).toLowerCase() === 'true';
    
      // CRITICAL: Ensure playerId is a valid UUID, not "guest" or empty string
      // If playerId is "guest", undefined, empty, or not a valid UUID format, generate a new one
      let pId = playerId;
      if (!pId || pId === 'guest' || pId === 'GUEST' || pId.trim() === '' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pId)) {
        pId = uuidv4();
        console.log(`⚠️ create_room: Invalid playerId provided (${playerId}), generated new UUID: ${pId}`);
      }
      
      // Create player object
      const player: SimplePlayer = {
        id: pId,
        name: sanitizedName,
        avatar: sanitizedAvatar
      };
      
      console.log(`📝 create_room: Creating room with player`, {
        playerId: pId,
        playerName: sanitizedName,
        isPublic: validIsPublic,
        roomName: sanitizedRoomName
      });
      
      // Use createRoom function to create the room (saves to Map + Supabase)
      // CRITICAL: player.id (pId) will be used as the hostId
      const newRoom = await createRoom(player, sanitizedRoomName, validIsPublic, validTurnTimer);
      
      console.log(`✅ create_room: Room created successfully`, {
        roomId: newRoom.id,
        hostId: newRoom.hostId,
        hostIdMatchesPlayerId: newRoom.hostId === pId,
        isPublic: newRoom.isPublic,
        status: newRoom.status
      });
      
      // Broadcast updated public rooms list after room creation
      // Add small delay to ensure Supabase insert completes first
      setTimeout(() => {
        broadcastPublicLobbies();
      }, 500);
      const roomId = newRoom.id;
      
      // Verify room was saved to local Map
      const verifyRoom = rooms.get(roomId);
      if (!verifyRoom) {
        throw new Error(`Failed to save room ${roomId} - room not found in Map after creation`);
      }
      
      // Update player with socket ID and sleeve
      const roomPlayer = newRoom.players[0];
      roomPlayer.socketId = socket.id;
      if (sanitizedSleeveId) {
        roomPlayer.selected_sleeve_id = sanitizedSleeveId;
      }
      
      // Map socket to room and player
      mapIdentity(socket, roomId, pId);
      
      // Join socket to room
      socket.join(roomId);
      
      // CRITICAL: Send callback response AFTER DB insert succeeds
      // This ensures the client gets a response only after room is persisted
      sendResponse({ roomId });
      console.log(`🚀 SERVER: Sent callback response with roomId: '${roomId}'`);
      
      // IMPORTANT: Notify client of room creation (for UI navigation)
      socket.emit('room_created', { roomId, settings: data });
      console.log(`🚀 SERVER: Sent room_created event for ID: '${roomId}'`);
      
      // Send game state to the creator
      const state = getGameStateData(newRoom);
      socket.emit('game_state', state);
      socket.emit('room_update', state);
      
      if (roomPlayer && !roomPlayer.isBot && !roomPlayer.isOffline) {
        socket.emit('player_hand', roomPlayer.hand);
      }
      
      console.log(`🎮 Room ${roomId} created by ${sanitizedName}`);
      console.log(`✅ CREATE_ROOM SUCCESS: Room ID: '${roomId}'`);

      // Broadcast to all players
      await broadcastState(roomId);
      await broadcastPublicLobbies();
      
      // Secondary Supabase operations (non-blocking)
      if (supabase) {
        try {
          // Update user profile with selected sleeve if provided
          if (sanitizedSleeveId) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ active_sleeve: sanitizedSleeveId })
              .eq('id', pId);

            if (updateError) {
              console.error('❌ Supabase: Error updating player sleeve:', updateError);
              // Do not block room creation if this fails
            } else {
              console.log(`✅ Supabase: Player ${pId} active sleeve updated to ${sanitizedSleeveId}`);
            }
          }
        } catch (dbError: any) {
          // Log DB error but don't fail room creation
          console.error('⚠️ CREATE_ROOM: Supabase DB operation failed (non-critical):', dbError.message);
          console.error('⚠️ Room was still created successfully:', roomId);
          // Room creation succeeded, so we don't send an error to the client
        }
      }
      
    } catch (error: any) {
      console.error('❌ CREATE_ROOM ERROR:', error);
      const errorMsg = error.message || 'Unable to create room. Please try again.';
      // CRITICAL: Always send response, even on error
      sendResponse({ error: errorMsg });
    }
  });

  socket.on('join_room', async ({ roomId, name, avatar, playerId, selected_sleeve_id }, callback) => {
    console.log('📡 RECEIVED join_room');
    
    const sendResponse = (response: any) => {
      if (callback) {
        callback(response);
      } else {
        if (response.error) {
          socket.emit('error', response.error);
        } else if (response.success) {
          socket.emit('room_joined', response);
        }
      }
    };
    
    const requestedId = roomId;
    console.log(`🔍 JOIN_ROOM: Client ${socket.id} is looking for: '${requestedId}'`);
    
    // SECURITY: Validate roomId format (accepts both 4-character codes and LOBBY_XXXXX format)
    if (!requestedId || typeof requestedId !== 'string') {
      console.error('❌ JOIN_ROOM: Invalid roomId format:', requestedId, typeof requestedId);
      const errorMsg = 'Invalid room code.';
      const availableRooms = await getAllRoomIds();
      sendResponse({ 
        error: errorMsg, 
        availableRooms: availableRooms 
      });
      return;
    }
    
    // Accept either 4-character codes (ABCD) or LOBBY_XXXXX format
    const isValidFormat = /^[A-Z0-9]{4}$/i.test(requestedId) || /^LOBBY_[A-Z0-9]+$/i.test(requestedId);
    if (!isValidFormat) {
      console.error('❌ JOIN_ROOM: RoomId format validation failed:', requestedId);
      const errorMsg = 'Invalid room code format.';
      const availableRooms = await getAllRoomIds();
      sendResponse({ 
        error: errorMsg, 
        availableRooms: availableRooms 
      });
      return;
    }
    
    // SECURITY: Sanitize input
    const sanitizedName = (name || 'GUEST').trim().substring(0, 20).replace(/[<>\"'&]/g, '') || 'GUEST';
    const sanitizedAvatar = (avatar || ':smile:').trim().substring(0, 50);
    const sanitizedSleeveId = selected_sleeve_id && typeof selected_sleeve_id === 'string' && selected_sleeve_id.length <= 50 ? selected_sleeve_id.trim() : undefined;
    
    try {
    const pid = playerId || uuidv4();
      
      // Create player object
      const player: SimplePlayer = {
        id: pid,
        name: sanitizedName,
        avatar: sanitizedAvatar
      };
      
      // Use joinRoom function to join the room (checks Map first, then Supabase)
      // CRITICAL: await the join operation (may rehydrate from Supabase if not in Map)
      const room = await joinRoom(player, requestedId);
      
      // HOST RESCUE LOGIC: If room has 0 or 1 players, the joining player MUST be the host
      const humanPlayerCount = room.players.filter(p => !p.isBot).length;
      if (humanPlayerCount <= 1) {
        console.log(`🔧 join_room: Host Rescue - Room has ${humanPlayerCount} human player(s), setting joining player as host`);
        room.hostId = pid;
        // Update the player's isHost flag
        const joiningPlayer = room.players.find(p => p.id === pid);
        if (joiningPlayer) {
          joiningPlayer.isHost = true;
        }
        // Clear isHost from other players
        room.players.forEach(p => {
          if (p.id !== pid) {
            p.isHost = false;
          }
        });
        
        // Update Supabase immediately
        if (supabase) {
          const roomData = serializeRoomForDB(room);
          await supabase
            .from('rooms')
            .update({ host_id: pid })
            .eq('id', requestedId);
          console.log(`✅ join_room: Updated Supabase with hostId: ${pid}`);
        }
        
        console.log(`PROD DEBUG: Player ${pid} joined ${requestedId}. Room Host is now ${room.hostId}`);
      } else if (!room.hostId || room.hostId === '') {
        // Fallback: If room has no hostId assigned, assign the first player as host
        console.log('⚠️ join_room: Room has no hostId. Assigning first player as host...');
        if (room.players.length > 0) {
          const firstPlayer = room.players[0];
          room.hostId = firstPlayer.id;
          firstPlayer.isHost = true;
          console.log(`✅ join_room: Assigned hostId: ${room.hostId} to player: ${firstPlayer.name}`);
          
          // Update Supabase if available
          if (supabase) {
            const roomData = serializeRoomForDB(room);
            await supabase
              .from('rooms')
              .update({ host_id: firstPlayer.id })
              .eq('id', requestedId);
          }
        }
        console.log(`PROD DEBUG: Player ${pid} joined ${requestedId}. Room Host is now ${room.hostId}`);
    } else {
        console.log(`PROD DEBUG: Player ${pid} joined ${requestedId}. Room Host is now ${room.hostId}`);
      }
      
      // Update player with socket ID and sleeve
      const roomPlayer = room.players.find(p => p.id === pid);
      if (roomPlayer) {
        roomPlayer.socketId = socket.id;
        if (sanitizedSleeveId) {
          roomPlayer.selected_sleeve_id = sanitizedSleeveId;
        }
        if (roomPlayer.reconnectionTimeout) {
          clearTimeout(roomPlayer.reconnectionTimeout);
        }
      }
      
      // Map socket to room and player
      mapIdentity(socket, requestedId, pid);
      
      // CRITICAL: Join socket to room for Socket.IO room-based messaging
      socket.join(requestedId);
      
      // CRITICAL: Send callback response AFTER DB update succeeds
      sendResponse({ 
        success: true, 
        room: {
          id: room.id,
          name: room.roomName,
          players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
          isPublic: room.isPublic,
          turnTimer: room.turnDuration / 1000
        }
      });
      
      // Send game state to the joining player
      const state = getGameStateData(room);
      socket.emit('game_state', state);
      socket.emit('room_update', state);
      
      if (roomPlayer && !roomPlayer.isBot && !roomPlayer.isOffline) {
        socket.emit('player_hand', roomPlayer.hand);
      }
      
      console.log(`👤 Player ${socket.id} (${sanitizedName}) joined '${requestedId}'`);
      console.log(`✅ JOIN_ROOM SUCCESS: Room ID: '${requestedId}'`);
      
      // Broadcast to all players in the room
      await broadcastState(requestedId);
      await broadcastPublicLobbies();
    } catch (error: any) {
      console.error(`❌ JOIN_ROOM ERROR for '${requestedId}':`, error.message);
      const errorMsg = error.message || 'Unable to join room. Please try again.';
      const availableRooms = await getAllRoomIds();
      console.error(`📋 JOIN_ROOM: Available rooms: [${availableRooms.join(', ')}]`);
      
      sendResponse({ 
        error: errorMsg, 
        availableRooms: availableRooms 
      });
    }
  });

  socket.on('add_bot', async ({ roomId, playerId }, callback) => {
    console.log('🤖 add_bot event received', { roomId, playerId, socketId: socket.id });
    
    const sendResponse = (response: { success?: boolean; error?: string }) => {
      if (callback && typeof callback === 'function') {
        try {
          callback(response);
        } catch (err) {
          console.error('❌ Error calling add_bot callback:', err);
          if (response.error) {
            socket.emit('error', response.error);
          }
        }
      } else if (response.error) {
        socket.emit('error', response.error);
      }
    };
    
    // 1. Verify room exists
    let room = rooms.get(roomId);
    if (!room) {
      room = await fetchRoom(roomId);
      if (!room) {
        console.error('❌ add_bot: Room not found', { roomId });
        sendResponse({ error: 'Room not found.' });
        return;
      }
    }
    
    // 2. Verify room status is LOBBY
    if (room.status !== 'LOBBY') {
      console.error('❌ add_bot: Room is not in LOBBY status', { roomId, currentStatus: room.status });
      sendResponse({ error: 'Cannot add bot - game has already started.' });
      return;
    }
    
    // 3. Verify max 4 players
    if (room.players.length >= 4) {
      console.error('❌ add_bot: Room is full', { roomId, playerCount: room.players.length });
      sendResponse({ error: 'Room is full (4/4 players).' });
      return;
    }
    
    // 4. Security: Check if requester is host
    const requesterId = playerId || socketToPlayerId[socket.id];
    if (!requesterId) {
      console.error('❌ add_bot: No playerId found', { socketId: socket.id });
      sendResponse({ error: 'Player not identified.' });
      return;
    }
    
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester) {
      console.error('❌ add_bot: Requester not found in room', { playerId: requesterId, roomId });
      sendResponse({ error: 'You are not in this room.' });
      return;
    }
    
    // DEBUG: Log host check details
    console.log('🔍 DEBUG HOST CHECK:', { 
      roomHostId: room.hostId, 
      requesterId: requesterId,
      roomPlayers: room.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })),
      playerCount: room.players.length
    });
    
    // Robust host check: compare hostId with requesterId (as strings)
    let isHost = String(room.hostId) === String(requesterId);
    
    // Fallback: If hostId is missing or check fails, but there's only one player and it's the requester, promote them to host
    if (!isHost && (!room.hostId || room.hostId === '')) {
      console.log('⚠️ add_bot: Room has no hostId assigned. Checking if requester is the only player...');
      if (room.players.length === 1 && room.players[0].id === requesterId) {
        console.log('✅ add_bot: Promoting single player to host (fixing stale state)');
        room.hostId = requesterId;
        requester.isHost = true;
        isHost = true;
        
        // Update Supabase if available
        if (supabase) {
          const roomData = serializeRoomForDB(room);
          await supabase
            .from('rooms')
            .update({ host_id: requesterId })
            .eq('id', roomId);
        }
      }
    }
    
    if (!isHost) {
      console.error('❌ add_bot: Requester is not the host', { 
        playerId: requesterId, 
        roomHostId: room.hostId,
        isHostCheck: String(room.hostId) === String(requesterId)
      });
      sendResponse({ error: 'Only the host can add bots.' });
      return;
    }
    
    console.log('✅ add_bot: Security checks passed', { 
      roomId, 
      hostName: requester.name,
      currentPlayerCount: room.players.length 
    });
    
    // 5. Create bot player
    const botId = 'bot-' + Math.random().toString(36).substr(2, 9);
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const botAvatar = getRandomEmote();
    
    const botPlayer: Player = {
      id: botId,
      name: botName,
      avatar: botAvatar,
      socketId: 'BOT',
      hand: [],
      isHost: false,
      hasPassed: false,
      finishedRank: null,
      isBot: true,
      difficulty: 'MEDIUM'
    };
    
    // 6. Add bot to room
    room.players.push(botPlayer);
    
    console.log('🤖 Bot added to room', {
      roomId,
      botName,
      botId,
      totalPlayers: room.players.length
    });
    
    // 7. Update Supabase if available
    if (supabase) {
      try {
        const roomData = serializeRoomForDB(room);
        const { error } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', roomId);
        
        if (error) {
          console.error('❌ add_bot: Error updating Supabase (non-critical):', error);
        } else {
          console.log('✅ add_bot: Updated room in Supabase');
        }
      } catch (err) {
        console.error('❌ add_bot: Exception updating Supabase (non-critical):', err);
      }
    }
    
    // 8. Broadcast updated state to ALL players in the room
    console.log('📡 add_bot: Broadcasting updated state to room', { 
      roomId, 
      playerCount: room.players.length,
      players: room.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot }))
    });
    await broadcastState(roomId);
    await broadcastPublicLobbies();
    
    // Send success response
    sendResponse({ success: true });
    
    // Also emit a specific event to confirm bot was added (for debugging)
    io.to(roomId).emit('bot_added', { 
      botId, 
      botName, 
      totalPlayers: room.players.length 
    });
  });

  // Handle both 'remove_player' and 'remove_bot' events (they do the same thing)
  const handleRemovePlayer = async ({ roomId, targetPlayerId, botId, playerId }: { roomId: string; targetPlayerId?: string; botId?: string; playerId: string }, callback?: (response: { success?: boolean; error?: string }) => void) => {
    const sendResponse = (response: { success?: boolean; error?: string }) => {
      if (callback && typeof callback === 'function') {
        try {
          callback(response);
        } catch (err) {
          console.error('❌ Error calling remove_player callback:', err);
          if (response.error) {
            socket.emit('error', response.error);
          }
        }
      } else if (response.error) {
        socket.emit('error', response.error);
      }
    };
    
    // Support both targetPlayerId and botId (for backwards compatibility)
    const targetId = targetPlayerId || botId;
    if (!targetId) {
      console.error('❌ remove_player: No target player ID provided');
      sendResponse({ error: 'No target player specified.' });
      return;
    }
    
    console.log('🗑️ remove_player event received', { roomId, targetPlayerId: targetId, playerId, socketId: socket.id });
    
    // 1. Verify room exists
    let room = rooms.get(roomId);
    if (!room) {
      room = await fetchRoom(roomId);
      if (!room) {
        console.error('❌ remove_player: Room not found', { roomId });
        sendResponse({ error: 'Room not found.' });
        return;
      }
    }
    
    // 2. Verify room status is LOBBY (can't remove players during game)
    if (room.status !== 'LOBBY') {
      console.error('❌ remove_player: Room is not in LOBBY status', { roomId, currentStatus: room.status });
      sendResponse({ error: 'Cannot remove players - game has already started.' });
      return;
    }
    
    // 3. Security: Check if requester is host using hostId
    const requesterId = playerId || socketToPlayerId[socket.id];
    if (!requesterId) {
      console.error('❌ remove_player: No playerId found', { socketId: socket.id });
      sendResponse({ error: 'Player not identified.' });
      return;
    }
    
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester) {
      console.error('❌ remove_player: Requester not found in room', { playerId: requesterId, roomId });
      sendResponse({ error: 'You are not in this room.' });
      return;
    }
    
    // DEBUG: Log host check details
    console.log('🔍 DEBUG HOST CHECK (remove_player):', { 
      roomHostId: room.hostId, 
      requesterId: requesterId,
      isHostCheck: String(room.hostId) === String(requesterId)
    });
    
    // Robust host check: compare hostId with requesterId (as strings)
    let isHost = String(room.hostId) === String(requesterId);
    
    // Fallback: If hostId is missing, check if requester is the only player
    if (!isHost && (!room.hostId || room.hostId === '')) {
      if (room.players.length === 1 && room.players[0].id === requesterId) {
        console.log('✅ remove_player: Promoting single player to host (fixing stale state)');
        room.hostId = requesterId;
        requester.isHost = true;
        isHost = true;
      }
    }
    
    if (!isHost) {
      console.error('❌ remove_player: Requester is not the host', { 
        playerId: requesterId, 
        roomHostId: room.hostId,
        isHostCheck: String(room.hostId) === String(requesterId)
      });
      sendResponse({ error: 'Only the host can remove players.' });
      return;
    }
    
    // 4. Find target player
    const targetPlayerIndex = room.players.findIndex(p => p.id === targetId);
    if (targetPlayerIndex === -1) {
      console.error('❌ remove_player: Target player not found', { targetId, roomId });
      sendResponse({ error: 'Player not found in room.' });
      return;
    }
    
    const targetPlayer = room.players[targetPlayerIndex];
    
    // 5. Prevent removing the host
    if (targetPlayer.id === room.hostId) {
      console.error('❌ remove_player: Cannot remove host', { targetId });
      sendResponse({ error: 'Cannot remove the host.' });
      return;
    }
    
    console.log('✅ remove_player: Security checks passed', { 
      roomId, 
      hostName: requester.name,
      targetPlayerName: targetPlayer.name,
      isBot: targetPlayer.isBot
    });
    
    // 6. Remove player from room using immutable update
    room.players = room.players.filter((p, idx) => idx !== targetPlayerIndex);
    
    console.log('🗑️ Player removed from room', {
      roomId,
      removedPlayer: targetPlayer.name,
      remainingPlayers: room.players.length
    });
    
    // 7. Update Supabase if available
    if (supabase) {
      try {
        const roomData = serializeRoomForDB(room);
        const { error } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', roomId);
        
        if (error) {
          console.error('❌ remove_player: Error updating Supabase (non-critical):', error);
        } else {
          console.log('✅ remove_player: Updated room in Supabase');
        }
      } catch (err) {
        console.error('❌ remove_player: Exception updating Supabase (non-critical):', err);
      }
    }
    
    // 8. Broadcast updated state
    await broadcastState(roomId);
    await broadcastPublicLobbies();
    
    // 9. Send success response
    sendResponse({ success: true });
  };
  
  // Listen for both 'remove_player' and 'remove_bot' events
  socket.on('remove_player', async (data, callback) => {
    await handleRemovePlayer(data, callback);
  });
  
  socket.on('remove_bot', async ({ roomId, botId, playerId }, callback) => {
    await handleRemovePlayer({ roomId, botId, playerId }, callback);
  });

  socket.on('update_bot_difficulty', async ({ roomId, botId, difficulty, playerId }) => {
    // 1. Verify room exists
    let room = rooms.get(roomId);
    if (!room) {
      room = await fetchRoom(roomId);
      if (!room) {
        console.error('❌ update_bot_difficulty: Room not found', { roomId });
        socket.emit('error', 'Room not found.');
        return;
      }
    }
    
    // 2. Verify room status is LOBBY
    if (room.status !== 'LOBBY') {
      console.error('❌ update_bot_difficulty: Room is not in LOBBY status', { roomId, currentStatus: room.status });
      socket.emit('error', 'Cannot update bot difficulty - game has already started.');
      return;
    }
    
    // 3. Security: Check if requester is host
    const requesterId = playerId || socketToPlayerId[socket.id];
    if (!requesterId) {
      console.error('❌ update_bot_difficulty: No playerId found', { socketId: socket.id });
      socket.emit('error', 'Player not identified.');
      return;
    }
    
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester) {
      console.error('❌ update_bot_difficulty: Requester not found in room', { playerId: requesterId, roomId });
      socket.emit('error', 'You are not in this room.');
      return;
    }
    
    // DEBUG: Log host check details
    console.log('🔍 DEBUG HOST CHECK (update_bot_difficulty):', { 
      roomHostId: room.hostId, 
      requesterId: requesterId,
      isHostCheck: String(room.hostId) === String(requesterId)
    });
    
    // Robust host check: compare hostId with requesterId (as strings)
    let isHost = String(room.hostId) === String(requesterId);
    
    // Fallback: If hostId is missing, check if requester is the only player
    if (!isHost && (!room.hostId || room.hostId === '')) {
      if (room.players.length === 1 && room.players[0].id === requesterId) {
        console.log('✅ update_bot_difficulty: Promoting single player to host (fixing stale state)');
        room.hostId = requesterId;
        requester.isHost = true;
        isHost = true;
      }
    }
    
    if (!isHost) {
      console.error('❌ update_bot_difficulty: Requester is not the host', { 
        playerId: requesterId, 
        roomHostId: room.hostId,
        isHostCheck: String(room.hostId) === String(requesterId)
      });
      socket.emit('error', 'Only the host can update bot difficulty.');
      return;
    }
    
    // 4. Find and update the bot using immutable update
    const botIndex = room.players.findIndex(p => p.id === botId && p.isBot);
    if (botIndex === -1) {
      console.error('❌ update_bot_difficulty: Bot not found', { botId, roomId });
      socket.emit('error', 'Bot not found.');
      return;
    }
    
    // Immutable update: create new array with updated bot
    room.players = room.players.map((p, idx) => 
      idx === botIndex ? { ...p, difficulty } : p
    );
    
    // 5. Update Supabase if available
    if (supabase) {
      try {
        const roomData = serializeRoomForDB(room);
        const { error } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', roomId);
        
        if (error) {
          console.error('❌ update_bot_difficulty: Error updating Supabase (non-critical):', error);
        }
      } catch (err) {
        console.error('❌ update_bot_difficulty: Exception updating Supabase (non-critical):', err);
      }
    }
    
    // 6. Broadcast updated state
    await broadcastState(roomId);
  });

  socket.on('update_room_settings', ({ roomId, timer, isPublic, playerId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'LOBBY') return;
    const requesterId = playerId || socketToPlayerId[socket.id];
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) {
      console.log('SERVER: update_room_settings rejected - not host', { requesterId, isHost: requester?.isHost });
      return;
    }
    
    // Update room settings
    if (timer !== undefined && [0, 15, 30, 60].includes(timer)) {
      room.turnDuration = timer * 1000;
      console.log('SERVER: Updated room timer to', timer);
    }
    if (isPublic !== undefined) {
      room.isPublic = isPublic === true;
      console.log('SERVER: Updated room isPublic to', isPublic);
    }
    
    // Broadcast updated state to ALL players including the sender
    broadcastState(roomId);
    broadcastPublicLobbies();
    
    // Also emit dedicated event for room settings update
    io.to(roomId).emit('room_settings_updated', { timer: room.turnDuration / 1000, isPublic: room.isPublic });
    console.log('SERVER: Broadcasted room_settings_updated to room', roomId);
  });

  // Duplicate remove_bot handler removed - using handleRemovePlayer above instead

  socket.on('reconnect_session', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('error', 'Session Expired'); return; }
    const player = room.players.find(p => p.id === playerId);
    if (!player) { socket.emit('error', 'Player not found'); return; }
    if (player.reconnectionTimeout) clearTimeout(player.reconnectionTimeout);
    player.socketId = socket.id;
    player.isOffline = false;
    mapIdentity(socket, roomId, playerId);
    socket.join(roomId);
    broadcastState(roomId);
  });

  // Helper function to deal cards to all players in a room
  const dealCards = (room: GameRoom): void => {
    // Generate a 52-card deck (13 ranks * 4 suits, starting from Rank 3)
    const deck: Card[] = [];
    for (let s = 0; s < 4; s++) {
      for (let r = 3; r <= 15; r++) {
        deck.push({ 
          suit: s as Suit, 
          rank: r as Rank, 
          id: uuidv4() 
        });
      }
    }
    
    // Shuffle the deck using Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // Deal 13 cards to each of the 4 players
    room.players.forEach((player, index) => {
      player.hand = deck.slice(index * 13, (index + 1) * 13);
      player.hasPassed = false;
      player.finishedRank = null;
    });
    
    console.log(`🃏 Dealt cards to ${room.players.length} players in room ${room.id}`);
  };

  // Helper function to find the starting player (holder of 3 of Spades)
  const findStartingPlayer = (room: GameRoom): number => {
    // Find the player holding the 3 of Spades (Rank.Three = 3, Suit.Spades = 0)
    for (let i = 0; i < room.players.length; i++) {
      const player = room.players[i];
      const hasThreeSpades = player.hand.some(
        card => card.rank === Rank.Three && card.suit === Suit.Spades
      );
      if (hasThreeSpades) {
        console.log(`🎯 Starting player found: ${player.name} (index ${i}) - holds 3♠`);
        return i;
      }
    }
    
    // Fallback: If no one has 3 of Spades (shouldn't happen), find lowest card
    let starter = 0;
    let minScore = 999;
    room.players.forEach((player, i) => {
      player.hand.forEach(card => {
        const score = card.rank * 10 + card.suit;
        if (score < minScore) {
          minScore = score;
          starter = i;
        }
      });
    });
    
    console.log(`⚠️ No 3♠ found, using fallback: ${room.players[starter].name} (index ${starter})`);
    return starter;
  };

  socket.on('start_game', async ({ roomId, playerId }) => {
    console.log('🚀 start_game event received', { roomId, playerId, socketId: socket.id });
    
    // 1. Verify the room exists
    let room = rooms.get(roomId);
    if (!room) {
      // Try to fetch from Supabase
      room = await fetchRoom(roomId);
      if (!room) {
        console.error('❌ start_game: Room not found', { roomId });
        socket.emit('error', 'Room not found.');
        return;
      }
    }
    
    // 2. Verify room status is LOBBY
    if (room.status !== 'LOBBY') {
      console.error('❌ start_game: Room is not in LOBBY status', { roomId, currentStatus: room.status });
      socket.emit('error', 'Game has already started.');
      return;
    }
    
    // 3. Verify there are at least 2 players before starting
    if (room.players.length < 2) {
      console.error('❌ start_game: Not enough players to start game', { roomId, playerCount: room.players.length });
      socket.emit('error', 'Need at least 2 players to start the game.');
      return;
    }
    
    // 4. Security: Check if the requesting socket belongs to the isHost player
    const pId = playerId || socketToPlayerId[socket.id];
    if (!pId) {
      console.error('❌ start_game: No playerId found', { socketId: socket.id });
      socket.emit('error', 'Player not identified.');
      return;
    }
    
    const requester = room.players.find(p => p.id === pId);
    if (!requester) {
      console.error('❌ start_game: Requester not found in room', { playerId: pId, roomId });
      socket.emit('error', 'You are not in this room.');
      return;
    }
    
    // DEBUG: Log host check details
    console.log('🔍 DEBUG HOST CHECK (start_game):', { 
      roomHostId: room.hostId, 
      requesterId: pId,
      isHostCheck: String(room.hostId) === String(pId)
    });
    
    // Robust host check: compare hostId with requesterId (as strings)
    let isHost = String(room.hostId) === String(pId);
    
    // Fallback: If hostId is missing, check if requester is the only player
    if (!isHost && (!room.hostId || room.hostId === '')) {
      if (room.players.length === 1 && room.players[0].id === pId) {
        console.log('✅ start_game: Promoting single player to host (fixing stale state)');
        room.hostId = pId;
        requester.isHost = true;
        isHost = true;
        
        // Update Supabase if available
        if (supabase) {
          const roomData = serializeRoomForDB(room);
          await supabase
            .from('rooms')
            .update({ host_id: pId })
            .eq('id', roomId);
        }
      }
    }
    
    if (!isHost) {
      console.error('❌ start_game: Requester is not the host', { 
        playerId: pId, 
        roomHostId: room.hostId,
        isHostCheck: String(room.hostId) === String(pId)
      });
      socket.emit('error', 'Only the host can start the game.');
      return;
    }
    
    // Map socket identity
    if (pId) mapIdentity(socket, roomId, pId);
    
    console.log('✅ start_game: Security checks passed', { 
      roomId, 
      hostName: requester.name,
      playerCount: room.players.length 
    });
    
    // 4. Deal cards to all players (no auto-fill - host must manually add CPUs if desired)
    // Games can now start with 2-4 players as configured by the host
    dealCards(room);
    
    // 5. Find the starting player (holder of 3 of Spades)
    const startingPlayerIndex = findStartingPlayer(room);
    
    // 6. Update room state: status to PLAYING, set currentPlayerIndex, isFirstTurnOfGame
    room.status = 'PLAYING';
    room.currentPlayerIndex = startingPlayerIndex;
    room.isFirstTurnOfGame = room.players[startingPlayerIndex].hand.some(
      card => card.rank === Rank.Three && card.suit === Suit.Spades
    );
    room.currentPlayPile = [];
    room.roundHistory = [];
    room.finishedPlayers = [];
    
    // Reset quick move reward tracking for new game
    room.quickMoveRewardGiven = new Set();
    room.playerMutedByAfk = new Set();
    
    const startingPlayer = room.players[startingPlayerIndex];
    console.log('🎮 Game started', {
      roomId,
      status: room.status,
      startingPlayer: startingPlayer.name,
      startingPlayerIndex: startingPlayerIndex,
      isBot: startingPlayer.isBot,
      isFirstTurnOfGame: room.isFirstTurnOfGame,
      playerCount: room.players.length,
      hasThreeSpades: startingPlayer.hand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades),
      handSize: startingPlayer.hand.length
    });
    
    // 7. Broadcast state and start turn timer
    await broadcastState(roomId);
    startTurnTimer(roomId);
    
    // Check if starting player is a bot and trigger their turn
    // CRITICAL: Use setTimeout to ensure state is fully broadcast before checking
    // This gives clients time to receive the game_state update
    setTimeout(async () => {
      await checkBotTurn(roomId);
    }, 500);
    
    // Update public lobbies list
    broadcastPublicLobbies();
  });

  socket.on('play_cards', ({ roomId, cards, playerId }) => {
    const pId = playerId || socketToPlayerId[socket.id];
    if (!pId) return;
    
    // SECURITY: Validate cards array
    if (!Array.isArray(cards) || cards.length === 0 || cards.length > 13) {
      socket.emit('error', 'Invalid card selection.');
      return;
    }
    
    // SECURITY: Validate each card has required fields
    for (const card of cards) {
      if (!card || typeof card !== 'object' || typeof card.id !== 'string' || 
          typeof card.rank !== 'number' || typeof card.suit !== 'number' ||
          card.rank < 3 || card.rank > 15 || card.suit < 0 || card.suit > 3) {
        socket.emit('error', 'Invalid card data.');
        return;
      }
    }
    
    // Rate limit check
    const rateLimitResult = checkRateLimit(socket.id, 'play_cards');
    if (!rateLimitResult.allowed) {
      socket.emit('error', 'Rate limit exceeded. Please slow down your card plays.');
      return;
    }
    
    mapIdentity(socket, roomId, pId);
    handlePlay(roomId, pId, cards);
  });

  socket.on('pass_turn', ({ roomId, playerId }) => {
    const pId = playerId || socketToPlayerId[socket.id];
    if (!pId) return;
    
    // Rate limit check
    const rateLimitResult = checkRateLimit(socket.id, 'pass_turn');
    if (!rateLimitResult.allowed) {
      socket.emit('error', 'Rate limit exceeded. Please slow down your actions.');
      return;
    }
    
    mapIdentity(socket, roomId, pId);
    handlePass(roomId, pId);
  });

  socket.on('get_public_rooms', async () => {
    console.log('📋 GET_PUBLIC_ROOMS: Requested');
    console.log('📋 Rooms Map size:', rooms.size);
    
    // CRITICAL: Initialize empty array at the very start - ensure we always emit an array
    let safeRoomsList: Array<any> = [];
    
    // Rate limit check
    const rateLimitResult = checkRateLimit(socket.id, 'get_public_rooms');
    if (!rateLimitResult.allowed) {
      socket.emit('error', 'Rate limit exceeded. Please wait before requesting room list again.');
      socket.emit('public_rooms_list', []); // Always emit empty array, never object
      return;
    }
    
    try {
      // DEBUG: Check total rooms in memory vs filtered
      const allRoomsInMemory = Array.from(rooms.values());
      const lobbyRooms = allRoomsInMemory.filter(r => r.status === 'LOBBY');
      const publicLobbyRooms = lobbyRooms.filter(r => {
        // Check both boolean true and string "true" for isPublic
        const isPublic = r.isPublic === true || r.isPublic === 'true' || String(r.isPublic) === 'true';
        return isPublic;
      });
      console.log(`📋 DEBUG: Total rooms in memory: ${allRoomsInMemory.length}`);
      console.log(`📋 DEBUG: Lobby rooms: ${lobbyRooms.length}`);
      console.log(`📋 DEBUG: Public lobby rooms (after isPublic filter): ${publicLobbyRooms.length}`);
      console.log(`📋 DEBUG: Sample room isPublic values:`, lobbyRooms.slice(0, 3).map(r => ({ id: r.id, isPublic: r.isPublic, type: typeof r.isPublic })));
      
      const roomsList = await getPublicRoomsList();
      
      // CRITICAL: Ensure roomsList is always an array before emitting
      // Explicitly convert to array - handle null, undefined, objects, Maps, etc.
      if (Array.isArray(roomsList)) {
        safeRoomsList = roomsList;
      } else if (roomsList && typeof roomsList === 'object') {
        // If it's an object (not array), try to convert it
        const roomsListAny = roomsList as any;
        if (roomsListAny instanceof Map) {
          safeRoomsList = Array.from(roomsListAny.values());
        } else if (roomsListAny.constructor === Object) {
          // Plain object - convert to array using Object.values
          safeRoomsList = Object.values(roomsListAny);
          console.warn('⚠️ get_public_rooms: Converted object to array using Object.values:', safeRoomsList.length, 'items');
        } else {
          // Unknown object type - log and use empty array
          console.error('❌ get_public_rooms: roomsList is an object but not a Map or plain object:', roomsList);
          safeRoomsList = [];
        }
      } else {
        // null, undefined, or other non-array/non-object - use empty array
        console.warn('❌ get_public_rooms: roomsList is not an array:', typeof roomsList, roomsList);
        safeRoomsList = [];
      }
      
      // CRITICAL: Final check - ensure it's definitely an array
      if (!Array.isArray(safeRoomsList)) {
        console.error('❌ get_public_rooms: safeRoomsList is still not an array after conversion!');
        safeRoomsList = [];
      }
      
      console.log(`📋 Found ${safeRoomsList.length} public rooms after getPublicRoomsList()`);
      console.log("📋 Broadcasting Rooms:", safeRoomsList.length);
      console.log("📋 Broadcasting Rooms Type:", Array.isArray(safeRoomsList) ? 'Array' : typeof safeRoomsList);
      
      // CRITICAL: Always emit an array, never an object or Map
      // Use Object.values() as final safety net if somehow still an object
      // Ensure empty case returns [] not {} or null
      const finalArray = Array.isArray(safeRoomsList) ? safeRoomsList : (Object.values(safeRoomsList || {}) || []);
      socket.emit('public_rooms_list', finalArray);
    } catch (error) {
      console.error('❌ get_public_rooms: Error fetching public rooms:', error);
      socket.emit('public_rooms_list', []);
    }
  });

  socket.on('request_sync', ({ playerId }) => {
    const pId = playerId || socketToPlayerId[socket.id];
    if (!pId) return;
    
    // Rate limit check
    const rateLimitResult = checkRateLimit(socket.id, 'request_sync');
    if (!rateLimitResult.allowed) {
      socket.emit('error', 'Rate limit exceeded. Please wait before requesting sync again.');
      return;
    }
    
    let room = Array.from(rooms.values()).find(r => r.players.some(p => p.id === pId));
    if (!room) return;
    const player = room.players.find(p => p.id === pId);
    if (!player) return;
    player.socketId = socket.id;
    player.isOffline = false;
    mapIdentity(socket, room.id, pId);
    socket.join(room.id);
    broadcastState(room.id);
  });

  socket.on('emote_sent', ({ roomId, emote }) => {
    const playerId = socketToPlayerId[socket.id];
    if (!playerId) return;
    
    // SECURITY: Validate emote format
    if (!emote || typeof emote !== 'string' || emote.length > 50) {
      socket.emit('error', 'Invalid emote.');
      return;
    }
    
    // SECURITY: Validate emote is in allowed list (in-house emotes only for now)
    // Remote emotes should be validated against database, but for now we allow in-house only
    const sanitizedEmote = emote.trim();
    if (!IN_HOUSE_EMOTES.includes(sanitizedEmote) && !sanitizedEmote.startsWith(':')) {
      socket.emit('error', 'Invalid emote.');
      return;
    }
    
    // Rate limit check - use socket.id as identifier
    const rateLimitResult = checkRateLimit(socket.id, 'emote_sent');
    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimitResult.retryAfter || 0) / 1000);
      socket.emit('error', `Rate limit exceeded. Please wait ${retryAfterSeconds} second${retryAfterSeconds !== 1 ? 's' : ''} before sending another emote.`);
      return;
    }
    
    io.to(roomId).emit('receive_emote', { playerId, emote: sanitizedEmote });
  });

  socket.on('disconnect', async () => {
    const roomId = socketToRoom[socket.id];
    const playerId = socketToPlayerId[socket.id];
    
    // Clean up rate limit data for this socket
    clearRateLimit(socket.id);
    
    if (!roomId || !playerId) return;
    const room = await fetchRoom(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    
    if (room.status === 'LOBBY') {
      // For LOBBY rooms, remove the player immediately
      await performCleanup(roomId, playerId);
      
      // Check if room is now empty (0 human players)
      const updatedRoom = await fetchRoom(roomId);
      if (updatedRoom) {
        const humanPlayers = updatedRoom.players.filter(p => !p.isBot);
        if (humanPlayers.length === 0) {
          // Give LOBBY rooms a 30-second grace period before deletion
          // This prevents rooms from being deleted immediately after creation if player disconnects/reconnects
          const gracePeriodTimeout = setTimeout(async () => {
            const finalCheckRoom = await fetchRoom(roomId);
            if (finalCheckRoom) {
              const finalHumanPlayers = finalCheckRoom.players.filter(p => !p.isBot);
              if (finalHumanPlayers.length === 0) {
                // Room is still empty after grace period, delete it
                console.log(`🧹 Cleaning up empty LOBBY room after grace period: ${roomId}`);
                await deleteRoom(roomId);
                await broadcastPublicLobbies();
              }
            }
          }, 30000); // 30 second grace period for LOBBY rooms
          
          // Store timeout ID for potential cancellation if player rejoins
          (updatedRoom as any).__cleanupTimeout = gracePeriodTimeout;
        }
      }
    } else if (room.status === 'PLAYING') {
      // For PLAYING rooms, mark as offline and allow 5 minutes for reconnection
        player.isOffline = true;
      await broadcastState(roomId);
      
      // Set timeout for cleanup after 5 minutes (300000ms)
      const PLAYING_RECONNECTION_GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes
      player.reconnectionTimeout = setTimeout(async () => {
        await performCleanup(roomId, playerId);
        
        // After cleanup, check if room should be deleted
        const finalRoom = await fetchRoom(roomId);
        if (finalRoom) {
          const humanPlayers = finalRoom.players.filter(p => !p.isBot);
          if (humanPlayers.length === 0) {
            console.log(`🧹 Cleaning up empty PLAYING room after timeout: ${roomId}`);
            await deleteRoom(roomId);
            broadcastPublicLobbies();
          }
        }
      }, PLAYING_RECONNECTION_GRACE_PERIOD);
    } else {
      // For other statuses (FINISHED, etc.), perform cleanup immediately
      await performCleanup(roomId, playerId);
    }
    
    delete socketToRoom[socket.id];
    delete socketToPlayerId[socket.id];
  });
});

console.log('✅ Socket handlers registered');

// ============================================================================
// PRUNE STALE ROOMS ON SERVER START
// ============================================================================
async function pruneStaleRooms() {
  if (!supabase) {
    console.log('⚠️ Prune stale rooms: Supabase not configured, skipping');
    return;
  }
  
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Delete rooms older than 24 hours
    const { error: oldRoomsError } = await supabase
      .from('rooms')
      .delete()
      .lt('created_at', twentyFourHoursAgo);
    
    if (oldRoomsError) {
      console.error('❌ Error deleting old rooms:', oldRoomsError);
    } else {
      console.log('🧹 Pruned rooms older than 24 hours');
    }
    
    // Delete LOBBY rooms with 0 human players
    const { data: lobbyRooms, error: lobbyError } = await supabase
      .from('rooms')
      .select('id, players, status')
      .eq('status', 'LOBBY');
    
    if (lobbyError) {
      console.error('❌ Error fetching LOBBY rooms:', lobbyError);
    } else if (lobbyRooms) {
      const emptyLobbyRooms = lobbyRooms.filter(room => {
        const players = room.players || [];
        // Filter out bots - only count human players
        const humanPlayers = players.filter((p: any) => !p.isBot);
        return humanPlayers.length === 0;
      });
      
      if (emptyLobbyRooms.length > 0) {
        const emptyRoomIds = emptyLobbyRooms.map(r => r.id);
        console.log(`🧹 Pruning ${emptyRoomIds.length} empty LOBBY rooms from database:`, emptyRoomIds);
        
        // Delete from both memory and database
        for (const roomId of emptyRoomIds) {
          await deleteRoom(roomId);
        }
        
        console.log(`✅ Pruned ${emptyLobbyRooms.length} empty LOBBY rooms from database`);
        await broadcastPublicLobbies();
      } else {
        console.log('✅ No empty LOBBY rooms found in database');
      }
    }
  } catch (err) {
    console.error('❌ Error pruning stale rooms:', err);
  }
}

// Run prune on server start
pruneStaleRooms();

// Run periodic cleanup every 5 minutes to remove empty rooms
setInterval(async () => {
  console.log('🧹 Running periodic cleanup for empty rooms...');
  await pruneStaleRooms();
  
  // Also check all rooms in memory for empty LOBBY rooms
  const allRoomIds = Array.from(rooms.keys());
  for (const roomId of allRoomIds) {
    const room = rooms.get(roomId);
    if (room && room.status === 'LOBBY') {
      const humanPlayers = room.players.filter(p => !p.isBot);
      if (humanPlayers.length === 0) {
        console.log(`🧹 Periodic cleanup: Deleting empty LOBBY room ${roomId}`);
        await deleteRoom(roomId);
        await broadcastPublicLobbies();
      }
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

// ============================================================================
// PAYMENT WEBHOOKS
// ============================================================================

/**
 * Verify RevenueCat webhook signature
 */
const verifyRevenueCatSignature = (payload: string, signature: string): boolean => {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('RevenueCat webhook secret not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', REVENUECAT_WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Verify Stripe webhook signature
 */
const verifyStripeSignature = (payload: string, signature: string): boolean => {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('Stripe webhook secret not configured');
    return false;
  }

  try {
    const elements = signature.split(',');
    const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
    const signatures = elements.filter(e => e.startsWith('v1=')).map(e => e.split('=')[1]);

    if (!timestamp || signatures.length === 0) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET);
    hmac.update(signedPayload);
    const expectedSignature = hmac.digest('hex');

    return signatures.some(sig => crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expectedSignature)
    ));
  } catch (error) {
    console.error('Stripe signature verification error:', error);
    return false;
  }
};

/**
 * Process gem purchase and credit user
 */
const processGemPurchase = async (
  userId: string,
  gemAmount: number,
  provider: 'stripe' | 'revenuecat',
  providerId: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Check if transaction already exists (prevent double-counting)
    const { data: existing } = await supabase
      .from('gem_transactions')
      .select('id')
      .eq('provider_id', providerId)
      .maybeSingle();

    if (existing) {
      return { success: true }; // Already processed, return success
    }

    // Insert transaction record
    const { error: txError } = await supabase
      .from('gem_transactions')
      .insert({
        user_id: userId,
        amount: gemAmount,
        transaction_type: 'purchase',
        provider_id: providerId,
        provider: provider,
        metadata: metadata || {}
      });

    if (txError) {
      console.error('Error inserting transaction:', txError);
      return { success: false, error: txError.message };
    }

    // Update user's gem balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gems')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return { success: false, error: 'User not found' };
    }

    const newGemBalance = (profile.gems || 0) + gemAmount;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ gems: newGemBalance })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating gems:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error processing gem purchase:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Universal Webhook Handler for Stripe and RevenueCat
 * Single endpoint that handles both payment providers (legacy/fallback)
 * 
 * Configure webhook URLs:
 * - Stripe: https://your-domain.com/api/webhooks/incoming-payments (or use /api/webhooks/stripe)
 * - RevenueCat: https://your-domain.com/api/webhooks/incoming-payments
 * 
 * Stripe events: checkout.session.completed
 * RevenueCat events: INITIAL_PURCHASE, RENEWAL, and custom consumable events
 * 
 * Note: This route uses raw body parsing to support Stripe signature verification
 */
app.post('/api/webhooks/incoming-payments', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Detect provider based on headers
    const stripeSignature = req.headers['stripe-signature'] as string;
    const revenueCatAuth = req.headers['authorization'] as string;
    
    // Get raw body (Buffer for Stripe, convert to string for RevenueCat)
    const rawBody = req.body as Buffer;
    const bodyString = rawBody.toString('utf8');
    
    // Handle Stripe webhook
    if (stripeSignature) {
      return await handleStripeWebhook(rawBody, stripeSignature, res);
    }
    
    // Handle RevenueCat webhook
    if (revenueCatAuth) {
      return await handleRevenueCatWebhook(bodyString, revenueCatAuth, res);
    }

    // No recognized provider
    console.error('❌ Unknown webhook provider - missing signature headers');
    return res.status(400).json({ error: 'Unknown webhook provider' });
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Handle Stripe webhook events
 */
async function handleStripeWebhook(rawBody: Buffer, signature: string, res: express.Response): Promise<express.Response> {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('❌ Stripe webhook secret not configured');
      console.error('⚠️ Set STRIPE_WEBHOOK_SECRET environment variable');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Initialize Stripe client using process.env.STRIPE_SECRET_KEY
    // Note: In TypeScript we use dynamic import, but the logic is equivalent to:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const Stripe = (await import('stripe')).default;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      console.error('⚠️ Set STRIPE_SECRET_KEY environment variable');
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    // Initialize Stripe client
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-11-17.clover' });
    
    // Verify webhook signature using stripe.webhooks.constructEvent
    // This uses req.body (rawBody) and the signature from headers
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody, // req.body (raw Buffer)
        signature, // sig from headers
        STRIPE_WEBHOOK_SECRET // process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('❌ Stripe signature verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid signature' });
    }


    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      
      
      // Extract metadata from session - support both snake_case and camelCase naming
      // Flexible extraction: Check both supabaseUserId/user_id and gemAmount/gem_amount
      const userId = session.metadata?.supabaseUserId || session.metadata?.user_id;
      const amount = parseInt(session.metadata?.gemAmount || session.metadata?.gem_amount || '0', 10);
      const platform = session.metadata?.platform || 'web'; // Track platform for analytics
      const paymentIntentId = session.payment_intent;
      
      
      if (!userId || !amount || isNaN(amount) || amount <= 0 || !paymentIntentId) {
        console.error('❌ Missing required fields in Stripe webhook:', {
          userId,
          amount,
          paymentIntentId,
          hasMetadata: !!session.metadata,
          metadataKeys: session.metadata ? Object.keys(session.metadata) : [],
          metadataValues: session.metadata
        });
        return res.status(400).json({ error: 'Missing required fields in metadata' });
      }

      // Call Supabase RPC function to add gems to user
      if (!supabase) {
        console.error('❌ Supabase not configured');
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      try {
        // Diagnostic log as requested
        
        // Call Supabase RPC function add_gems_to_user
        // Function signature: add_gems_to_user(amount, session_id, user_id)
        // Note: Parameter order matches SQL function definition
        const { data, error: rpcError } = await supabase.rpc('add_gems_to_user', {
          amount: amount,
          session_id: session.id,
          user_id: userId
        });

        if (rpcError) {
          console.error('❌ RPC error:', rpcError);
          return res.status(500).json({ error: rpcError.message || 'Failed to add gems' });
        }

        return res.json({ received: true, credited: amount, provider: 'stripe' });
      } catch (rpcErr: any) {
        console.error('❌ Exception calling add_gems_to_user:', rpcErr);
        return res.status(500).json({ error: rpcErr.message || 'Failed to process purchase' });
      }
    }

    // Ignore other event types (return success to acknowledge receipt)
    return res.json({ received: true, provider: 'stripe' });
  } catch (error: any) {
    console.error('❌ Stripe webhook handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Handle RevenueCat webhook events
 */
async function handleRevenueCatWebhook(payload: string, authHeader: string, res: express.Response): Promise<express.Response> {
  try {
    // Extract signature from Authorization header (may be "Bearer <signature>" or just the signature)
    let signature = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      signature = authHeader.substring(7);
    }

    // Verify RevenueCat signature
    if (!verifyRevenueCatSignature(payload, signature)) {
      console.error('❌ Invalid RevenueCat webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);

    // Handle INITIAL_PURCHASE and RENEWAL events (for consumables)
    if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
      const transactionId = event.transaction_id;
      const appUserId = event.app_user_id; // Supabase user ID
      const productId = event.product_id;
      
      if (!appUserId || !transactionId) {
        console.error('❌ Missing required fields in RevenueCat webhook');
        return res.status(400).json({ error: 'Missing required fields: app_user_id or transaction_id' });
      }

      // Map product_id to gem amount
      // Configure this mapping based on your RevenueCat offerings
      const GEM_PACK_MAP: Record<string, number> = {
        'gem_1': 250,
        'gem_2': 700,
        'gem_3': 1500,
        'gem_4': 3200,
        'gem_5': 8500,
        'gem_6': 18000,
      };

      // Also check for custom event types (consumables)
      // RevenueCat may send custom event types for consumable products
      const gemAmount = GEM_PACK_MAP[productId] || event.gem_amount || null;
      
      if (!gemAmount || isNaN(gemAmount)) {
        console.warn('⚠️ Unknown product ID or missing gem amount:', productId);
        return res.status(400).json({ error: 'Unknown product or missing gem amount' });
      }

      // Process the purchase
      const result = await processGemPurchase(
        appUserId,
        gemAmount,
        'revenuecat',
        transactionId,
        { 
          product_id: productId,
          event_type: event.type,
          store: event.store
        }
      );

      if (!result.success) {
        console.error('❌ Failed to process RevenueCat purchase:', result.error);
        return res.status(500).json({ error: result.error || 'Failed to process purchase' });
      }

      return res.json({ received: true, credited: gemAmount, provider: 'revenuecat' });
    }

    // Handle SUBSCRIBER_ALIAS_UPDATED (user ID linked) - informational only
    if (event.type === 'SUBSCRIBER_ALIAS_UPDATED') {
      const alias = event.subscriber?.alias;
      const userId = alias; // RevenueCat alias should be the Supabase user ID
      
      if (userId) {
      }
      return res.json({ received: true, provider: 'revenuecat' });
    }

    // Ignore other event types
    return res.json({ received: true, provider: 'revenuecat' });
  } catch (error: any) {
    console.error('❌ RevenueCat webhook handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Universal Stripe Checkout Session Creation
 * Platform-agnostic endpoint that handles Web, iOS, and Android checkout
 * 
 * Request Body:
 * {
 *   user_id: string (Supabase UUID) - REQUIRED
 *   priceId: string (Stripe Price ID) - REQUIRED
 *   gemAmount: number (integer) - REQUIRED
 *   platform: 'web' | 'ios' | 'android' - REQUIRED
 *   successUrl?: string (optional, defaults based on platform)
 *   cancelUrl?: string (optional, defaults based on platform)
 * }
 */
app.post('/api/stripe/create-checkout', async (req, res) => {
  try {
    const Stripe = (await import('stripe')).default;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-11-17.clover' });
    
    // Extract and validate required fields
    const { user_id, supabase_user_id, priceId, gemAmount, platform, successUrl, cancelUrl } = req.body;
    
    // Support both user_id and supabase_user_id for backward compatibility
    const userId = user_id || supabase_user_id;
    
    if (!userId || !priceId || !gemAmount || !platform) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id (or supabase_user_id), priceId, gemAmount, platform' 
      });
    }

    // Validate platform
    const validPlatforms = ['web', 'ios', 'android'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ 
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` 
      });
    }

    // Determine redirect URLs based on platform
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let finalSuccessUrl: string;
    let finalCancelUrl: string;

    if (successUrl && cancelUrl) {
      // Use provided URLs if available
      finalSuccessUrl = successUrl;
      finalCancelUrl = cancelUrl;
    } else if (platform === 'web') {
      // Web: Use HTTP/HTTPS URLs
      finalSuccessUrl = successUrl || `${frontendUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`;
      finalCancelUrl = cancelUrl || `${frontendUrl}/purchase-cancel`;
    } else {
      // Mobile: Use deep links (iOS/Android)
      // Note: Stripe Checkout on mobile web browsers can redirect to deep links
      // For native apps, you might use Stripe Payment Sheet instead
      const deepLinkScheme = 'thirteencards://'; // Your app's custom URL scheme
      finalSuccessUrl = successUrl || `${deepLinkScheme}purchase-success?session_id={CHECKOUT_SESSION_ID}`;
      finalCancelUrl = cancelUrl || `${deepLinkScheme}purchase-cancel`;
    }

    // Standardize metadata - always use these field names
    // This ensures webhook handler can reliably extract data
    const metadata = {
      user_id: userId,                    // Standardized: always user_id
      gem_amount: gemAmount.toString(),  // Standardized: always gem_amount
      platform: platform,                 // Track where the sale came from
      // Also include camelCase versions for compatibility
      supabaseUserId: userId,
      gemAmount: gemAmount.toString(),
    };

    // Create Stripe Checkout Session using the Price ID
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId, // Use the actual Stripe Price ID
        quantity: 1,
      }],
      mode: 'payment',
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: metadata,
    });
    
    
    return res.json({ 
      checkoutUrl: session.url,
      sessionId: session.id,
      platform: platform
    });
  } catch (error: any) {
    console.error('Stripe checkout creation error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

const generateRoomCode = (): string => 'ABCD'.split('').map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 36))).join('');
const PORT = process.env.PORT || 3001;

// ============================================================================
// SERVER STARTUP - Ensure exactly one process listens
// ============================================================================
// Guard against multiple server starts (hot reload, duplicate imports, etc.)
if (!process.env.SERVER_STARTED) {
  process.env.SERVER_STARTED = "true";
  
  try {
    httpServer.listen(PORT, () => {
      console.log("🚀 SERVER LISTENING", {
        pid: process.pid,
        port: PORT,
        timestamp: new Date().toISOString(),
      });
      console.log(`📡 Socket.io server ready for connections`);
    });
  } catch (err) {
    console.error("FATAL SERVER START ERROR:", err);
    process.exit(1);
  }
} else {
  console.warn("⚠️ SERVER ALREADY STARTED - Skipping duplicate listen() call", {
    pid: process.pid,
    existingPort: PORT,
  });
}
