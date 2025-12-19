
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

  const pType = getComboType(playedCards);
  if (pType === 'INVALID') {
    return { isValid: false, reason: 'Invalid card combination.' };
  }

  if (isFirstTurnOfGame) {
    const has3S = playedCards.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
    if (!has3S) {
      return { isValid: false, reason: 'First move must include 3 of Spades.' };
    }
  }

  if (currentPlayPile.length === 0) {
    return { isValid: true, reason: 'Valid lead.' };
  }

  const lastTurn = currentPlayPile[currentPlayPile.length - 1];
  const lastPlayedCards = lastTurn.cards;
  const lType = getComboType(lastPlayedCards);
  const pHigh = getHighestCard(playedCards);
  const lHigh = getHighestCard(lastPlayedCards);

  if (lType === 'SINGLE' && lHigh.rank === Rank.Two) {
    if (pType === 'QUAD' || pType === '3_PAIRS') {
      return { isValid: true, reason: 'Bomb!' };
    }
  }

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

  if (pType !== lType) {
    return { isValid: false, reason: `Must play a ${lType}.` };
  }
  if (playedCards.length !== lastPlayedCards.length) {
    return { isValid: false, reason: 'Must play same number of cards.' };
  }

  if (getCardScore(pHigh) > getCardScore(lHigh)) {
    return { isValid: true, reason: 'Beat.' };
  } else {
    return { isValid: false, reason: 'Your combo is too weak.' };
  }
};

const serverFindBestMove = (hand: Card[], currentPlayPile: PlayTurn[], isFirstTurnOfGame: boolean): Card[] | null => {
  const sortedHand = sortCards(hand);
  
  if (currentPlayPile.length === 0) {
    if (isFirstTurnOfGame) {
      const threeSpades = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
      if (!threeSpades) return [sortedHand[0]];
      const pair = sortedHand.filter(c => c.rank === Rank.Three);
      if (pair.length >= 2) return [threeSpades, pair.find(c => c.id !== threeSpades.id)!];
      return [threeSpades];
    }
    return [sortedHand[0]];
  }

  const lastTurn = currentPlayPile[currentPlayPile.length - 1];
  const lType = getComboType(lastTurn.cards);
  
  if (lType === 'SINGLE') {
    for (const card of sortedHand) {
      const attempt = [card];
      if (validateMove(attempt, currentPlayPile, hand, isFirstTurnOfGame).isValid) return attempt;
    }
  }
  
  if (lType === 'PAIR') {
    for (let i = 0; i < sortedHand.length - 1; i++) {
      if (sortedHand[i].rank === sortedHand[i + 1].rank) {
        const attempt = [sortedHand[i], sortedHand[i + 1]];
        if (validateMove(attempt, currentPlayPile, hand, isFirstTurnOfGame).isValid) return attempt;
      }
    }
  }

  if (lType === 'TRIPLE') {
    for (let i = 0; i < sortedHand.length - 2; i++) {
      if (sortedHand[i].rank === sortedHand[i + 1].rank && sortedHand[i + 1].rank === sortedHand[i + 2].rank) {
        const attempt = [sortedHand[i], sortedHand[i + 1], sortedHand[i + 2]];
        if (validateMove(attempt, currentPlayPile, hand, isFirstTurnOfGame).isValid) return attempt;
      }
    }
  }

  return null;
};

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

const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const dealCards = (players: Player[]): void => {
  let deck = shuffleDeck(generateDeck());
  const numPlayers = players.length;
  const cardsPerPlayer = numPlayers === 3 ? 17 : 13;
  for (let i = 0; i < numPlayers; i++) {
    players[i].hand = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  }
};

const getPublicState = (room: GameRoom) => {
  return {
    roomId: room.id,
    status: room.status,
    currentPlayerId: room.status === 'PLAYING' ? room.players[room.currentPlayerIndex].id : null,
    currentPlayPile: room.currentPlayPile,
    lastPlayerToPlayId: room.lastPlayerToPlayId,
    finishedPlayers: room.finishedPlayers,
    isFirstTurnOfGame: room.isFirstTurnOfGame,
    winnerId: room.finishedPlayers.length > 0 ? room.finishedPlayers[0] : null,
    players: room.players.map(p => ({
      id: p.id, 
      name: p.name,
      avatar: p.avatar,
      cardCount: p.hand.length,
      isHost: p.isHost,
      isTurn: room.status === 'PLAYING' && room.players[room.currentPlayerIndex]?.id === p.id,
      hasPassed: p.hasPassed,
      finishedRank: p.finishedRank,
      isBot: p.isBot
    }))
  };
};

