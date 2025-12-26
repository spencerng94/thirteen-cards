
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
  id: string; // Persistent UUID from client
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
  roundHistory: PlayTurn[][];
  lastPlayerToPlayId: string | null; 
  finishedPlayers: string[];
  isFirstTurnOfGame: boolean;
  turnEndTime?: number;
  turnTimer?: any;
  isPublic: boolean;
  roomName: string;
}

const BOT_AVATARS = [':robot:', ':annoyed:', ':devil:', ':smile:', ':money_mouth_face:', ':girly:', ':cool:'];
const BOT_NAMES = ['VALKYRIE', 'SABER', 'LANCE', 'PHANTOM', 'GHOST', 'REAPER', 'VOID', 'SPECTRE'];
const RECONNECTION_GRACE_PERIOD = 30000; 
const TURN_DURATION_MS = 60000; 

const app = express();
const httpServer = createServer(app);
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({ origin: allowedOrigin, credentials: true }));

const io = new Server(httpServer, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST"], credentials: true }
});

const rooms: Record<string, GameRoom> = {};
const socketToRoom: Record<string, string> = {};
const socketToPlayerId: Record<string, string> = {};

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
    if (is3Pairs) return '3_PAIRS';
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

  if (lType === 'SINGLE' && lHigh.rank === Rank.Two && ['QUAD', '3_PAIRS', '4_PAIRS'].includes(pType)) return { isValid: true, reason: 'Chop!' };
  if (lType === 'PAIR' && lHigh.rank === Rank.Two && ['QUAD', '4_PAIRS'].includes(pType)) return { isValid: true, reason: 'Chop!' };
  if (lType === 'QUAD' && pType === 'QUAD' && getCardScore(pHigh) > getCardScore(lHigh)) return { isValid: true, reason: 'Chop!' };
  if (lType === '3_PAIRS' && pType === '3_PAIRS' && getCardScore(pHigh) > getCardScore(lHigh)) return { isValid: true, reason: 'Chop!' };
  if (lType === '4_PAIRS' && pType === '4_PAIRS' && getCardScore(pHigh) > getCardScore(lHigh)) return { isValid: true, reason: 'Chop!' };
  if (pType === '4_PAIRS' && (lType === '3_PAIRS' || lType === 'QUAD')) return { isValid: true, reason: 'Chop!' };

  if (pType !== lType || playedCards.length !== lastCards.length) return { isValid: false, reason: 'Combo mismatch.' };
  return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Beat.' } : { isValid: false, reason: 'Too low.' };
};

const getNextActivePlayerIndex = (room: GameRoom, startIndex: number, ignorePass: boolean = false): number => {
  for (let i = 1; i <= room.players.length; i++) {
    const idx = (startIndex + i) % room.players.length;
    const p = room.players[idx];
    if (p.finishedRank) continue;
    if (!ignorePass && p.hasPassed) continue;
    return idx;
  }
  return startIndex;
};

// --- Game Logic ---

const getGameStateData = (room: GameRoom) => ({
  roomId: room.id,
  status: room.status,
  isPublic: room.isPublic,
  roomName: room.roomName,
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
    isOffline: p.isOffline
  })),
  currentPlayerId: room.status === 'PLAYING' ? room.players[room.currentPlayerIndex]?.id : null,
  currentPlayPile: room.currentPlayPile,
  roundHistory: room.roundHistory,
  lastPlayerToPlayId: room.lastPlayerToPlayId,
  finishedPlayers: room.finishedPlayers,
  isFirstTurnOfGame: room.isFirstTurnOfGame,
  turnEndTime: room.turnEndTime
});

const broadcastState = (roomId: string) => {
  const room = rooms[roomId];
  if (!room) return;
  const state = getGameStateData(room);
  io.to(roomId).emit('game_state', state);
  room.players.forEach(p => {
    if (!p.isBot && !p.isOffline) io.to(p.socketId).emit('player_hand', p.hand);
  });
};

const getPublicRoomsList = () => {
  return Object.values(rooms)
    .filter(r => r.isPublic && r.status === 'LOBBY' && r.players.length < 4)
    .map(r => ({
      id: r.id,
      name: r.roomName,
      playerCount: r.players.length,
      hostName: r.players.find(p => p.isHost)?.name || 'Unknown',
      hostAvatar: r.players.find(p => p.isHost)?.avatar || ':smile:'
    }));
};

