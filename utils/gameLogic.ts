
import { Card, Rank, Suit, PlayTurn, AiDifficulty } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---
type ComboType = 'SINGLE' | 'PAIR' | 'TRIPLE' | 'QUAD' | 'RUN' | '3_PAIRS' | '4_PAIRS' | 'INVALID';

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

  // Check for runs
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
  isFirstTurnOfGame: boolean = false
): { isValid: boolean; reason: string } => {
  const pType = getComboType(playedCards);
  if (pType === 'INVALID') {
    return { isValid: false, reason: 'Invalid card combination.' };
  }

  // First turn of the ENTIRE game must have 3 of Spades
  if (isFirstTurnOfGame && playPile.length === 0) {
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
  const lType = getComboType(lastPlayedCards) as ComboType;
  const pHigh = getHighestCard(playedCards);
  const lHigh = getHighestCard(lastPlayedCards);

  // Chopping logic (Bombs)
  // 1. Single 2 can be chopped by 3 consecutive pairs or a Quad
  if (lType === 'SINGLE' && lHigh.rank === Rank.Two) {
    if (pType === 'QUAD' || pType === '3_PAIRS' || pType === '4_PAIRS') {
      return { isValid: true, reason: 'Bomb!' };
    }
  }

  // 2. Pair of 2s can be chopped by Quad or 4 consecutive pairs
  if (lType === 'PAIR' && lHigh.rank === Rank.Two) {
    if (pType === 'QUAD' || pType === '4_PAIRS') {
      return { isValid: true, reason: 'Bomb!' };
    }
  }

  // 3. Higher Quads can chop Quads
  if (lType === 'QUAD' && pType === 'QUAD') {
     return getCardScore(pHigh) > getCardScore(lHigh) 
       ? { isValid: true, reason: 'Higher Quad' } 
       : { isValid: false, reason: 'Must play a higher Quad.' };
  }
  
  // 4. Higher sequences of pairs
  if (lType === '3_PAIRS' && pType === '3_PAIRS') {
     return getCardScore(pHigh) > getCardScore(lHigh) 
       ? { isValid: true, reason: 'Higher Pair Sequence' } 
       : { isValid: false, reason: 'Must play higher sequence of pairs.' };
  }

  if (lType === '4_PAIRS' && pType === '4_PAIRS') {
     return getCardScore(pHigh) > getCardScore(lHigh) 
       ? { isValid: true, reason: 'Higher Pair Sequence' } 
       : { isValid: false, reason: 'Must play higher sequence of pairs.' };
  }

  // Standard play (same type, same length, higher card)
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

// --- Move Finding Utilities ---

const getAllPairs = (hand: Card[]) => {
  const pairs: Card[][] = [];
  const sorted = sortCards(hand);
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[i].rank === sorted[j].rank) {
        pairs.push([sorted[i], sorted[j]]);
      }
    }
  }
  return pairs;
};

const getAllTriples = (hand: Card[]) => {
  const triples: Card[][] = [];
  const sorted = sortCards(hand);
  for (let i = 0; i < sorted.length - 2; i++) {
    for (let j = i + 1; j < sorted.length - 1; j++) {
      for (let k = j + 1; k < sorted.length; k++) {
        if (sorted[i].rank === sorted[j].rank && sorted[j].rank === sorted[k].rank) {
          triples.push([sorted[i], sorted[j], sorted[k]]);
        }
      }
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
    }
  }
  return quads;
};

