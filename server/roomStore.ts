// ============================================================================
// ROOM STORE - True Singleton using globalThis
// ============================================================================
// This module uses globalThis to ensure there is exactly one rooms object
// per Node.js process, regardless of how many times the module is imported
// or via which import path (ESM module duplication protection).

// Import types from server.ts (we'll define GameRoom here to avoid circular deps)
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
  turnDuration: number;
  turnStartTime?: number;
  playerSpeedData: Record<string, PlayerSpeedData>;
  playerMutedByAfk: Set<string>;
  quickMoveRewardGiven: Set<string>;
}

// ============================================================================
// GLOBAL SINGLETON PATTERN - Prevents ESM module duplication
// ============================================================================
declare global {
  // eslint-disable-next-line no-var
  var __ROOM_STORE__: Record<string, GameRoom> | undefined;
  // eslint-disable-next-line no-var
  var __SOCKET_TO_ROOM__: Record<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __SOCKET_TO_PLAYER_ID__: Record<string, string> | undefined;
}

// ============================================================================
// SINGLE SOURCE OF TRUTH - ONE rooms object for entire server
// ============================================================================
// Initialize the singleton ONCE. This object is NEVER reassigned.
// All code must import and use this exact reference.
if (!globalThis.__ROOM_STORE__) {
  globalThis.__ROOM_STORE__ = {};
}

// Export the singleton - this reference is NEVER reassigned
export const rooms: Record<string, GameRoom> = globalThis.__ROOM_STORE__ as Record<string, GameRoom>;

export const socketToRoom =
  globalThis.__SOCKET_TO_ROOM__ ??
  (globalThis.__SOCKET_TO_ROOM__ = {});

export const socketToPlayerId =
  globalThis.__SOCKET_TO_PLAYER_ID__ ??
  (globalThis.__SOCKET_TO_PLAYER_ID__ = {});

const loadTime = Date.now();
console.log("🔥 roomStore loaded", {
  timestamp: loadTime,
  identity: rooms,
  isNewInstance: !globalThis.__ROOM_STORE__ || globalThis.__ROOM_STORE__ === rooms,
  roomCount: Object.keys(rooms).length
});
