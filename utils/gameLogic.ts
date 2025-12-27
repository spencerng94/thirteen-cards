import { Card, Rank, Suit, PlayTurn, AiDifficulty, GameStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---
type ComboType = 'SINGLE' | 'PAIR' | 'TRIPLE' | 'QUAD' | 'RUN' | '3_PAIRS' | '4_PAIRS' | 'INVALID';

// --- Helpers ---
export const getCardScore = (card: Card): number => {
  if (!card) return 0;
  return (card.rank || 0) * 10 + (card.suit || 0);
};

export const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => getCardScore(a) - getCardScore(b));
};

export const getHighestCard = (cards: Card[]): Card | null => {
  if (!cards || cards.length === 0) return null;
  const sorted = sortCards(cards);
  return sorted[sorted.length - 1];
};

export const getComboType = (cards: Card[]): ComboType => {
  if (!cards || cards.length === 0) return 'INVALID';
  const sorted = sortCards(cards);
  const len = sorted.length;
  
  if (len === 1) return 'SINGLE';

  const isSameRank = sorted.every(c => c.rank === sorted[0].rank);
  if (isSameRank) {
    if (len === 2) return 'PAIR';
    if (len === 3) return 'TRIPLE';
    if (len === 4) return 'QUAD';
    return 'INVALID';
  }

  // Check for runs: must be consecutive ranks, no duplicates, no 2s
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

  // Check for 3 consecutive pairs
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

  // Check for 4 consecutive pairs
  if (len === 8) {
    const isPairs = 
      sorted[0].rank === sorted[1].rank &&
      sorted[2].rank === sorted[3].rank &&
      sorted[4].rank === sorted[5].rank &&
      sorted[6].rank === sorted[7].rank;
    
    if (isPairs) {
      if (sorted[2].rank === sorted[0].rank + 1 && 
          sorted[4].rank === sorted[2].rank + 1 && 
          sorted[6].rank === sorted[4].rank + 1) {
        if (sorted[7].rank !== Rank.Two) {
            return '4_PAIRS';
        }
      }
    }
  }

  return 'INVALID';
};

export const validateMove = (
  playedCards: Card[], 
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false,
  myHand: Card[] = []
): { isValid: boolean; reason: string } => {
  if (!playedCards || playedCards.length === 0) {
    return { isValid: false, reason: '' };
  }

  const pType = getComboType(playedCards);
  if (pType === 'INVALID') {
    return { isValid: false, reason: 'Invalid card combination.' };
  }

  const pHigh = getHighestCard(playedCards);
  if (!pHigh) return { isValid: false, reason: 'Invalid cards.' };

  // First move of the entire game logic
  if (isFirstTurnOfGame && (!playPile || playPile.length === 0)) {
    const handHas3Spades = myHand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
    const moveHas3Spades = playedCards.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
    if (handHas3Spades && !moveHas3Spades) {
      return { isValid: false, reason: 'Must include 3♠.' };
    }
  }

  // Leading a fresh round
  if (!playPile || playPile.length === 0) {
    return { isValid: true, reason: 'Leading move.' };
  }

  const lastTurn = playPile[playPile.length - 1];
  const lastPlayedCards = lastTurn.cards;
  if (!lastPlayedCards || lastPlayedCards.length === 0) {
    return { isValid: true, reason: 'Leading move.' };
  }

  const lType = getComboType(lastPlayedCards) as ComboType;
  const lHigh = getHighestCard(lastPlayedCards);
  if (!lHigh) return { isValid: true, reason: 'Leading move.' };

  // --- SPECIAL CHOPPING LOGIC (BOMBS BEATING 2s) ---
  if (lType === 'SINGLE' && lHigh.rank === Rank.Two) {
    if (pType === 'QUAD' || pType === '3_PAIRS' || pType === '4_PAIRS') return { isValid: true, reason: 'Chop!' };
  }
  if (lType === 'PAIR' && lHigh.rank === Rank.Two) {
    if (pType === 'QUAD' || pType === '4_PAIRS') return { isValid: true, reason: 'Chop!' };
  }
  if (lType === 'QUAD' && pType === 'QUAD') {
     return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Higher Quad' } : { isValid: false, reason: 'Higher Quad needed.' };
  }
  if (lType === '3_PAIRS' && pType === '3_PAIRS') {
     return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Higher Pairs' } : { isValid: false, reason: 'Higher pairs needed.' };
  }
  if (lType === '4_PAIRS' && pType === '4_PAIRS') {
     return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Higher Pairs' } : { isValid: false, reason: 'Higher pairs needed.' };
  }
  if (pType === '4_PAIRS' && (lType === '3_PAIRS' || lType === 'QUAD')) return { isValid: true, reason: 'Mega Bomb!' };

  // --- STANDARD PLAY LOGIC ---
  if (pType === lType && playedCards.length === lastPlayedCards.length) {
    return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Beats last.' } : { isValid: false, reason: 'Card is too low.' };
  }

  return { isValid: false, reason: `Must play ${lType.replace('_', ' ')}.` };
};

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 3; r <= 15; r++) deck.push({ suit: s as Suit, rank: r as Rank, id: uuidv4() });
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
};

