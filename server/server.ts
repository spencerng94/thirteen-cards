
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

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
  finishedPlayers: string[];
  isFirstTurnOfGame: boolean;
}

const BOT_AVATARS = ['🤖', '👾', '👽', '🤡', '👹', '👺', '👻'];

const app = express();
const httpServer = createServer(app);
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({ origin: allowedOrigin, credentials: true }));

const io = new Server(httpServer, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST"], credentials: true }
});

const rooms: Record<string, GameRoom> = {};

// Logic Helpers
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const getGameState = (room: GameRoom) => ({
  roomId: room.id,
  status: room.status,
  players: room.players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    cardCount: p.hand.length,
    isHost: p.isHost,
    hasPassed: p.hasPassed,
    finishedRank: p.finishedRank,
    isBot: p.isBot,
    difficulty: p.difficulty
  })),
  currentPlayerId: room.status === 'PLAYING' ? room.players[room.currentPlayerIndex]?.id : null,
  currentPlayPile: room.currentPlayPile,
  lastPlayerToPlayId: room.lastPlayerToPlayId,
  finishedPlayers: room.finishedPlayers,
  isFirstTurnOfGame: room.isFirstTurnOfGame
});

const broadcastState = (roomId: string) => {
  const room = rooms[roomId];
  if (!room) return;
  const state = getGameState(room);
  io.to(roomId).emit('game_state', state);
  
  // Send private hands
  room.players.forEach(p => {
    if (!p.isBot) io.to(p.socketId).emit('player_hand', p.hand);
  });
};

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', ({ name, avatar }) => {
    const roomId = generateRoomCode();
    rooms[roomId] = {
      id: roomId,
      status: 'LOBBY',
      players: [{
        id: socket.id,
        name,
        avatar,
        socketId: socket.id,
        hand: [],
        isHost: true,
        hasPassed: false,
        finishedRank: null
      }],
      currentPlayerIndex: 0,
      currentPlayPile: [],
      lastPlayerToPlayId: null,
      finishedPlayers: [],
      isFirstTurnOfGame: true
    };
    socket.join(roomId);
    broadcastState(roomId);
  });

  socket.on('join_room', ({ roomId, name, avatar }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', 'Room not found.');
    if (room.status !== 'LOBBY') return socket.emit('error', 'Game already started.');
    if (room.players.length >= 4) return socket.emit('error', 'Room is full.');

    room.players.push({
      id: socket.id,
      name,
      avatar,
      socketId: socket.id,
      hand: [],
      isHost: false,
      hasPassed: false,
      finishedRank: null
    });
    socket.join(roomId);
    broadcastState(roomId);
  });

  socket.on('add_bot', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.players.length >= 4) return;
    
    // Check if requester is host
    const requester = room.players.find(p => p.socketId === socket.id);
    if (!requester?.isHost) return;

    const botId = `bot-${uuidv4()}`;
    room.players.push({
      id: botId,
      name: `CPU ${room.players.length}`,
      avatar: BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)],
      socketId: 'bot',
      hand: [],
      isHost: false,
      hasPassed: false,
      finishedRank: null,
      isBot: true,
      difficulty: 'MEDIUM' // Default difficulty initialized
    });
    broadcastState(roomId);
  });

  socket.on('remove_bot', ({ roomId, botId }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    // Check if requester is host
    const requester = room.players.find(p => p.socketId === socket.id);
    if (!requester?.isHost) return;

    // Filter out the bot
    room.players = room.players.filter(p => p.id !== botId);
    broadcastState(roomId);
  });

  socket.on('update_bot_difficulty', ({ roomId, botId, difficulty }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check if requester is host
    const requester = room.players.find(p => p.socketId === socket.id);
    if (!requester?.isHost) return;

    const bot = room.players.find(p => p.id === botId);
    if (bot && bot.isBot) {
      bot.difficulty = difficulty;
      broadcastState(roomId);
    }
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;
    
    const requester = room.players.find(p => p.socketId === socket.id);
    if (!requester?.isHost) return;

    // Deck Generation & Dealing
    const deck: Card[] = [];
    for (let s = 0; s < 4; s++) {
      for (let r = 3; r <= 15; r++) {
        deck.push({ suit: s as Suit, rank: r as Rank, id: uuidv4() });
      }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Deal
    room.players.forEach((p, i) => {
      p.hand = deck.slice(i * 13, (i + 1) * 13);
      p.hasPassed = false;
      p.finishedRank = null;
    });

    // Find who has 3 of Spades
    let starterIndex = 0;
    room.players.forEach((p, i) => {
      if (p.hand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) starterIndex = i;
    });

    room.status = 'PLAYING';
    room.currentPlayerIndex = starterIndex;
    room.isFirstTurnOfGame = true;
    room.currentPlayPile = [];
    room.finishedPlayers = [];
    room.lastPlayerToPlayId = null;

    broadcastState(roomId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Cleanup room logic would go here in a production app
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