const broadcastPublicLobbies = () => {
  io.emit('public_rooms_list', getPublicRoomsList());
};

const startTurnTimer = (roomId: string) => {
  const room = rooms[roomId];
  if (!room || room.status !== 'PLAYING') return;

  if (room.turnTimer) clearTimeout(room.turnTimer);

  room.turnEndTime = Date.now() + TURN_DURATION_MS;
  room.turnTimer = setTimeout(() => {
    handleTurnTimeout(roomId);
  }, TURN_DURATION_MS);
};

const handleTurnTimeout = (roomId: string) => {
  const room = rooms[roomId];
  if (!room || room.status !== 'PLAYING') return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.finishedRank) return;

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
  const room = rooms[roomId];
  if (!room) return;
  
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.id !== playerId || currentPlayer.finishedRank) return;
  
  const validation = validateMove(cards, room.currentPlayPile, room.isFirstTurnOfGame);
  if (!validation.isValid) {
    if (!currentPlayer.isBot) io.to(currentPlayer.socketId).emit('error', validation.reason);
    return;
  }

  if (room.turnTimer) clearTimeout(room.turnTimer);

  currentPlayer.hand = currentPlayer.hand.filter(c => !cards.some(pc => pc.id === c.id));
  room.currentPlayPile.push({ playerId, cards, comboType: getComboType(cards) });
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
        if (room.currentPlayPile.length > 0) {
          room.roundHistory.push([...room.currentPlayPile]);
          room.currentPlayPile = [];
        }
        broadcastState(roomId); 
        return;
    }
  }

  const activeRemainingInRound = room.players.filter(p => !p.finishedRank && !p.hasPassed && p.id !== playerId);
  if (activeRemainingInRound.length === 0) {
     if (room.currentPlayPile.length > 0) room.roundHistory.push([...room.currentPlayPile]);
     room.currentPlayPile = [];
     room.players.forEach(p => p.hasPassed = false);
     room.currentPlayerIndex = currentPlayer.hand.length === 0 
       ? getNextActivePlayerIndex(room, room.currentPlayerIndex, true)
       : room.players.indexOf(currentPlayer);
  } else {
     room.currentPlayerIndex = getNextActivePlayerIndex(room, room.currentPlayerIndex);
  }

  startTurnTimer(roomId);
  broadcastState(roomId);
  checkBotTurn(roomId);
};

const handlePass = (roomId: string, playerId: string) => {
  const room = rooms[roomId];
  if (!room) return;
  
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return;
  
  if (room.currentPlayPile.length === 0) {
    if (!currentPlayer.isBot) io.to(currentPlayer.socketId).emit('error', room.isFirstTurnOfGame ? 'Must lead with 3♠.' : 'Must play a card to lead the round.');
    return;
  }

  if (room.turnTimer) clearTimeout(room.turnTimer);

  currentPlayer.hasPassed = true;

  let nextIdx = getNextActivePlayerIndex(room, room.currentPlayerIndex);
  const lastPlayer = room.players.find(p => p.id === room.lastPlayerToPlayId);
  
  if (room.players[nextIdx].id === room.lastPlayerToPlayId || nextIdx === room.currentPlayerIndex) {
    if (room.currentPlayPile.length > 0) room.roundHistory.push([...room.currentPlayPile]);
    room.currentPlayPile = [];
    room.players.forEach(p => p.hasPassed = false);
    if (lastPlayer?.finishedRank) nextIdx = getNextActivePlayerIndex(room, nextIdx, true);
  }
  
  room.currentPlayerIndex = nextIdx;
  startTurnTimer(roomId);
  broadcastState(roomId);
  checkBotTurn(roomId);
};

const findBestMove = (hand: Card[], playPile: PlayTurn[], isFirstTurn: boolean, difficulty: AiDifficulty): Card[] | null => {
  const sorted = sortCards(hand);
  if (playPile.length === 0) {
    if (isFirstTurn) {
        const threeS = sorted.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
        return threeS ? [threeS] : [sorted[0]];
    }
    return [sorted[0]];
  }
  const lastTurn = playPile[playPile.length - 1];
  const lastCards = lastTurn.cards;
  const lType = getComboType(lastCards);
  const lHigh = getHighestCard(lastCards);
  let standardMove: Card[] | null = null;
  if (lType === 'SINGLE') {
    const match = sorted.find(c => getCardScore(c) > getCardScore(lHigh));
    if (match) standardMove = [match];
  } else if (lType === 'PAIR') {
    const pairs: Card[][] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].rank === sorted[i+1].rank) {
            pairs.push([sorted[i], sorted[i+1]]);
            i++;
        }
    }
    const match = pairs.find(p => getCardScore(getHighestCard(p)) > getCardScore(lHigh));
    if (match) standardMove = match;
  }
  return standardMove;
};

