
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory types (mirroring client types for simplicity in this file)
enum Suit { Spades = 0, Clubs = 1, Diamonds = 2, Hearts = 3 }
enum Rank { Three = 3, Four = 4, Five = 5, Six = 6, Seven = 7, Eight = 8, Nine = 9, Ten = 10, Jack = 11, Queen = 12, King = 13, Ace = 14, Two = 15 }

interface Card {
  rank: Rank;
  suit: Suit;
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
  finishedRank: number | null; // 1, 2, 3...
  isBot?: boolean;
}

interface PlayTurn {
  playerId: string;
  cards: Card[];
  comboType: string;
}

interface GameRoom {
  id: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: Player[];
  currentPlayerIndex: number;
  currentPlayPile: PlayTurn[];
  lastPlayerToPlayId: string | null; 
  finishedPlayers: string[]; // Track IDs in order
  isFirstTurnOfGame: boolean;
}

const BOT_AVATARS = ['🤖', '👾', '👽', '🤡', '👹', '👺', '👻'];

const app = express();
const httpServer = createServer(app);

// Use environment variable for CORS origin with local fallback
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

// Configure Express CORS
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST"],
  credentials: true
}));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigin, 
    methods: ["GET", "POST"],
    credentials: true
  }
});

const rooms: Record<string, GameRoom> = {};
const socketRoomMap: Record<string, string> = {}; 

// --- Logic Helpers ---

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getCardScore = (card: Card): number => {
  return card.rank * 10 + card.suit;
};

const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => getCardScore(a) - getCardScore(b));
};

type ComboType = 'SINGLE' | 'PAIR' | 'TRIPLE' | 'QUAD' | 'RUN' | '3_PAIRS' | 'INVALID';

const getComboType = (cards: Card[]): ComboType => {
  const sorted = sortCards(cards);
  const len = sorted.length;
  
  if (len === 0) return 'INVALID';
  if (len === 1) return 'SINGLE';

  const isSameRank = sorted.every(c => c.rank === sorted[0].rank);
  if (isSameRank) {
    if (len === 2) return 'PAIR';
    if (len === 3) return 'TRIPLE';
    if (len === 4) return 'QUAD';
    return 'INVALID';
  }

  let isRun = true;
  for (let i = 0; i < len - 1; i++) {
    if (sorted[i].rank === Rank.Two || sorted[i+1].rank === Rank.Two) {
      isRun = false; 
      break;
    }
    if (sorted[i+1].rank !== sorted[i].rank + 1) {
      isRun = false;
      break;
    }
  }
  if (isRun && len >= 3) return 'RUN';

  if (len === 6) {
    const isPairs = 
      sorted[0].rank === sorted[1].rank &&
      sorted[2].rank === sorted[3].rank &&
      sorted[4].rank === sorted[5].rank;
    
    if (isPairs) {
      if (sorted[2].rank === sorted[0].rank + 1 && sorted[4].rank === sorted[2].rank + 1) {
        if (sorted[5].rank !== Rank.Two) {
            return '3_PAIRS';
        }
      }
    }
  }

  return 'INVALID';
};

const getHighestCard = (cards: Card[]): Card => {
    const sorted = sortCards(cards);
    return sorted[sorted.length - 1];
};

const validateMove = (
  playedCards: Card[], 
  currentPlayPile: PlayTurn[], 
  playerHand: Card[],
  isFirstTurnOfGame: boolean
): { isValid: boolean; reason: string } => {
  
  const handIds = new Set(playerHand.map(c => c.id));
  for (const c of playedCards) {
    if (!handIds.has(c.id)) {
      return { isValid: false, reason: "You don't have these cards." };
    }
  }

  const