export const canPlayAnyMove = (
  hand: Card[], 
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false
): boolean => {
  const sortedHand = sortCards(hand);
  
  if (playPile.length === 0) {
    if (isFirstTurnOfGame) {
      return sortedHand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
    }
    return sortedHand.length > 0;
  }

  const lastTurn = playPile[playPile.length - 1];
  const lastPlayedCards = lastTurn.cards;
  const lType = getComboType(lastPlayedCards) as ComboType;
  const lHigh = getHighestCard(lastPlayedCards);

  if (lType === 'SINGLE') {
    if (sortedHand.some(c => getCardScore(c) > getCardScore(lHigh))) return true;
    if (lHigh.rank === Rank.Two) {
      if (getAllQuads(sortedHand).length > 0) return true;
      const pairs = getAllPairs(sortedHand);
      const ranks = Array.from(new Set(pairs.map(p => p[0].rank))).sort((a,b) => a-b);
      for (let i = 0; i <= ranks.length - 3; i++) {
        if (ranks[i+1] === ranks[i]+1 && ranks[i+2] === ranks[i+1]+1 && ranks[i+2] !== Rank.Two) return true;
      }
    }
    return false;
  }

  if (lType === 'PAIR') {
    const pairs = getAllPairs(sortedHand);
    if (pairs.some(p => getCardScore(getHighestCard(p)) > getCardScore(lHigh))) return true;
    if (lHigh.rank === Rank.Two) {
        if (getAllQuads(sortedHand).length > 0) return true;
        const ranks = Array.from(new Set(pairs.map(p => p[0].rank))).sort((a,b) => a-b);
        for (let i = 0; i <= ranks.length - 4; i++) {
            if (ranks[i+1] === ranks[i]+1 && ranks[i+2] === ranks[i+1]+1 && ranks[i+3] === ranks[i+2]+1 && ranks[i+3] !== Rank.Two) return true;
        }
    }
    return false;
  }

  if (lType === 'TRIPLE') {
    const triples = getAllTriples(sortedHand);
    return triples.some(t => getCardScore(getHighestCard(t)) > getCardScore(lHigh));
  }

  if (lType === 'QUAD') {
    const quads = getAllQuads(sortedHand);
    return quads.some(q => getCardScore(getHighestCard(q)) > getCardScore(lHigh));
  }

  if (lType === 'RUN') {
    const targetLen = lastPlayedCards.length;
    const uniqueCards = Array.from(new Set(sortedHand.filter(c => c.rank !== Rank.Two).map(c => c.rank)))
      .map(rank => sortedHand.find(c => c.rank === rank)!);
    
    for (let i = 0; i <= uniqueCards.length - targetLen; i++) {
      const subset = uniqueCards.slice(i, i + targetLen);
      if (validateMove(subset, playPile, isFirstTurnOfGame).isValid) return true;
    }
    return false;
  }

  if (lType === '3_PAIRS') {
    const pairs = getAllPairs(sortedHand);
    const ranks = Array.from(new Set(pairs.map(p => p[0].rank))).sort((a,b) => a-b);
    for (let i = 0; i <= ranks.length - 3; i++) {
        if (ranks[i+1] === ranks[i]+1 && ranks[i+2] === ranks[i+1]+1 && ranks[i+2] !== Rank.Two) {
            const p1 = pairs.find(p => p[0].rank === ranks[i])!;
            const p2 = pairs.find(p => p[0].rank === ranks[i+1])!;
            const p3 = pairs.find(p => p[0].rank === ranks[i+2])!;
            if (validateMove([...p1, ...p2, ...p3], playPile, isFirstTurnOfGame).isValid) return true;
        }
    }
    return false;
  }

  return false;
};

/**
 * Smart Combo Detection
 * Finds all valid playable combinations in hand that include the specified card.
 */
export const findAllValidCombos = (
  hand: Card[],
  pivotCardId: string,
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false
): Record<string, Card[][]> => {
  const sortedHand = sortCards(hand);
  const pivotCard = hand.find(c => c.id === pivotCardId);
  if (!pivotCard) return {};

  const combos: Record<string, Card[][]> = {
    'SINGLE': [],
    'PAIR': [],
    'TRIPLE': [],
    'QUAD': [],
    'RUN': [],
    'BOMB': []
  };

  const addIfValid = (candidate: Card[], type: string) => {
    const res = validateMove(candidate, playPile, isFirstTurnOfGame);
    if (res.isValid) {
      // Ensure pivot card is included
      if (candidate.some(c => c.id === pivotCardId)) {
        combos[type].push(candidate);
      }
    }
  };

  // 1. Singles
  addIfValid([pivotCard], 'SINGLE');

  // 2. Pairs & Triples & Quads
  const sameRank = sortedHand.filter(c => c.rank === pivotCard.rank);
  if (sameRank.length >= 2) {
    // Collect all unique combinations of pairs containing pivot
    for (const c of sameRank) {
      if (c.id !== pivotCardId) addIfValid([pivotCard, c], 'PAIR');
    }
  }
  if (sameRank.length >= 3) {
    // Triple combinations containing pivot
    const others = sameRank.filter(c => c.id !== pivotCardId);
    for (let i = 0; i < others.length - 1; i++) {
      for (let j = i + 1; j < others.length; j++) {
        addIfValid([pivotCard, others[i], others[j]], 'TRIPLE');
      }
    }
  }
  if (sameRank.length === 4) {
    addIfValid(sameRank, 'QUAD');
  }

  // 3. Runs (3 to 13 cards)
  if (pivotCard.rank !== Rank.Two) {
    const uniqueRanksMap: Record<number, Card[]> = {};
    sortedHand.forEach(c => {
      if (c.rank !== Rank.Two) {
        if (!uniqueRanksMap[c.rank]) uniqueRanksMap[c.rank] = [];
        uniqueRanksMap[c.rank].push(c);
      }
    });

    // Check all possible runs containing pivot
    const lastTurn = playPile[playPile.length - 1];
    const targetLen = lastTurn?.cards.length || 0;
    const isLead = playPile.length === 0;

    // Sliding window for runs
    for (let len = Math.max(3, targetLen); len <= 13; len++) {
      if (!isLead && len !== targetLen) continue;

      for (let startRank = pivotCard.rank - len + 1; startRank <= pivotCard.rank; startRank++) {
        const endRank = startRank + len - 1;
        if (startRank < 3 || endRank > Rank.Ace) continue;

        // Verify if rank sequence exists
        let sequencePossible = true;
        for (let r = startRank; r <= endRank; r++) {
          if (!uniqueRanksMap[r]) { sequencePossible = false; break; }
        }

        if (sequencePossible) {
          // If sequence exists, find all card combinations. 
          // For simplicity in a smart bar, we just pivot on the first available card of each rank,
          // but specifically use our pivotCard for its rank.
          const runCandidate: Card[] = [];
          for (let r = startRank; r <= endRank; r++) {
            if (r === pivotCard.rank) runCandidate.push(pivotCard);
            else runCandidate.push(uniqueRanksMap[r][0]);
          }
          addIfValid(runCandidate, 'RUN');
        }
      }
    }
  }

  // 4. Bombs (3-pairs, 4-pairs)
  const pairs = getAllPairs(sortedHand);
  const pairRanks = Array.from(new Set(pairs.map(p => p[0].rank))).sort((a,b) => a-b);
  
  // 3 Consecutive pairs
  for (let i = 0; i <= pairRanks.length - 3; i++) {
    const r1 = pairRanks[i], r2 = pairRanks[i+1], r3 = pairRanks[i+2];
    if (r2 === r1 + 1 && r3 === r2 + 1 && r3 !== Rank.Two) {
      if (r1 === pivotCard.rank || r2 === pivotCard.rank || r3 === pivotCard.rank) {
        const combo = [
          ...pairs.find(p => p[0].rank === r1)!,
          ...pairs.find(p => p[0].rank === r2)!,
          ...pairs.find(p => p[0].rank === r3)!
        ];
        addIfValid(combo, 'BOMB');
      }
    }
  }

  // 4 Consecutive pairs
  for (let i = 0; i <= pairRanks.length - 4; i++) {
    const r1 = pairRanks[i], r2 = pairRanks[i+1], r3 = pairRanks[i+2], r4 = pairRanks[i+3];
    if (r2 === r1+1 && r3 === r2+1 && r4 === r3+1 && r4 !== Rank.Two) {
       if ([r1, r2, r3, r4].includes(pivotCard.rank)) {
         const combo = [
            ...pairs.find(p => p[0].rank === r1)!,
            ...pairs.find(p => p[0].rank === r2)!,
            ...pairs.find(p => p[0].rank === r3)!,
            ...pairs.find(p => p[0].rank === r4)!
         ];
         addIfValid(combo, 'BOMB');
       }
    }
  }

  return combos;
};

