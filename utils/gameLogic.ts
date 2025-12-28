import { Card, Rank, Suit, PlayTurn, AiDifficulty, GameStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---
type ComboType = 'SINGLE' | 'PAIR' | 'TRIPLE' | 'QUAD' | 'RUN' | 'BOMB' | '4_PAIRS' | 'INVALID';

// --- Helpers ---
export const getCardScore = (card: Card): number => {
  if (!card) return 0;
  return (card.rank || 0) * 10 + (card.suit || 0);
};

export const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => getCardScore(a) - getCardScore(b));
};

export const getHighestCard = (cards: Card | Card[]): Card | null => {
  if (!cards) return null;
  if (Array.isArray(cards)) {
    if (cards.length === 0) return null;
    const sorted = sortCards(cards);
    return sorted[sorted.length - 1];
  }
  return cards;
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

  // Check for 3 consecutive pairs (BOMB)
  if (len === 6) {
    const isPairs = 
      sorted[0].rank === sorted[1].rank &&
      sorted[2].rank === sorted[3].rank &&
      sorted[4].rank === sorted[5].rank;
    
    if (isPairs) {
      if (sorted[2].rank === sorted[0].rank + 1 && sorted[4].rank === sorted[2].rank + 1) {
        if (sorted[5].rank !== Rank.Two) {
            return 'BOMB';
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
    if (pType === 'QUAD' || pType === 'BOMB' || pType === '4_PAIRS') return { isValid: true, reason: 'Chop!' };
  }
  if (lType === 'PAIR' && lHigh.rank === Rank.Two) {
    if (pType === 'QUAD' || pType === '4_PAIRS') return { isValid: true, reason: 'Chop!' };
  }
  if (lType === 'QUAD' && pType === 'QUAD') {
     return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Higher Quad' } : { isValid: false, reason: 'Higher Quad needed.' };
  }
  if (lType === 'BOMB' && pType === 'BOMB') {
     return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Higher Bomb' } : { isValid: false, reason: 'Higher bomb needed.' };
  }
  if (lType === '4_PAIRS' && pType === '4_PAIRS') {
     return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Higher Pairs' } : { isValid: false, reason: 'Higher pairs needed.' };
  }
  if (pType === '4_PAIRS' && (lType === 'BOMB' || lType === 'QUAD')) return { isValid: true, reason: 'Mega Bomb!' };

  // --- STANDARD PLAY LOGIC ---
  if (pType === lType && playedCards.length === lastPlayedCards.length) {
    return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Beats last.' } : { isValid: false, reason: 'Card is too low.' };
  }

  return { isValid: false, reason: `Must play ${lType === 'BOMB' ? 'BOMB' : lType.replace('_', ' ')}.` };
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
    if (sorted[i].rank === sorted[i+1].rank && sorted[i].rank === sorted[i+2].rank && sorted[i].rank === sorted[i+3].rank) {
      quads.push(sorted.slice(i, i + 4));
      i += 3;
    }
  }
  return quads;
};

export const getConsecutivePairs = (hand: Card[], count: number): Card[][] => {
  const pairs = getAllPairs(hand);
  const result: Card[][] = [];
  if (pairs.length < count) return result;
  
  const pairsByRank: Record<number, Card[][]> = {};
  pairs.forEach(p => {
    if (p[0].rank === Rank.Two) return; 
    if (!pairsByRank[p[0].rank]) pairsByRank[p[0].rank] = [];
    pairsByRank[p[0].rank].push(p);
  });

  const sortedRanks = Object.keys(pairsByRank).map(Number).sort((a, b) => a - b);
  
  for (let i = 0; i <= sortedRanks.length - count; i++) {
    let valid = true;
    for (let j = 1; j < count; j++) {
      if (sortedRanks[i+j] !== sortedRanks[i+j-1] + 1) {
        valid = false;
        break;
      }
    }

    if (valid) {
      const combinations: Card[][] = [[]];
      for (let j = 0; j < count; j++) {
        const rank = sortedRanks[i + j];
        const nextBatch: Card[][] = [];
        for (const combo of combinations) {
          for (const pair of pairsByRank[rank]) {
            nextBatch.push([...combo, ...pair]);
          }
        }
        combinations.splice(0, combinations.length, ...nextBatch);
      }
      result.push(...combinations);
    }
  }
  return result;
};

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
    BOMB: [],
    '4_PAIRS': []
  };

  const pivotCard = hand.find(c => c.id === pivotId);
  if (!pivotCard) return result;

  const cardsByRank: Record<number, Card[]> = {};
  hand.forEach(c => {
    const r = Number(c.rank);
    if (!cardsByRank[r]) cardsByRank[r] = [];
    cardsByRank[r].push(c);
  });

  if (validateMove([pivotCard], playPile, isFirstTurnOfGame, hand).isValid) {
    result.SINGLE.push([pivotCard]);
  }

  const sameRankCards = cardsByRank[pivotCard.rank] || [];
  
  if (sameRankCards.length >= 2) {
    sameRankCards.forEach(c => {
      if (c.id !== pivotId) {
        const pair = sortCards([pivotCard, c]);
        if (validateMove(pair, playPile, isFirstTurnOfGame, hand).isValid) {
          result.PAIR.push(pair);
        }
      }
    });
  }

  if (sameRankCards.length >= 3) {
    for (let i = 0; i < sameRankCards.length; i++) {
      for (let j = i + 1; j < sameRankCards.length; j++) {
        const others = [sameRankCards[i], sameRankCards[j]];
        if (others.every(c => c.id !== pivotId)) {
          const triple = sortCards([pivotCard, ...others]);
          if (validateMove(triple, playPile, isFirstTurnOfGame, hand).isValid) {
            result.TRIPLE.push(triple);
          }
        }
      }
    }
  }

  if (sameRankCards.length === 4) {
    const quad = sortCards(sameRankCards);
    if (validateMove(quad, playPile, isFirstTurnOfGame, hand).isValid) {
      result.QUAD.push(quad);
    }
  }

  if (pivotCard.rank !== Rank.Two) {
    for (let len = 3; len <= 12; len++) {
      for (let pos = 0; pos < len; pos++) {
        const startRank = pivotCard.rank - pos;
        const endRank = startRank + len - 1;
        
        if (startRank >= Rank.Three && endRank <= Rank.Ace) {
          let possible = true;
          let combinationSeeds: Card[][] = [[]];
          
          for (let r = startRank; r <= endRank; r++) {
            if (!cardsByRank[r]) {
              possible = false;
              break;
            }
            const nextBatch: Card[][] = [];
            for (const combo of combinationSeeds) {
              for (const card of cardsByRank[r]) {
                nextBatch.push([...combo, card]);
              }
            }
            combinationSeeds = nextBatch;
          }
          
          if (possible) {
            combinationSeeds.forEach(combo => {
              if (combo.some(c => c.id === pivotId)) {
                if (validateMove(combo, playPile, isFirstTurnOfGame, hand).isValid) {
                  result.RUN.push(sortCards(combo));
                }
              }
            });
          }
        }
      }
    }
  }

  [3, 4].forEach(pairCount => {
    const typeKey = pairCount === 3 ? 'BOMB' : '4_PAIRS';
    getConsecutivePairs(hand, pairCount).forEach(bomb => {
      if (bomb.some(c => c.id === pivotId)) {
        if (validateMove(bomb, playPile, isFirstTurnOfGame, hand).isValid) {
          result[typeKey].push(bomb);
        }
      }
    });
  });

  return result;
};

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

