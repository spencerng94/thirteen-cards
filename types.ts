export enum Suit {
  Spades = 0,
  Clubs = 1,
  Diamonds = 2,
  Hearts = 3
}

export enum Rank {
  Three = 3, Four = 4, Five = 5, Six = 6, Seven = 7, Eight = 8, Nine = 9, Ten = 10, Jack = 11, Queen = 12, King = 13, Ace = 14, Two = 15
}

export interface Card {
  rank: Rank;
  suit: Suit;
  id: string;
}

export type AiDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Emote {
  id: string;
  name: string;
  file_path: string;
  trigger_code: string;
  fallback_emoji: string;
  price: number;
}

export interface Player {
  id: string; 
  name: string;
  avatar: string;
  cardCount: number;
  isHost: boolean;
  isTurn?: boolean;
  hasPassed?: boolean;
  finishedRank?: number | null;
  isBot?: boolean;
  difficulty?: AiDifficulty;
  isOffline?: boolean;
  isAfk?: boolean;
  mutedByAfk?: boolean;
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
  currentPlayPile: PlayTurn[];
  roundHistory?: PlayTurn[][];
  lastPlayerToPlayId: string | null;
  winnerId: string | null;
  finishedPlayers: string[];
  isFirstTurnOfGame?: boolean;
  turnEndTime?: number; 
  turnDuration?: number; 
  isPublic?: boolean;
  roomName?: string;
  speedBonuses?: Record<string, { gold: number; xp: number }>; // playerId -> speed bonus data
}

export enum SocketEvents {
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
  RECONNECT = 'reconnect_session',
  REQUEST_SYNC = 'request_sync',
  ADD_BOT = 'add_bot',
  REMOVE_BOT = 'remove_bot',
  START_GAME = 'start_game',
  GAME_STATE = 'game_state',
  PLAY_CARDS = 'play_cards',
  PASS_TURN = 'pass_turn',
  PLAYER_HAND = 'player_hand',
  UPDATE_BOT_DIFFICULTY = 'update_bot_difficulty',
  EMOTE_SENT = 'emote_sent',
  RECEIVE_EMOTE = 'receive_emote',
  SEND_CHAT = 'send_chat',
  RECEIVE_CHAT = 'receive_chat',
  GET_PUBLIC_ROOMS = 'get_public_rooms',
  PUBLIC_ROOMS_LIST = 'public_rooms_list',
  ERROR = 'error',
  QUICK_MOVE_REWARD = 'quick_move_reward'
}

export type BackgroundTheme = 'CLASSIC_GREEN' | 'EMERALD' | 'CYBER_BLUE' | 'CRIMSON_VOID' | 'CYBERPUNK_NEON' | 'GOLDEN_EMPEROR' | 'LOTUS_FOREST' | 'CHRISTMAS_YULETIDE' | 'HIGH_ROLLER' | 'OBSIDIAN_MADNESS' | 'GOLD_FLUX' | 'ZEN_POND' | 'LAS_VEGAS' | 'SHIBA' | 'JUST_A_GIRL';

export interface UserInventory {
  items: Record<string, number>;
  active_boosters: Record<string, number>; // type -> expiration timestamp
}

export interface UserProfile {
  id: string;
  username: string; // Stored as "DisplayName#0000" format
  discriminator?: string; // Optional: 4-digit discriminator (for future database migration)
  avatar_url?: string;
  wins: number;
  games_played: number;
  currency: number;
  coins: number;
  gems: number;
  xp: number;
  level: number;
  unlocked_sleeves: string[];
  unlocked_avatars: string[];
  unlocked_boards: string[];
  unlocked_emotes?: string[];
  unlocked_finishers?: string[];
  unlocked_phrases?: string[];
  equipped_sleeve?: string;
  equipped_board?: string;
  equipped_finisher?: string;
  active_board?: string;
  active_sleeve?: string;
  sfx_enabled?: boolean;
  turbo_enabled?: boolean;
  sleeve_effects_enabled?: boolean;
  play_animations_enabled?: boolean;
  turn_timer_setting: number; 
  undo_count: number;
  finish_dist: number[];
  total_chops: number;
  total_cards_left_sum: number;
  current_streak: number;
  longest_streak: number;
  created_at?: string;
  last_daily_claim?: string;
  last_ad_claim?: string; // 4-hour cooldown tracking
  ad_weekly_gems?: number; // Weekly ad reward gems (max 500)
  first_ad_claim_week?: string; // Timestamp of first claim this week
  first_purchase_eligible?: boolean; // Whether user is eligible for first-time 2x bonus
  inventory?: UserInventory;
  event_stats?: {
    daily_games_played: number;
    daily_wins: number;
    weekly_games_played?: number;
    weekly_wins?: number;
    weekly_bombs_played?: number;
    weekly_chops_performed?: number;
    weekly_challenge_progress?: Record<string, number>; // challengeId -> currentCount
    total_hands_played?: number;
    new_player_login_days: number;
    online_games_played?: number;
    gems_purchased?: number;
    claimed_events: string[]; 
    ready_to_claim?: string[];
  };
}

export type HubTab = 'PROFILE' | 'INVENTORY' | 'CUSTOMIZE' | 'STATS' | 'LEVEL_REWARDS';