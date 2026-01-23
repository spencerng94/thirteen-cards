// ============================================================================
// PROCESS IDENTITY - Verify single process execution
// ============================================================================
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

interface GameRoom {
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
  turnStartTime?: number; // When current turn started
  playerSpeedData: Record<string, PlayerSpeedData>; // playerId -> speed data
  playerMutedByAfk: Set<string>; // playerIds muted due to AFK
  quickMoveRewardGiven: Set<string>; // playerIds who have received quick move reward this game
}

// Import socket mappings from roomStore
import { socketToRoom, socketToPlayerId } from './roomStore';

// Import rooms singleton, functions, and types from rooms.ts
import { rooms, createRoom, joinRoom, getRoom, getPublicRooms, getAllRoomIds, type SimplePlayer, type GameRoom } from './rooms';

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
    origin: "http://localhost:3000",
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
// ROOM STORE - Using singleton from rooms.ts
// ============================================================================
// The rooms Map is imported from rooms.ts which provides a true singleton
// that persists across hot reloads via global.__GLOBAL_ROOMS_MAP__
// All handlers use the same persistent Map instance
console.log('📦 Rooms Map imported from rooms.ts singleton');
console.log('📋 Initial room count:', rooms.size);

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

const broadcastState = (roomId: string) => {
  const room = rooms.get(roomId);
  if (!room) return;
  const state = getGameStateData(room);
  io.to(roomId).emit('game_state', state);
  room.players.forEach(p => {
    if (!p.isBot && !p.isOffline) io.to(p.socketId).emit('player_hand', p.hand);
  });
};

const getPublicRoomsList = () => {
  // Use the getPublicRooms function for consistency
  const publicRooms = getPublicRooms();
  
  // Enhance with host information for compatibility
  return publicRooms.map(room => {
    const fullRoom = rooms.get(room.id);
    return {
      id: room.id,
      name: room.name,
      playerCount: room.playerCount,
      turnTimer: room.turnTimer,
      hostName: fullRoom?.players.find(p => p.isHost)?.name || 'Unknown',
      hostAvatar: fullRoom?.players.find(p => p.isHost)?.avatar || ':smile:'
    };
  });
};

const broadcastPublicLobbies = () => {
  io.emit('public_rooms_list', getPublicRoomsList());
};

const startTurnTimer = (roomId: string) => {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'PLAYING') return;
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

const handleTurnTimeout = (roomId: string) => {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'PLAYING') return;
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.finishedRank || currentPlayer.isBot) {
    room.currentPlayerIndex = getNextActivePlayerIndex(room, room.currentPlayerIndex, true);
    startTurnTimer(roomId);
    broadcastState(roomId);
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
    handlePlay(roomId, currentPlayer.id, cardToPlay);
  } else {
    handlePass(roomId, currentPlayer.id);
  }
};

const handlePlay = (roomId: string, playerId: string, cards: Card[]) => {
  const room = rooms.get(roomId);
  if (!room) return;
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
        broadcastState(roomId); 
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
  
  startTurnTimer(roomId);
  broadcastState(roomId);
  checkBotTurn(roomId);
};

const handlePass = (roomId: string, playerId: string) => {
  const room = rooms.get(roomId);
  if (!room) return;
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
  startTurnTimer(roomId);
  broadcastState(roomId);
  checkBotTurn(roomId);
};

const checkBotTurn = (roomId: string) => {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'PLAYING') return;
  const curPlayer = room.players[room.currentPlayerIndex];
  if (curPlayer?.isBot && !curPlayer.finishedRank) {
    // Random delay between 2-4 seconds
    const delay = 2000 + Math.random() * 2000;
    
    setTimeout(() => {
        const roomRef = rooms.get(roomId);
        if (!roomRef || roomRef.currentPlayerIndex !== room.currentPlayerIndex) return;
        
        // Weighted random: 80% smart move, 20% mistake
        const shouldMakeMistake = Math.random() < 0.2;
        
        let move: Card[] | null = null;
        if (shouldMakeMistake) {
          // 20% chance: Make a mistake (play a random card or suboptimal move)
          const sortedHand = sortCards(curPlayer.hand);
          if (room.currentPlayPile.length === 0) {
            // Leading: play a random card (might not be optimal)
            move = [sortedHand[Math.floor(Math.random() * sortedHand.length)]];
          } else {
            // Try to find a valid move, but pick a random one instead of best
            const lastTurn = room.currentPlayPile[room.currentPlayPile.length - 1];
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
          move = findBestMove(curPlayer.hand, room.currentPlayPile, room.isFirstTurnOfGame);
        }
        
        if (move) {
          handlePlay(roomId, curPlayer.id, move);
        } else {
          if (room.currentPlayPile.length === 0) {
            // Hard Fail-safe: leader must play.
            const sortedHand = sortCards(curPlayer.hand);
            handlePlay(roomId, curPlayer.id, [sortedHand[0]]);
          } else {
            handlePass(roomId, curPlayer.id);
          }
        }
    }, delay);
  }
};