const checkBotTurn = (roomId: string) => {
  const room = rooms[roomId];
  if (!room || room.status !== 'PLAYING') return;
  const curPlayer = room.players[room.currentPlayerIndex];
  if (curPlayer?.isBot && !curPlayer.finishedRank) {
    setTimeout(() => {
        const roomRef = rooms[roomId];
        if (!roomRef || roomRef.currentPlayerIndex !== room.currentPlayerIndex) return;
        const move = findBestMove(curPlayer.hand, room.currentPlayPile, room.isFirstTurnOfGame, curPlayer.difficulty || 'MEDIUM');
        if (move) handlePlay(roomId, curPlayer.id, move);
        else handlePass(roomId, curPlayer.id);
    }, 1500);
  }
};

const performCleanup = (roomId: string, playerId: string) => {
  const room = rooms[roomId];
  if (!room) return;

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  const leavingPlayer = room.players[playerIndex];
  const wasHost = leavingPlayer.isHost;

  room.players.splice(playerIndex, 1);
  const humanPlayers = room.players.filter(p => !p.isBot);
  
  if (humanPlayers.length === 0) {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    delete rooms[roomId];
    broadcastPublicLobbies();
    return;
  }

  if (wasHost && humanPlayers.length > 0) {
    humanPlayers[0].isHost = true;
  }

  broadcastState(roomId);
  broadcastPublicLobbies();
};

const mapIdentity = (socket: Socket, roomId: string, playerId: string) => {
  socketToRoom[socket.id] = roomId;
  socketToPlayerId[socket.id] = playerId;
};

