// Card Suits
export enum Suit {
  Spades = 0,   // Lowest
  Clubs = 1,
  Diamonds = 2,
  Hearts = 3    // Highest
}

// Card Ranks (3 is lowest, 2 is highest in Tien Len)
export enum Rank {
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Ace = 14,
  Two = 15      // Highest
}

export interface Card {
  rank: Rank;
  suit: Suit;
  id: string; // Unique ID for React keys and tracking
}

export type AiDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Player {
  id: string;
  name: string;
  avatar: string; // User selected emoji
  cardCount: number;
  isHost: boolean;
  isTurn?: boolean;
  hasPassed?: boolean;
  finishedRank?: number | null; // 1 = 1st, 2 = 2nd, etc. Null if still playing.
  isBot?: boolean;
  difficulty?: AiDifficulty;
}

export enum GameStatus {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface PlayTurn {
  playerId: string;
  cards: Card[];
  comboType: string;
}

export interface GameState {
  roomId: string;
  status: GameStatus;
  players: Player[];
  currentPlayerId: string | null;
  currentPlayPile: PlayTurn[]; // Turns of the ACTIVE round
  roundHistory?: PlayTurn[][]; // Archives of COMPLETED rounds
  lastPlayerToPlayId: string | null;
  winnerId: string | null; // Kept for backward compat
  finishedPlayers: string[]; // Array of player IDs in order of finishing
  isFirstTurnOfGame?: boolean;
}

// Events
export enum SocketEvents {
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
  ADD_BOT = 'add_bot',
  REMOVE_BOT = 'remove_bot',
  START_GAME = 'start_game',
  GAME_STATE = 'game_state',
  PLAY_CARDS = 'play_cards',
  PASS_TURN = 'pass_turn',
  PLAYER_HAND = 'player_hand', // Private event for receiving cards
  UPDATE_BOT_DIFFICULTY = 'update_bot_difficulty',
  ERROR = 'error'
}

export type BackgroundTheme = 'GREEN' | 'CYBER_BLUE' | 'CRIMSON_VOID';