export const dealCards = (): Card[][] => {
  const deck = shuffleDeck(generateDeck());
  const hands: Card[][] = [];
  for (let i = 0; i < 4; i++) hands.push(deck.slice(i * 13, (i + 1) * 13));
  return hands;
};

// --- Move Finding Utilities ---

const getAllPairs = (hand: Card[]) => {
  const pairs: Card[][] = [];
  const sorted = sortCards(hand);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].rank === sorted[i+1].rank) {
      pairs.push([sorted[i], sorted[i+1]]);
      i++; 
    }
  }
  return pairs;
};

const getAllTriples = (hand: Card[]) => {
  const triples: Card[][] = [];
  const sorted = sortCards(hand);
  for (let i = 0; i < sorted.length - 2; i++) {
    if (sorted[i].rank === sorted[i+1].rank && sorted[i].rank === sorted[i+2].rank) {
      triples.push([sorted[i], sorted[i+1], sorted[i+2]]);
      i += 2;
    }
  }
  return triples;
};

const getAllQuads = (hand: Card[]) => {
  const quads: Card[][] = [];
  const sorted = sortCards(hand);
  for (let i = 0; i < sorted.length - 3; i++) {
    if (sorted[i].rank === sorted[i+3].rank) {
      quads.push(sorted.slice(i, i + 4));
      i += 3;
    }
  }
  return quads;
};

// Added exported utility to help find consecutive pairs for bombs
export const getConsecutivePairs = (hand: Card[], count: number): Card[][] => {
  const pairs = getAllPairs(hand);
  const result: Card[][] = [];
  if (pairs.length < count) return result;
  
  // Sort pairs by rank and remove 2s
  const uniquePairs = pairs.filter(p => p[0].rank !== Rank.Two).sort((a, b) => a[0].rank - b[0].rank);
  
  for (let i = 0; i <= uniquePairs.length - count; i++) {
    let valid = true;
    const sequence: Card[] = [...uniquePairs[i]];
    for (let j = 1; j < count; j++) {
      if (uniquePairs[i + j][0].rank !== uniquePairs[i + j - 1][0].rank + 1) {
        valid = false;
        break;
      }
      sequence.push(...uniquePairs[i + j]);
    }
    if (valid) {
      result.push(sequence);
    }
  }
  return result;
};

