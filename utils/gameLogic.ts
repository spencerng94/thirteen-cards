import { Card, Rank, Suit, PlayTurn, AiDifficulty } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---
type ComboType = 'SINGLE' | 'PAIR' | 'TRIPLE' | 'QUAD' | 'RUN' | '3_PAIRS' | 'INVALID';

// --- Helpers ---
export const getCardScore = (card: Card): number => {
  return card.rank * 10 + card.suit;
};

export const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => getCardScore(a) - getCardScore(b));
};

export const getHighestCard = (cards: Card[]): Card => {
  const sorted = sortCards(cards);
  return sorted[sorted.length - 1];
};

export const getComboType = (cards: Card[]): ComboType => {
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

export const validateMove = (
  playedCards: Card[], 
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false
): { isValid: boolean; reason: string } => {
  const pType = getComboType(playedCards);
  if (pType === 'INVALID') {
    return { isValid: false, reason: 'Invalid card combination.' };
  }

  if (isFirstTurnOfGame) {
    const has3Spades = playedCards.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
    if (!has3Spades) {
      return { isValid: false, reason: 'First move of the game must include the 3 of Spades (3♠).' };
    }
  }

  if (playPile.length === 0) {
    return { isValid: true, reason: 'Valid lead.' };
  }

  const lastTurn = playPile[playPile.length - 1];
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

export const generateDeck = (): Card[] => {
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

export const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const dealCards = (): Card[][] => {
  const deck = shuffleDeck(generateDeck());
  const hands: Card[][] = [];
  for (let i = 0; i < 4; i++) {
    hands.push(deck.slice(i * 13, (i + 1) * 13));
  }
  return hands;
};

// --- AI HELPER UTILS ---

const getAllPairs = (hand: Card[]) => {
  const pairs: Card[][] = [];
  for (let i = 0; i < hand.length - 1; i++) {
    if (hand[i].rank === hand[i+1].rank) {
      pairs.push([hand[i], hand[i+1]]);
      i++; 
    }
  }
  return pairs;
};

const getAllTriples = (hand: Card[]) => {
  const triples: Card[][] = [];
  for (let i = 0; i < hand.length - 2; i++) {
    if (hand[i].rank === hand[i+2].rank) {
      triples.push([hand[i], hand[i+1], hand[i+2]]);
      i += 2;
    }
  }
  return triples;
};

const findLongestRun = (hand: Card[]) => {
  const uniqueRanks = Array.from(new Set(hand.filter(c => c.rank !== Rank.Two).map(c => c.rank))).sort((a, b) => a - b);
  if (uniqueRanks.length < 3) return null;

  let longest: number[] = [];
  let current: number[] = [uniqueRanks[0]];

  for (let i = 1; i < uniqueRanks.length; i++) {
    if (uniqueRanks[i] === uniqueRanks[i-1] + 1) {
      current.push(uniqueRanks[i]);
    } else {
      if (current.length >= 3 && current.length > longest.length) longest = [...current];
      current = [uniqueRanks[i]];
    }
  }
  if (current.length >= 3 && current.length > longest.length) longest = [...current];

  if (longest.length >= 3) {
    const result: Card[] = [];
    const usedRanks = new Set();
    for (const rank of longest) {
        // Prefer lowest suit for AI to keep better cards
        result.push(hand.find(c => c.rank === rank)!);
    }
    return result;
  }
  return null;
};

// --- MAIN AI LOGIC ---

export const findBestMove = (
  hand: Card[], 
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false,
  difficulty: AiDifficulty = 'MEDIUM'
): Card[] | null => {
  const sortedHand = sortCards(hand);

  // 1. CHANCE TO SKIP (EASY ONLY)
  if (difficulty === 'EASY' && playPile.length > 0 && Math.random() < 0.45) return null;

  // 2. LEADING
  if (playPile.length === 0) {
    if (isFirstTurnOfGame) {
        const threeSpades = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
        if (!threeSpades) return [sortedHand[0]];
        
        // Strategy: Lead with a pair if possible to clear cards faster
        const pairWith3S = sortedHand.filter(c => c.rank === Rank.Three);
        if (pairWith3S.length >= 2) return [threeSpades, pairWith3S.find(c => c.id !== threeSpades.id)!];
        return [threeSpades];
    }

    // HARD AI: Strategic Leading
    if (difficulty === 'HARD') {
      const run = findLongestRun(sortedHand);
      if (run) return run;
      const triples = getAllTriples(sortedHand);
      if (triples.length > 0) return triples[0];
      const pairs = getAllPairs(sortedHand);
      if (pairs.length > 0) return pairs[0];
    }

    // MEDIUM AI: Occasional Combo Leads
    if (difficulty === 'MEDIUM') {
      const pairs = getAllPairs(sortedHand);
      if (pairs.length > 0 && Math.random() > 0.5) return pairs[0];
    }

    // EASY or Default: Smallest single to keep the hand flexible
    return [sortedHand[0]];
  }

  // 3. RESPONDING
  const lastTurn = playPile[playPile.length - 1];
  const lastPlayedCards = lastTurn.cards;
  const lType = getComboType(lastPlayedCards);
  const lHigh = getHighestCard(lastPlayedCards);

  // EASY AI: Weak responding - Ignores complex combos frequently
  if (difficulty === 'EASY' && !['SINGLE', 'PAIR'].includes(lType)) return null;

  // HARD AI: Bomb Detection (QUAD Bomb only for single 2s in this basic version)
  if (difficulty === 'HARD' && lType === 'SINGLE' && lHigh.rank === Rank.Two) {
    for (let i = 0; i < sortedHand.length - 3; i++) {
      if (sortedHand[i].rank === sortedHand[i+3].rank) return sortedHand.slice(i, i+4);
    }
  }

  // Search by type
  if (lType === 'SINGLE') {
      for (const card of sortedHand) {
          if (validateMove([card], playPile, isFirstTurnOfGame).isValid) {
            // HARD AI: Strategic usage of high cards
            if (difficulty === 'HARD') {
                // Don't waste a 2 if the opponent has many cards left, wait for a critical moment
                if (card.rank === Rank.Two && sortedHand.length > 4 && Math.random() < 0.6) continue;
                // If opponent is low on cards, play the 2 immediately to seize control
                const targetPlayer = playPile[0].playerId; // Just a proxy for "who is playing"
                // (Advanced version would check actual player hand counts here)
            }
            return [card];
          }
      }
  }
  
  if (lType === 'PAIR') {
      const allPairs = getAllPairs(sortedHand);
      for (const pair of allPairs) {
          if (validateMove(pair, playPile, isFirstTurnOfGame).isValid) return pair;
      }
  }

  if (lType === 'TRIPLE') {
    const allTriples = getAllTriples(sortedHand);
    for (const triple of allTriples) {
        if (validateMove(triple, playPile, isFirstTurnOfGame).isValid) return triple;
    }
  }

  if (lType === 'RUN' && difficulty !== 'EASY') {
    const targetLen = lastPlayedCards.length;
    // Sliding window search for run of exact same length
    for (let i = 0; i <= sortedHand.length - targetLen; i++) {
        const window = sortedHand.slice(i, i + targetLen);
        if (validateMove(window, playPile, isFirstTurnOfGame).isValid) return window;
    }
  }
  
  return null;
};