// --- AI LOGIC ---

export const findBestMove = (
  hand: Card[], 
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false,
  difficulty: AiDifficulty = 'MEDIUM'
): Card[] | null => {
  const sortedHand = sortCards(hand);

  if (difficulty === 'EASY' && playPile.length > 0 && Math.random() < 0.45) return null;

  if (playPile.length === 0) {
    if (isFirstTurnOfGame) {
        const threeSpades = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
        if (!threeSpades) return [sortedHand[0]];
        const pairWith3S = sortedHand.filter(c => c.rank === Rank.Three);
        if (pairWith3S.length >= 2) return [threeSpades, pairWith3S.find(c => c.id !== threeSpades.id)!];
        return [threeSpades];
    }

    if (difficulty === 'HARD') {
      const uniqueRanks = Array.from(new Set(sortedHand.filter(c => c.rank !== Rank.Two).map(c => c.rank))).sort((a,b) => a-b);
      for (let len = 13; len >= 3; len--) {
        for (let i = 0; i <= uniqueRanks.length - len; i++) {
          let seq = true;
          for (let k = 0; k < len - 1; k++) if (uniqueRanks[i+k+1] !== uniqueRanks[i+k]+1) seq = false;
          if (seq) {
            const run = uniqueRanks.slice(i, i + len).map(r => sortedHand.find(c => c.rank === r)!);
            return run;
          }
        }
      }
      const triples = getAllTriples(sortedHand);
      if (triples.length > 0) return triples[0];
      const pairs = getAllPairs(sortedHand);
      if (pairs.length > 0) return pairs[0];
    }

    return [sortedHand[0]];
  }

  const lastTurn = playPile[playPile.length - 1];
  const lastPlayedCards = lastTurn.cards;
  const lType = getComboType(lastPlayedCards) as ComboType;
  const lHigh = getHighestCard(lastPlayedCards);

  if (lType === 'SINGLE') {
      for (const card of sortedHand) {
          if (validateMove([card], playPile, isFirstTurnOfGame).isValid) {
            if (difficulty === 'HARD' || difficulty === 'MEDIUM') {
                if (card.rank === Rank.Two && sortedHand.length > 4 && Math.random() < 0.6) continue;
            }
            return [card];
          }
      }
      if (lHigh.rank === Rank.Two) {
          const quads = getAllQuads(sortedHand);
          if (quads.length > 0) return quads[0];
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

  if (lType === 'RUN') {
    const targetLen = lastPlayedCards.length;
    const uniqueCards = Array.from(new Set(sortedHand.filter(c => c.rank !== Rank.Two).map(c => c.rank)))
      .map(rank => sortedHand.find(c => c.rank === rank)!);
    
    for (let i = 0; i <= uniqueCards.length - targetLen; i++) {
      const subset = uniqueCards.slice(i, i + targetLen);
      if (validateMove(subset, playPile, isFirstTurnOfGame).isValid) return subset;
    }
  }
  
  return null;
};