export const findBestMove = (
  hand: Card[],
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean,
  difficulty: AiDifficulty = 'MEDIUM'
): Card[] | null => {
  const sortedHand = sortCards(hand);
  
  // LEADING A ROUND
  if (playPile.length === 0) {
    if (isFirstTurnOfGame) {
      const threeS = hand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
      if (threeS) {
        // Try to find a combo with 3S
        const pivotId = threeS.id;
        const combos = findAllValidCombos(hand, pivotId, [], true);
        if (combos.RUN.length > 0) return combos.RUN[0];
        if (combos.TRIPLE.length > 0) return combos.TRIPLE[0];
        if (combos.PAIR.length > 0) return combos.PAIR[0];
        return [threeS];
      }
    }
    
    // Standard AI lead
    const quads = getAllQuads(sortedHand);
    if (quads.length > 0) return quads[0];
    const triples = getAllTriples(sortedHand);
    if (triples.length > 0) return triples[0];
    const pairs = getAllPairs(sortedHand);
    if (pairs.length > 0) return pairs[0];
    
    // Lead lowest card
    return [sortedHand[0]];
  }

  // RESPONDING TO A MOVE
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
    const bombs = getConsecutivePairs(sortedHand, 3);
    if (bombs.length > 0) return bombs[0];
  }

  return null;
};