io.on('connection', (socket: Socket) => {
  // Always send the current public room list to a newly connected client
  socket.emit('public_rooms_list', getPublicRoomsList());

  socket.on('create_room', ({ name, avatar, playerId, isPublic, roomName }) => {
    const roomId = generateRoomCode();
    const pId = playerId || uuidv4();
    rooms[roomId] = {
      id: roomId, status: 'LOBBY', currentPlayerIndex: 0, currentPlayPile: [], roundHistory: [], lastPlayerToPlayId: null, finishedPlayers: [], isFirstTurnOfGame: true,
      isPublic: isPublic === true,
      roomName: roomName || `${name.toUpperCase()}'S MATCH`,
      players: [{ id: pId, name, avatar, socketId: socket.id, hand: [], isHost: true, hasPassed: false, finishedRank: null }]
    };
    mapIdentity(socket, roomId, pId);
    socket.join(roomId);
    broadcastState(roomId);
    broadcastPublicLobbies();
  });

  socket.on('join_room', ({ roomId, name, avatar, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'LOBBY' || room.players.length >= 4) {
      socket.emit('error', !room ? 'Room not found.' : room.status !== 'LOBBY' ? 'Match in progress.' : 'Lobby is full.');
      return;
    }
    const pid = playerId || uuidv4();
    
    // Prevent duplicate entries by checking if the playerId is already in the room
    const existingPlayerIndex = room.players.findIndex(p => p.id === pid);
    if (existingPlayerIndex !== -1) {
       // Re-map socket to existing slot
       const player = room.players[existingPlayerIndex];
       player.socketId = socket.id;
       player.name = name;
       player.avatar = avatar;
       player.isOffline = false;
       if (player.reconnectionTimeout) { clearTimeout(player.reconnectionTimeout); player.reconnectionTimeout = undefined; }
    } else {
       room.players.push({ id: pid, name, avatar, socketId: socket.id, hand: [], isHost: false, hasPassed: false, finishedRank: null });
    }
    
    mapIdentity(socket, roomId, pid);
    socket.join(roomId);
    broadcastState(roomId);
    broadcastPublicLobbies();
  });

  socket.on('add_bot', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'LOBBY' || room.players.length >= 4) return;
    
    const requesterId = playerId || socketToPlayerId[socket.id];
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return;

    const botId = 'bot-' + Math.random().toString(36).substr(2, 9);
    room.players.push({
      id: botId, name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], avatar: BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)],
      socketId: 'BOT', hand: [], isHost: false, hasPassed: false, finishedRank: null, isBot: true, difficulty: 'MEDIUM'
    });
    broadcastState(roomId);
    broadcastPublicLobbies();
  });

  socket.on('update_bot_difficulty', ({ roomId, botId, difficulty, playerId }) => {
    const room = rooms[roomId];
    if (room && room.status === 'LOBBY') {
      const requesterId = playerId || socketToPlayerId[socket.id];
      const requester = room.players.find(p => p.id === requesterId);
      // Ensure only the host can change difficulty
      if (!requester || !requester.isHost) return;

      const bot = room.players.find(p => p.id === botId);
      if (bot) {
        bot.difficulty = difficulty;
        broadcastState(roomId);
      }
    }
  });

  socket.on('remove_bot', ({ roomId, botId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'LOBBY') return;
    const requesterId = playerId || socketToPlayerId[socket.id];
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return;

    room.players = room.players.filter(p => p.id !== botId);
    broadcastState(roomId);
    broadcastPublicLobbies();
  });

  socket.on('reconnect_session', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room) { socket.emit('error', 'Session Expired'); return; }
    const player = room.players.find(p => p.id === playerId);
    if (!player) { socket.emit('error', 'Player not found'); return; }
    if (player.reconnectionTimeout) { clearTimeout(player.reconnectionTimeout); player.reconnectionTimeout = undefined; }
    
    delete socketToRoom[player.socketId];
    delete socketToPlayerId[player.socketId];

    player.socketId = socket.id;
    player.isOffline = false;
    mapIdentity(socket, roomId, playerId);
    
    socket.join(roomId);
    socket.emit('game_state', getGameStateData(room));
    socket.emit('player_hand', player.hand);
    broadcastState(roomId);
  });

  socket.on('start_game', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;
    const requesterId = playerId || socketToPlayerId[socket.id];
    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return;

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
    room.currentPlayPile = []; room.roundHistory = [];
    startTurnTimer(roomId);
    broadcastState(roomId);
    checkBotTurn(roomId);
    broadcastPublicLobbies();
  });

  socket.on('play_cards', ({ roomId, cards, playerId }) => {
    const pId = playerId || socketToPlayerId[socket.id];
    if (pId) mapIdentity(socket, roomId, pId);
    handlePlay(roomId, pId, cards);
  });

  socket.on('pass_turn', ({ roomId, playerId }) => {
    const pId = playerId || socketToPlayerId[socket.id];
    if (pId) mapIdentity(socket, roomId, pId);
    handlePass(roomId, pId);
  });

  socket.on('get_public_rooms', () => {
    socket.emit('public_rooms_list', getPublicRoomsList());
  });

  socket.on('request_sync', ({ playerId }) => {
    const pId = playerId || socketToPlayerId[socket.id];
    if (!pId) return;
    
    let room = Object.values(rooms).find(r => r.players.some(p => p.id === pId));
    if (!room) return;

    const player = room.players.find(p => p.id === pId);
    if (!player) return;

    player.socketId = socket.id;
    player.isOffline = false;
    mapIdentity(socket, room.id, pId);
    socket.join(room.id);

    socket.emit('game_state', getGameStateData(room));
    socket.emit('player_hand', player.hand);
    broadcastState(room.id);
  });

  socket.on('disconnect', () => {
    const roomId = socketToRoom[socket.id];
    const playerId = socketToPlayerId[socket.id];
    if (!roomId || !playerId) return;
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    if (room.status !== 'PLAYING') {
        performCleanup(roomId, playerId);
        delete socketToRoom[socket.id];
        delete socketToPlayerId[socket.id];
        return;
    }

    player.isOffline = true;
    broadcastState(roomId);
    player.reconnectionTimeout = setTimeout(() => { performCleanup(roomId, playerId); }, RECONNECTION_GRACE_PERIOD);
    delete socketToRoom[socket.id];
    delete socketToPlayerId[socket.id];
  });
});

const generateRoomCode = (): string => 'ABCD'.split('').map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 36))).join('');
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