const performCleanup = (roomId: string, playerId: string) => {
  const room = rooms.get(roomId);
  if (!room) return;
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
    rooms.delete(roomId);
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
console.log('📋 Registering socket handlers - Rooms Map size:', rooms.size);

// Mark handlers as registered BEFORE registering to prevent race conditions
globalThis.__SOCKET_HANDLERS_REGISTERED__ = true;

io.on('connection', (socket: Socket) => {
  console.log('🚀 SOCKET CONNECTED:', socket.id);
  
  // ============================================================================
  // CRITICAL: ROOMS MAP PERSISTENCE GUARD
  // ============================================================================
  // The 'rooms' Map is imported from rooms.ts as a singleton that persists
  // across hot reloads via global.__GLOBAL_ROOMS_MAP__
  // 
  // IT IS NEVER RESET, CLEARED, OR REASSIGNED INSIDE THIS CONNECTION HANDLER.
  // All handlers below use the same persistent Map instance.
  //
  // ============================================================================
  // CRITICAL VERIFICATION: Ensure rooms Map is the same instance
  // ============================================================================
  // This check ensures that the rooms Map hasn't been reassigned or replaced
  const globalMap = (global as any).__GLOBAL_ROOMS_MAP__;
  if (!globalMap) {
    console.error('🚨 CRITICAL ERROR: global.__GLOBAL_ROOMS_MAP__ is undefined!');
    throw new Error('CRITICAL: global.__GLOBAL_ROOMS_MAP__ is undefined');
  }
  
  if (rooms !== globalMap) {
    console.error('🚨 CRITICAL ERROR: rooms Map is NOT the same instance as global.__GLOBAL_ROOMS_MAP__!');
    console.error('🚨 This indicates rooms was reassigned or a new Map was created.');
    console.error('🚨 rooms identity:', rooms);
    console.error('🚨 global.__GLOBAL_ROOMS_MAP__ identity:', globalMap);
    console.error('🚨 rooms size:', rooms.size);
    console.error('🚨 globalMap size:', globalMap.size);
    throw new Error('CRITICAL: rooms Map instance mismatch - rooms may have been reassigned');
  }
  
  // Additional check: if Map is empty but we know rooms were created, something is wrong
  const mapSize = rooms.size;
  const mapKeys = Array.from(rooms.keys());
  console.log(`📋 Connection: Rooms Map size: ${mapSize}, Keys: [${mapKeys.join(', ')}]`);
  console.log(`📋 Connection: Rooms Map identity verified: ${rooms === globalMap}`);
  console.log(`📋 Connection: Global Map size: ${globalMap.size}, Keys: [${Array.from(globalMap.keys()).join(', ')}]`);
  
  // VERIFICATION: Ensure rooms Map is not being reset
  if (mapSize === 0 && (global as any).__ROOMS_EVER_CREATED__) {
    console.error('🚨 WARNING: Rooms Map is empty but rooms were previously created!');
    console.error('🚨 This indicates the server process restarted or the Map was cleared.');
    console.error('🚨 Checking if Map was replaced...');
    console.error('🚨 rooms === globalMap:', rooms === globalMap);
    console.error('🚨 rooms.constructor:', rooms.constructor.name);
    console.error('🚨 globalMap.constructor:', globalMap.constructor.name);
  }
  
  // Catch-All logger to see ALL events
  socket.onAny((event, ...args) => {
    console.log(`📡 RECEIVED EVENT: ${event}`, args);
  });

  socket.emit('public_rooms_list', getPublicRoomsList());

  socket.on('create_room', (data, callback) => {
    console.log('✅ CREATE_ROOM: Received request from', socket.id, data);
    
    // Rate limit check
    const rateLimitResult = checkRateLimit(socket.id, 'create_room');
    if (!rateLimitResult.allowed) {
      const errorMsg = 'You\'re creating rooms too quickly. Please wait a moment and try again.';
      console.warn('⚠️ CREATE_ROOM: Rate limited', socket.id);
      if (callback) callback({ error: errorMsg });
      else socket.emit('error', errorMsg);
      return;
    }
    
    // SECURITY: Sanitize and validate input
    const { name, avatar, playerId, isPublic, roomName, turnTimer, selected_sleeve_id } = data;
    const sanitizedName = (name || 'GUEST').trim().substring(0, 20).replace(/[<>\"'&]/g, '') || 'GUEST';
    const sanitizedAvatar = (avatar || ':smile:').trim().substring(0, 50);
    const sanitizedRoomName = roomName ? roomName.trim().substring(0, 24).replace(/[<>\"'&]/g, '') : `${sanitizedName.toUpperCase()}'S MATCH`;
    const validTurnTimer = typeof turnTimer === 'number' && [0, 15, 30, 60].includes(turnTimer) ? turnTimer : 30;
    const sanitizedSleeveId = selected_sleeve_id && typeof selected_sleeve_id === 'string' && selected_sleeve_id.length <= 50 ? selected_sleeve_id.trim() : undefined;
    
    try {
      const pId = playerId || uuidv4();
      
      // Create player object
      const player: SimplePlayer = {
        id: pId,
        name: sanitizedName,
        avatar: sanitizedAvatar
      };
      
      // Use createRoom function to create the room (uses singleton Map)
      const newRoom = createRoom(player, sanitizedRoomName, isPublic === true, validTurnTimer);
      const roomId = newRoom.id;
      
      // Verify room was saved to singleton Map
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
      
      // Send callback response
      if (callback) {
        callback({ roomId });
      }
      
      // IMPORTANT: Notify client of room creation (for UI navigation)
      socket.emit('room_created', { roomId, settings: data });
      console.log(`🚀 SERVER: Sent room_created for ID: '${roomId}'`);
      
      // Send game state to the creator
      const state = getGameStateData(newRoom);
      socket.emit('game_state', state);
      socket.emit('room_update', state);
      
      if (roomPlayer && !roomPlayer.isBot && !roomPlayer.isOffline) {
        socket.emit('player_hand', roomPlayer.hand);
      }
      
      console.log(`🎮 Room ${roomId} created by ${sanitizedName}`);
      console.log(`✅ CREATE_ROOM SUCCESS: Map size: ${rooms.size}, Room exists: ${rooms.has(roomId)}, Room ID: '${roomId}'`);

      // Broadcast to all players
      broadcastState(roomId);
      broadcastPublicLobbies();
    } catch (error: any) {
      console.error('❌ CREATE_ROOM ERROR:', error);
      const errorMsg = error.message || 'Unable to create room. Please try again.';
      if (callback) {
        callback({ error: errorMsg });
      } else {
        socket.emit('error', errorMsg);
      }
    }
  });

  socket.on('join_room', ({ roomId, name, avatar, playerId, selected_sleeve_id }, callback) => {
    const requestedId = roomId;
    console.log(`🔍 JOIN_ROOM: Client ${socket.id} is looking for: '${requestedId}'`);
    console.log(`📋 JOIN_ROOM: Current Map size: ${rooms.size}, All room keys: [${Array.from(rooms.keys()).join(', ')}]`);
    
    // SECURITY: Validate roomId format (accepts both 4-character codes and LOBBY_XXXXX format)
    if (!requestedId || typeof requestedId !== 'string') {
      console.error('❌ JOIN_ROOM: Invalid roomId format:', requestedId, typeof requestedId);
      const errorMsg = 'Invalid room code.';
      if (callback) {
        callback({ 
          error: errorMsg, 
          availableRooms: Array.from(rooms.keys()) 
        });
      } else {
        socket.emit('error', errorMsg);
      }
      return;
    }
    
    // Accept either 4-character codes (ABCD) or LOBBY_XXXXX format
    const isValidFormat = /^[A-Z0-9]{4}$/i.test(requestedId) || /^LOBBY_[A-Z0-9]+$/i.test(requestedId);
    if (!isValidFormat) {
      console.error('❌ JOIN_ROOM: RoomId format validation failed:', requestedId);
      const errorMsg = 'Invalid room code format.';
      if (callback) {
        callback({ 
          error: errorMsg, 
          availableRooms: Array.from(rooms.keys()) 
        });
      } else {
        socket.emit('error', errorMsg);
      }
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
      
      // Use joinRoom function to join the room (uses singleton Map)
      const room = joinRoom(player, requestedId);
      
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
      
      // Join socket to room
      socket.join(requestedId);
      
      // Send callback response
      if (callback) {
        callback({ 
          success: true, 
          room: {
            id: room.id,
            name: room.roomName,
            players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
            isPublic: room.isPublic,
            turnTimer: room.turnDuration / 1000
          }
        });
      }
      
      // Send game state to the joining player
      const state = getGameStateData(room);
      socket.emit('game_state', state);
      socket.emit('room_update', state);
      
      if (roomPlayer && !roomPlayer.isBot && !roomPlayer.isOffline) {
        socket.emit('player_hand', roomPlayer.hand);
      }
      
      console.log(`👤 Player ${socket.id} (${sanitizedName}) joined '${requestedId}'`);
      console.log(`✅ JOIN_ROOM SUCCESS: Map size: ${rooms.size}, Room exists: ${rooms.has(requestedId)}, Room ID: '${requestedId}'`);
      
      // Broadcast to all players in the room
      broadcastState(requestedId);
      broadcastPublicLobbies();
    } catch (error: any) {
      console.error(`❌ JOIN_ROOM ERROR for '${requestedId}':`, error.message);
      console.error(`📋 JOIN_ROOM: Available rooms: [${Array.from(rooms.keys()).join(', ')}]`);
      const errorMsg = error.message || 'Unable to join room. Please try again.';
      const availableRooms = Array.from(rooms.keys());
      
      if (callback) {
        callback({ 
          error: errorMsg, 
          availableRooms: availableRooms 
        });
      } else {
        socket.emit('error', errorMsg);
      }
    }
  });

  socket.on('add_bot', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'LOBBY' || room.players.length >= 4) return;
    const requesterId = playerId || socketToPlayerId[socket.id];
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return;
    const botId = 'bot-' + Math.random().toString(36).substr(2, 9);
    room.players.push({
      id: botId, name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], avatar: getRandomEmote(),
      socketId: 'BOT', hand: [], isHost: false, hasPassed: false, finishedRank: null, isBot: true, difficulty: 'MEDIUM'
    });
    broadcastState(roomId);
    broadcastPublicLobbies();
  });

  socket.on('update_bot_difficulty', ({ roomId, botId, difficulty, playerId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'LOBBY') return;
    const requesterId = playerId || socketToPlayerId[socket.id];
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return;
    const bot = room.players.find(p => p.id === botId);
    if (bot) {
      bot.difficulty = difficulty;
      broadcastState(roomId);
    }
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

  socket.on('remove_bot', ({ roomId, botId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'LOBBY') return;
    const requesterId = playerId || socketToPlayerId[socket.id];
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return;
    room.players = room.players.filter(p => p.id !== botId);
    broadcastState(roomId);
    broadcastPublicLobbies();
  });

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

  socket.on('start_game', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const pId = playerId || socketToPlayerId[socket.id];
    const requester = room.players.find(p => p.id === pId);
    if (!requester || !requester.isHost) return;
    if (pId) mapIdentity(socket, roomId, pId);

    // Don't auto-fill CPUs - users should manually add them if needed

    const deck: Card[] = [];
    for (let s = 0; s < 4; s++) for (let r = 3; r <= 15; r++) deck.push({ suit: s as Suit, rank: r as Rank, id: uuidv4() });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    room.players.forEach((p, i) => { p.hand = deck.slice(i * 13, (i + 1) * 13); p.hasPassed = false; p.finishedRank = null; });
    let starter = 0;
    let minScore = 999;
    let threeSpadesFound = false;
    room.players.forEach((p, i) => {
      p.hand.forEach(card => {
        const score = card.rank * 10 + card.suit;
        if (score < minScore) { minScore = score; starter = i; }
        if (card.rank === Rank.Three && card.suit === Suit.Spades) threeSpadesFound = true;
      });
    });
    room.status = 'PLAYING'; room.currentPlayerIndex = starter; room.isFirstTurnOfGame = threeSpadesFound;
    room.currentPlayPile = []; room.roundHistory = []; room.finishedPlayers = [];
    // Reset quick move reward tracking for new game
    room.quickMoveRewardGiven = new Set();
    startTurnTimer(roomId);
    broadcastState(roomId);
    checkBotTurn(roomId);
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

  socket.on('get_public_rooms', () => {
    console.log('📋 GET_PUBLIC_ROOMS: Requested');
    console.log('📋 Rooms Map size:', rooms.size);
    
    // Rate limit check
    const rateLimitResult = checkRateLimit(socket.id, 'get_public_rooms');
    if (!rateLimitResult.allowed) {
      socket.emit('error', 'Rate limit exceeded. Please wait before requesting room list again.');
      return;
    }
    
    const publicRooms = getPublicRooms();
    console.log(`📋 Found ${publicRooms.length} public rooms`);
    socket.emit('public_rooms_list', getPublicRoomsList());
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

  socket.on('disconnect', () => {
    const roomId = socketToRoom[socket.id];
    const playerId = socketToPlayerId[socket.id];
    
    // Clean up rate limit data for this socket
    clearRateLimit(socket.id);
    
    if (!roomId || !playerId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    if (room.status !== 'PLAYING') {
        performCleanup(roomId, playerId);
    } else {
        player.isOffline = true;
        broadcastState(roomId);
        player.reconnectionTimeout = setTimeout(() => performCleanup(roomId, playerId), RECONNECTION_GRACE_PERIOD);
    }
    delete socketToRoom[socket.id];
    delete socketToPlayerId[socket.id];
  });
});

console.log('✅ Socket handlers registered');

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