// Added missing exported member 'findAllValidCombos' for GameTable.tsx
export const findAllValidCombos = (
  hand: Card[],
  pivotId: string,
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean
): Record<string, Card[][]> => {
  const result: Record<string, Card[][]> = {
    SINGLE: [],
    PAIR: [],
    TRIPLE: [],
    QUAD: [],
    RUN: [],
    '3_PAIRS': [],
    '4_PAIRS': []
  };

  const pivotCard = hand.find(c => c.id === pivotId);
  if (!pivotCard) return result;

  const sortedHand = sortCards(hand);

  // Singles
  if (validateMove([pivotCard], playPile, isFirstTurnOfGame, hand).isValid) {
    result.SINGLE.push([pivotCard]);
  }

  // Pairs
  getAllPairs(hand).forEach(p => {
    if (p.some(c => c.id === pivotId) && validateMove(p, playPile, isFirstTurnOfGame, hand).isValid) {
      result.PAIR.push(p);
    }
  });

  // Triples
  getAllTriples(hand).forEach(t => {
    if (t.some(c => c.id === pivotId) && validateMove(t, playPile, isFirstTurnOfGame, hand).isValid) {
      result.TRIPLE.push(t);
    }
  });

  // Quads
  getAllQuads(hand).forEach(q => {
    if (q.some(c => c.id === pivotId) && validateMove(q, playPile, isFirstTurnOfGame, hand).isValid) {
      result.QUAD.push(q);
    }
  });

  // Runs
  for (let len = 3; len <= sortedHand.length; len++) {
    for (let i = 0; i <= sortedHand.length - len; i++) {
      const candidate = sortedHand.slice(i, i + len);
      if (candidate.some(c => c.id === pivotId)) {
        if (getComboType(candidate) === 'RUN' && validateMove(candidate, playPile, isFirstTurnOfGame, hand).isValid) {
          result.RUN.push(candidate);
        }
      }
    }
  }

  // Bombs
  getConsecutivePairs(hand, 3).forEach(p => {
    if (p.some(c => c.id === pivotId) && validateMove(p, playPile, isFirstTurnOfGame, hand).isValid) {
      result['3_PAIRS'].push(p);
    }
  });

  getConsecutivePairs(hand, 4).forEach(p => {
    if (p.some(c => c.id === pivotId) && validateMove(p, playPile, isFirstTurnOfGame, hand).isValid) {
      result['4_PAIRS'].push(p);
    }
  });

  return result;
};

// Added missing exported member 'canPlayAnyMove' for GameTable.tsx
export const canPlayAnyMove = (hand: Card[], playPile: PlayTurn[], isFirstTurnOfGame: boolean): boolean => {
  if (playPile.length === 0) return hand.length > 0;
  
  for (const card of hand) {
    const combos = findAllValidCombos(hand, card.id, playPile, isFirstTurnOfGame);
    for (const type in combos) {
      if (combos[type].length > 0) return true;
    }
  }
  return false;
};

// Added missing exported member 'findBestMove' for App.tsx AI logic
export const findBestMove = (
  hand: Card[],
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean,
  difficulty: AiDifficulty = 'MEDIUM'
): Card[] | null => {
  const sortedHand = sortCards(hand);
  
  if (playPile.length === 0) {
    if (isFirstTurnOfGame) {
      const threeS = hand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
      if (threeS) return [threeS];
    }
    const triples = getAllTriples(sortedHand);
    if (triples.length > 0) return triples[0];
    const pairs = getAllPairs(sortedHand);
    if (pairs.length > 0) return pairs[0];
    return [sortedHand[0]];
  }

  const lastTurn = playPile[playPile.length - 1];
  const lastCards = lastTurn.cards;
  const lType = getComboType(lastCards);
  const lHigh = getHighestCard(lastCards);
  if (!lHigh) return null;

  if (lType === 'SINGLE') {
    const match = sortedHand.find(c => getCardScore(c) > getCardScore(lHigh));
    if (match) return [match];
  } else if (lType === 'PAIR') {
    const pairs = getAllPairs(sortedHand);
    const match = pairs.find(p => getCardScore(getHighestCard(p)!) > getCardScore(lHigh));
    if (match) return match;
  } else if (lType === 'TRIPLE') {
    const triples = getAllTriples(sortedHand);
    const match = triples.find(t => getCardScore(getHighestCard(t)!) > getCardScore(lHigh));
    if (match) return match;
  } else if (lType === 'RUN') {
    const targetLen = lastCards.length;
    for (let i = 0; i <= sortedHand.length - targetLen; i++) {
      const candidate = sortedHand.slice(i, i + targetLen);
      if (getComboType(candidate) === 'RUN' && getCardScore(getHighestCard(candidate)!) > getCardScore(lHigh)) {
        return candidate;
      }
    }
  }

  if (lHigh.rank === Rank.Two) {
    const quads = getAllQuads(sortedHand);
    if (quads.length > 0) return quads[0];
    const fourPairs = getConsecutivePairs(sortedHand, 4);
    if (fourPairs.length > 0) return fourPairs[0];
    const threePairs = getConsecutivePairs(sortedHand, 3);
    if (threePairs.length > 0) return threePairs[0];
  }

  return null;
};