const getNextActivePlayerIndex = (room: GameRoom, startIndex: number): number => {
    let nextIndex = (startIndex + 1) % room.players.length;
    let loopCount = 0;
    while (
        (room.players[nextIndex].hand.length === 0 || room.players[nextIndex].hasPassed) 
        && loopCount < room.players.length
    ) {
      nextIndex = (nextIndex + 1) % room.players.length;
      loopCount++;
    }
    return nextIndex;
};

const checkAndTriggerBot = (roomId: string) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;
    const player = room.players[room.currentPlayerIndex];
    if (player && player.isBot) {
        setTimeout(() => {
            const botRoom = rooms[roomId];
            if (!botRoom || botRoom.status !== 'PLAYING') return;
            const move = serverFindBestMove(player.hand, botRoom.currentPlayPile, botRoom.isFirstTurnOfGame);
            if (move) {
                handlePlay(roomId, player.id, move);
            } else {
                handlePass(roomId, player.id);
            }
        }, 1200 + Math.random() * 800);
    }
};

const handlePlay = (roomId: string, playerId: string, cards: Card[]) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;
    const player = room.players[room.currentPlayerIndex];
    if (player.id !== playerId) return;

    const validation = validateMove(cards, room.currentPlayPile, player.hand, room.isFirstTurnOfGame);
    if (!validation.isValid) return;

    const cardIds = new Set(cards.map(c => c.id));
    player.hand = player.hand.filter(c => !cardIds.has(c.id));

    room.currentPlayPile.push({
      playerId: player.id,
      cards: cards,
      comboType: getComboType(cards)
    });
    room.lastPlayerToPlayId = player.id;
    room.isFirstTurnOfGame = false;

    if (player.hand.length === 0) {
      player.finishedRank = room.finishedPlayers.length + 1;
      room.finishedPlayers.push(player.id);
      const activePlayers = room.players.filter(p => p.hand.length > 0);
      if (activePlayers.length <= 1) {
          if (activePlayers.length === 1) {
              const loser = activePlayers[0];
              loser.finishedRank = room.players.length;
              room.finishedPlayers.push(loser.id);
          }
          room.status = 'FINISHED';
          io.to(roomId).emit('game_state', getPublicState(room));
          return;
      }
    }

    room.currentPlayerIndex = getNextActivePlayerIndex(room, room.currentPlayerIndex);
    io.to(roomId).emit('game_state', getPublicState(room));
    if (!player.isBot) {
        io.to(player.socketId).emit('player_hand', player.hand);
    }
    checkAndTriggerBot(roomId);
};

const handlePass = (roomId: string, playerId: string) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;
    const player = room.players[room.currentPlayerIndex];
    if (player.id !== playerId) return;
    if (room.currentPlayPile.length === 0) return;

    player.hasPassed = true;
    let nextIndex = getNextActivePlayerIndex(room, room.currentPlayerIndex);
    let nextPlayer = room.players[nextIndex];
    const lastPlayerPlayed = room.players.find(p => p.id === room.lastPlayerToPlayId);
    
    let roundOver = false;
    if (lastPlayerPlayed && lastPlayerPlayed.hand.length > 0) {
        if (nextPlayer.id === room.lastPlayerToPlayId) roundOver = true;
    } else {
        const activeNonPassed = room.players.filter(p => p.hand.length > 0 && !p.hasPassed);
        if (activeNonPassed.length === 0) {
            roundOver = true;
            const lastIdx = room.players.findIndex(p => p.id === room.lastPlayerToPlayId);
            nextIndex = (lastIdx + 1) % room.players.length;
            while (room.players[nextIndex].hand.length === 0) {
                nextIndex = (nextIndex + 1) % room.players.length;
            }
        }
    }

    if (roundOver) {
        room.currentPlayPile = [];
        room.players.forEach(p => p.hasPassed = false);
    }
    room.currentPlayerIndex = nextIndex;
    io.to(roomId).emit('game_state', getPublicState(room));
    checkAndTriggerBot(roomId);
};

