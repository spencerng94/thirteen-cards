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
  lastPlayerToPlayId: string | null; // Tracks who played the last valid set to handle pass clearing
}

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
const socketRoomMap: Record<string, string> = {}; // Track which room a socket is in for cleaner disconnects

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
  // 2 is highest (15), 3 is lowest (3). Suits break ties.
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

  // Single
  if (len === 1) return 'SINGLE';

  // Check for same rank combos (Pair, Triple, Quad)
  const isSameRank = sorted.every(c => c.rank === sorted[0].rank);
  if (isSameRank) {
    if (len === 2) return 'PAIR';
    if (len === 3) return 'TRIPLE';
    if (len === 4) return 'QUAD';
    return 'INVALID';
  }

  // Check for Run (Consecutive ranks, no 2s)
  let isRun = true;
  for (let i = 0; i < len - 1; i++) {
    // No 2s allowed in runs
    if (sorted[i].rank === Rank.Two || sorted[i+1].rank === Rank.Two) {
      isRun = false; 
      break;
    }
    // Check consecutive
    if (sorted[i+1].rank !== sorted[i].rank + 1) {
      isRun = false;
      break;
    }
  }
  if (isRun && len >= 3) return 'RUN';

  // Check for 3 Consecutive Pairs (Length 6)
  if (len === 6) {
    // Check pairs: (0,1), (2,3), (4,5)
    const isPairs = 
      sorted[0].rank === sorted[1].rank &&
      sorted[2].rank === sorted[3].rank &&
      sorted[4].rank === sorted[5].rank;
    
    if (isPairs) {
      // Check consecutive pair ranks: 2nd pair is +1 rank of 1st, 3rd is +1 of 2nd
      if (sorted[2].rank === sorted[0].rank + 1 && sorted[4].rank === sorted[2].rank + 1) {
        // No 2s allowed in sequences
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
  playerHand: Card[]
): { isValid: boolean; reason: string } => {
  
  // 0. Ownership check (Sanity check)
  const handIds = new Set(playerHand.map(c => c.id));
  for (const c of playedCards) {
    if (!handIds.has(c.id)) {
      return { isValid: false, reason: "You don't have these cards." };
    }
  }

  const pType = getComboType(playedCards);
  if (pType === 'INVALID') {
    return { isValid: false, reason: 'Invalid card combination.' };
  }

  // 1. Leading
  if (currentPlayPile.length === 0) {
    return { isValid: true, reason: 'Valid lead.' };
  }

  const lastTurn = currentPlayPile[currentPlayPile.length - 1];
  const lastPlayedCards = lastTurn.cards;

  const lType = getComboType(lastPlayedCards);
  const pHigh = getHighestCard(playedCards);
  const lHigh = getHighestCard(lastPlayedCards);

  // 4. Special Rule: Bombing a 2
  // If table has a Single 2
  if (lType === 'SINGLE' && lHigh.rank === Rank.Two) {
    if (pType === 'QUAD' || pType === '3_PAIRS') {
      return { isValid: true, reason: 'Bomb!' };
    }
  }

  // 4b. Bomb vs Bomb Logic (Higher bomb beats lower bomb of same type)
  if (lType === 'QUAD' && pType === 'QUAD') {
     return getCardScore(pHigh) > getCardScore(lHigh) 
       ? { isValid: true, reason: 'Higher Quad' } 
       : { isValid: false, reason: 'Must play a higher Quad.' };
  }
  if (lType === '3_PAIRS' && pType === '3_PAIRS') {
     return getCardScore(pHigh) > getCardScore(lHigh) 
       ? { isValid: true, reason: 'Higher Pair Sequence' } 
       : { isValid: false, reason: 'Must play higher sequence of pairs.' };
  }

  // 2. Combination Match Check
  if (pType !== lType) {
    return { isValid: false, reason: `Must play a ${lType}.` };
  }
  if (playedCards.length !== lastPlayedCards.length) {
    return { isValid: false, reason: 'Must play same number of cards.' };
  }

  // 3. Basic Rank Comparison
  if (getCardScore(pHigh) > getCardScore(lHigh)) {
    return { isValid: true, reason: 'Beat.' };
  } else {
    return { isValid: false, reason: 'Your combo is the same type but has a lower rank.' };
  }
};


// Helper: Generate Deck
const generateDeck = (): Card[] => {
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
  return deck;
};

// Helper: Shuffle
const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// --- Deal Logic ---
const dealCards = (players: Player[]): void => {
  let deck = shuffleDeck(generateDeck());
  const numPlayers = players.length;

  if (numPlayers === 4) {
    for (let i = 0; i < 4; i++) {
      players[i].hand = deck.slice(i * 13, (i + 1) * 13);
    }
  } else if (numPlayers === 3) {
    for (let i = 0; i < 3; i++) {
      players[i].hand = deck.slice(i * 17, (i + 1) * 17);
    }
  } else {
    for (let i = 0; i < numPlayers; i++) {
        players[i].hand = deck.slice(i * 13, (i+1) * 13);
    }
  }
};

// Helper: Get public state
const getPublicState = (room: GameRoom) => {
  return {
    roomId: room.id,
    status: room.status,
    currentPlayerId: room.status === 'PLAYING' ? room.players[room.currentPlayerIndex].id : null,
    currentPlayPile: room.currentPlayPile,
    lastPlayerToPlayId: room.lastPlayerToPlayId,
    winnerId: null, // Should calculate if winner exists
    players: room.players.map(p => ({
      id: p.id, 
      name: p.name,
      avatar: p.avatar,
      cardCount: p.hand.length,
      isHost: p.isHost,
      isTurn: room.status === 'PLAYING' && room.players[room.currentPlayerIndex]?.id === p.id,
      hasPassed: p.hasPassed
    }))
  };
};

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create Room
  socket.on('create_room', ({ name, avatar }) => {
    let roomId = generateRoomCode();
    let attempts = 0;
    while (rooms[roomId] && attempts < 100) {
      roomId = generateRoomCode();
      attempts++;
    }

    if (rooms[roomId]) {
        socket.emit('error', 'Server busy, try again.');
        return;
    }

    const newPlayer: Player = {
        id: socket.id,
        socketId: socket.id,
        name: name || 'Guest',
        avatar: avatar || '😊',
        hand: [],
        isHost: true,
        hasPassed: false
    };

    rooms[roomId] = {
        id: roomId,
        status: 'LOBBY',
        players: [newPlayer],
        currentPlayerIndex: 0,
        currentPlayPile: [],
        lastPlayerToPlayId: null
    };

    socketRoomMap[socket.id] = roomId;
    socket.join(roomId);
    io.to(roomId).emit('game_state', getPublicState(rooms[roomId]));
  });

  // Join Room
  socket.on('join_room', ({ roomId, name, avatar }) => {
    const room = rooms[roomId];
    
    if (!room) {
        socket.emit('error', 'Room not found.');
        return;
    }

    if (room.status !== 'LOBBY') {
      socket.emit('error', 'Game already in progress');
      return;
    }
    
    if (room.players.length >= 4) {
      socket.emit('error', 'Room full');
      return;
    }

    const newPlayer: Player = {
      id: socket.id,
      socketId: socket.id,
      name: name || 'Guest',
      avatar: avatar || '😊',
      hand: [],
      isHost: false,
      hasPassed: false
    };

    room.players.push(newPlayer);
    socketRoomMap[socket.id] = roomId;
    socket.join(roomId);

    io.to(roomId).emit('game_state', getPublicState(room));
  });

  // Start Game
  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.players[0].socketId !== socket.id) return; // Only host
    if (room.players.length < 2) return; // Need at least 2

    // Deal
    dealCards(room.players);
    
    // Determine who goes first (Player with 3 of Spades)
    // If multiple decks or odd logic, fallback to index 0, but standard is 3 Spades.
    let startingIndex = 0;
    
    // Find who has 3 Spades (Rank 3, Suit Spades = 0)
    for(let i=0; i<room.players.length; i++) {
        const has3S = room.players[i].hand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
        if(has3S) {
            startingIndex = i;
            break;
        }
    }

    room.currentPlayerIndex = startingIndex; 
    
    room.status = 'PLAYING';
    room.currentPlayPile = [];
    room.lastPlayerToPlayId = null;

    // Send public state
    io.to(roomId).emit('game_state', getPublicState(room));

    // Send private hands
    room.players.forEach(p => {
      io.to(p.socketId).emit('player_hand', p.hand);
    });
  });

  // Play Cards
  socket.on('play_cards', ({ roomId, cards }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;

    const player = room.players[room.currentPlayerIndex];
    if (player.socketId !== socket.id) return;

    // Validate logic
    const validation = validateMove(cards, room.currentPlayPile, player.hand);
    
    if (!validation.isValid) {
      socket.emit('error', validation.reason);
      return;
    }
    
    // Remove cards from hand
    const cardIds = new Set(cards.map((c: any) => c.id));
    player.hand = player.hand.filter(c => !cardIds.has(c.id));

    // Update table
    room.currentPlayPile.push({
      playerId: player.id,
      cards: cards,
      comboType: getComboType(cards)
    });
    room.lastPlayerToPlayId = player.id;

    // Check Win
    if (player.hand.length === 0) {
      room.status = 'FINISHED';
      // Broadcast winner
      const finalState = getPublicState(room);
      finalState.winnerId = player.id;
      io.to(roomId).emit('game_state', finalState);
      return;
    }

    // Next turn logic
    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    let loopCount = 0;
    
    while (room.players[nextIndex].hasPassed && loopCount < room.players.length) {
      nextIndex = (nextIndex + 1) % room.players.length;
      loopCount++;
    }

    if (room.players[nextIndex].id === room.lastPlayerToPlayId) {
        room.currentPlayPile = [];
        room.players.forEach(p => p.hasPassed = false);
        room.currentPlayerIndex = nextIndex;
    } else {
        room.currentPlayerIndex = nextIndex;
    }

    io.to(roomId).emit('game_state', getPublicState(room));
    io.to(player.socketId).emit('player_hand', player.hand);
  });

  // Pass Turn
  socket.on('pass_turn', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;
    
    const player = room.players[room.currentPlayerIndex];
    if (player.socketId !== socket.id) return;

    if (room.currentPlayPile.length === 0) return;

    player.hasPassed = true;

    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    let loopCount = 0;

    while (room.players[nextIndex].hasPassed && loopCount < room.players.length) {
       nextIndex = (nextIndex + 1) % room.players.length;
       loopCount++;
    }

    if (room.players[nextIndex].id === room.lastPlayerToPlayId || loopCount >= room.players.length) {
        // Round winner (person who played last valid hand) starts new round
        // Find index of last player
        const winnerIndex = room.players.findIndex(p => p.id === room.lastPlayerToPlayId);
        room.currentPlayerIndex = winnerIndex !== -1 ? winnerIndex : nextIndex;
        
        room.currentPlayPile = [];
        room.players.forEach(p => p.hasPassed = false);
    } else {
        room.currentPlayerIndex = nextIndex;
    }

    io.to(roomId).emit('game_state', getPublicState(room));
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = socketRoomMap[socket.id];
    
    if (roomId && rooms[roomId]) {
        const room = rooms[roomId];
        // Remove player
        room.players = room.players.filter(p => p.socketId !== socket.id);
        
        // Cleanup socket map
        delete socketRoomMap[socket.id];

        if (room.players.length === 0) {
            // Delete room if empty
            console.log(`Deleting empty room: ${roomId}`);
            delete rooms[roomId];
        } else {
            // If host left, assign new host
            if (!room.players.some(p => p.isHost)) {
                room.players[0].isHost = true;
            }
            // Emit updated state
            io.to(roomId).emit('game_state', getPublicState(room));
        }
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});