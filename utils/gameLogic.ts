import { Card, Rank, Suit, Player, GameState, GameStatus, PlayTurn } from '../types';
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

  // Single
  if (len === 1) return 'SINGLE';

  // Same rank (Pair, Triple, Quad)
  const isSameRank = sorted.every(c => c.rank === sorted[0].rank);
  if (isSameRank) {
    if (len === 2) return 'PAIR';
    if (len === 3) return 'TRIPLE';
    if (len === 4) return 'QUAD';
    return 'INVALID';
  }

  // Run
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

  // 3 Pairs
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

  // 1. First Turn Rule: Must play 3 of Spades
  if (isFirstTurnOfGame) {
    const has3Spades = playedCards.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
    if (!has3Spades) {
      return { isValid: false, reason: 'First move of the game must include the 3 of Spades (3♠).' };
    }
  }

  // 2. Leading (Empty Pile)
  if (playPile.length === 0) {
    return { isValid: true, reason: 'Valid lead.' };
  }

  const lastTurn = playPile[playPile.length - 1];
  const lastPlayedCards = lastTurn.cards;
  const lType = getComboType(lastPlayedCards);
  const pHigh = getHighestCard(playedCards);
  const lHigh = getHighestCard(lastPlayedCards);

  // Bombing 2s
  if (lType === 'SINGLE' && lHigh.rank === Rank.Two) {
    if (pType === 'QUAD' || pType === '3_PAIRS') {
      return { isValid: true, reason: 'Bomb!' };
    }
  }

  // Bomb vs Bomb
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

  // Standard Comparison
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

// --- Setup ---
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

// --- AI ---
export const findBestMove = (
  hand: Card[], 
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false
): Card[] | null => {
  const sortedHand = sortCards(hand);
  
  // If first turn, MUST include 3S
  let validCandidates = sortedHand;
  
  // 1. Leading
  if (playPile.length === 0) {
    // If first turn of game, find the 3S
    if (isFirstTurnOfGame) {
        const threeSpades = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
        // Fallback (should exist)
        if (!threeSpades) return [sortedHand[0]]; 

        // Try to play Pair with 3S
        const pair = sortedHand.filter(c => c.rank === Rank.Three);
        if (pair.length >= 2) return [threeSpades, pair.find(c => c.id !== threeSpades.id)!];

        // Else play single 3S
        return [threeSpades];
    }
    return [sortedHand[0]];
  }

  // 2. Responding
  const lastPlayedCards = playPile[playPile.length - 1].cards;
  const lType = getComboType(lastPlayedCards);
  
  // Try Singles
  if (lType === 'SINGLE') {
      for (const card of sortedHand) {
          const attempt = [card];
          if (validateMove(attempt, playPile, isFirstTurnOfGame).isValid) return attempt;
      }
  }
  
  // Try Pairs
  if (lType === 'PAIR') {
      for (let i = 0; i < sortedHand.length - 1; i++) {
          const attempt = [sortedHand[i], sortedHand[i+1]];
          if (attempt[0].rank === attempt[1].rank) {
              if (validateMove(attempt, playPile, isFirstTurnOfGame).isValid) return attempt;
          }
      }
  }

  // Try Triples
  if (lType === 'TRIPLE') {
    for (let i = 0; i < sortedHand.length - 2; i++) {
        const attempt = [sortedHand[i], sortedHand[i+1], sortedHand[i+2]];
        if (attempt[0].rank === attempt[1].rank && attempt[1].rank === attempt[2].rank) {
            if (validateMove(attempt, playPile, isFirstTurnOfGame).isValid) return attempt;
        }
    }
  }
  
  return null;
};