io.on('connection', (socket: Socket) => {
  socket.on('create_room', ({ name, avatar }) => {
    let roomId = generateRoomCode();
    while (rooms[roomId]) roomId = generateRoomCode();
    const newPlayer: Player = {
        id: socket.id,
        socketId: socket.id,
        name: name || 'Guest',
        avatar: avatar || '😊',
        hand: [],
        isHost: true,
        hasPassed: false,
        finishedRank: null
    };
    rooms[roomId] = {
        id: roomId,
        status: 'LOBBY',
        players: [newPlayer],
        currentPlayerIndex: 0,
        currentPlayPile: [],
        lastPlayerToPlayId: null,
        finishedPlayers: [],
        isFirstTurnOfGame: true
    };
    socketRoomMap[socket.id] = roomId;
    socket.join(roomId);
    io.to(roomId).emit('game_state', getPublicState(rooms[roomId]));
  });

  socket.on('join_room', ({ roomId, name, avatar }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'LOBBY' || room.players.length >= 4) {
      socket.emit('error', 'Unable to join room.');
      return;
    }
    const newPlayer: Player = {
      id: socket.id,
      socketId: socket.id,
      name: name || 'Guest',
      avatar: avatar || '😊',
      hand: [],
      isHost: false,
      hasPassed: false,
      finishedRank: null
    };
    room.players.push(newPlayer);
    socketRoomMap[socket.id] = roomId;
    socket.join(roomId);
    io.to(roomId).emit('game_state', getPublicState(room));
  });

  socket.on('add_bot', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'LOBBY' || room.players.length >= 4) return;
    const host = room.players.find(p => p.socketId === socket.id);
    if (!host || !host.isHost) return;

    const botId = `bot-${uuidv4().slice(0, 8)}`;
    const botPlayer: Player = {
      id: botId,
      socketId: 'BOT',
      name: `CPU ${room.players.length}`,
      avatar: BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)],
      hand: [],
      isHost: false,
      hasPassed: false,
      finishedRank: null,
      isBot: true
    };
    room.players.push(botPlayer);
    io.to(roomId).emit('game_state', getPublicState(room));
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.players[0] || room.players[0].socketId !== socket.id || room.players.length < 2) return;
    room.finishedPlayers = [];
    room.players.forEach(p => { p.finishedRank = null; p.hasPassed = false; p.hand = []; });
    dealCards(room.players);
    let startingIndex = 0;
    for(let i=0; i<room.players.length; i++) {
        if(room.players[i].hand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) {
            startingIndex = i;
            break;
        }
    }
    room.currentPlayerIndex = startingIndex; 
    room.status = 'PLAYING';
    room.currentPlayPile = [];
    room.lastPlayerToPlayId = null;
    room.isFirstTurnOfGame = true;
    io.to(roomId).emit('game_state', getPublicState(room));
    room.players.forEach(p => { if(!p.isBot) io.to(p.socketId).emit('player_hand', p.hand); });
    checkAndTriggerBot(roomId);
  });

  socket.on('play_cards', ({ roomId, cards }) => {
    handlePlay(roomId, socket.id, cards);
  });

  socket.on('pass_turn', ({ roomId }) => {
    handlePass(roomId, socket.id);
  });

  socket.on('disconnect', () => {
    const roomId = socketRoomMap[socket.id];
    if (roomId && rooms[roomId]) {
        const room = rooms[roomId];
        room.players = room.players.filter(p => p.socketId !== socket.id);
        delete socketRoomMap[socket.id];
        if (room.players.length === 0 || !room.players.some(p => !p.isBot)) {
            delete rooms[roomId];
        } else {
            if (!room.players.some(p => p.isHost)) {
                const newHost = room.players.find(p => !p.isBot) || room.players[0];
                newHost.isHost = true;
            }
            io.to(roomId).emit('game_state', getPublicState(room));
        }
    }
  });
});

const PORT = parseInt(process.env.PORT || '10000', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
