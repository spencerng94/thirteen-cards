
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
  const pType = getComboType(playedCards);
  if (pType === 'INVALID') {
    return { isValid: false, reason: 'Invalid card combination.' };
  }

  // First turn of the ENTIRE game must have 3 of Spades IF it is in the player's hand
  if (isFirstTurnOfGame && playPile.length === 0) {
    const handHas3Spades = myHand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
    const moveHas3Spades = playedCards.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
    if (handHas3Spades && !moveHas3Spades) {
      return { isValid: false, reason: 'First move must include the 3♠.' };
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
    return getCardScore(pHigh) > getCardScore(lHigh) ? { isValid: true, reason: 'Valid Move.' } : { isValid: false, reason: 'Too low.' };
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
    if (sorted[i].rank === sorted[i+2].rank) {
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

const getConsecutivePairs = (hand: Card[], count: number) => {
  const pairs = getAllPairs(hand);
  const result: Card[][] = [];
  if (pairs.length < count) return result;
  const uniquePairs = pairs.filter(p => p[0].rank !== Rank.Two);
  for (let i = 0; i <= uniquePairs.length - count; i++) {
    let valid = true;
    const sequence: Card[] = [];
    for (let j = 0; j < count; j++) {
      if (j > 0 && uniquePairs[i+j][0].rank !== uniquePairs[i+j-1][0].rank + 1) {
        valid = false;
        break;
      }
      sequence.push(...uniquePairs[i+j]);
    }
    if (valid) result.push(sequence);
  }
  return result;
};

export const canPlayAnyMove = (
  hand: Card[], 
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false
): boolean => {
  if (playPile.length === 0) return hand.length > 0;
  const lastTurn = playPile[playPile.length - 1];
  const lType = getComboType(lastTurn.cards);
  const lHigh = getHighestCard(lastTurn.cards);
  const lLen = lastTurn.cards.length;
  const sorted = sortCards(hand);
  if (lType === 'SINGLE' || playPile.length === 0) if (sorted.some(c => validateMove([c], playPile, isFirstTurnOfGame, hand).isValid)) return true;
  if (lType === 'PAIR' || playPile.length === 0) if (getAllPairs(sorted).some(p => validateMove(p, playPile, isFirstTurnOfGame, hand).isValid)) return true;
  if (lType === 'TRIPLE' || playPile.length === 0) if (getAllTriples(sorted).some(t => validateMove(t, playPile, isFirstTurnOfGame, hand).isValid)) return true;
  if (lType === 'QUAD' || playPile.length === 0) if (getAllQuads(sorted).some(q => validateMove(q, playPile, isFirstTurnOfGame, hand).isValid)) return true;
  if (lType === 'RUN') {
      const uniqueRanks = Array.from(new Set(sorted.filter(c => c.rank !== Rank.Two).map(c => c.rank))).sort((a,b) => a-b);
      if (uniqueRanks.length >= lLen) {
          for (let i = 0; i <= uniqueRanks.length - lLen; i++) {
              const runRanks = uniqueRanks.slice(i, i + lLen);
              let isSeq = true;
              for (let k = 0; k < lLen - 1; k++) if (runRanks[k+1] !== runRanks[k] + 1) isSeq = false;
              if (isSeq) {
                  const runCards = runRanks.map(r => sorted.find(c => c.rank === r)!);
                  if (validateMove(runCards, playPile, isFirstTurnOfGame, hand).isValid) return true;
              }
          }
      }
  }
  if (lHigh.rank === Rank.Two || ['QUAD', '3_PAIRS', '4_PAIRS'].includes(lType)) {
      if (getAllQuads(sorted).some(q => validateMove(q, playPile, isFirstTurnOfGame, hand).isValid)) return true;
      if (getConsecutivePairs(sorted, 3).some(p => validateMove(p, playPile, isFirstTurnOfGame, hand).isValid)) return true;
      if (getConsecutivePairs(sorted, 4).some(p => validateMove(p, playPile, isFirstTurnOfGame, hand).isValid)) return true;
  }
  return false;
};

export const findAllValidCombos = (
  hand: Card[],
  pivotCardId: string,
  playPile: PlayTurn[],
  isFirstTurnOfGame: boolean = false
): Record<string, Card[][]> => {
  const sortedHand = sortCards(hand);
  const pivotCard = hand.find(c => c.id === pivotCardId);
  const handHasThreeSpades = hand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades);
  const threeSpades = hand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
  
  if (!pivotCard) return {};

  const combos: Record<string, Card[][]> = { 'SINGLE': [], 'PAIR': [], 'TRIPLE': [], 'QUAD': [], 'RUN': [], 'BOMB': [] };

  const addIfValid = (candidate: Card[], type: string) => {
    const res = validateMove(candidate, playPile, isFirstTurnOfGame, hand);
    if (res.isValid && candidate.some(c => c.id === pivotCardId)) combos[type].push(candidate);
  };

  addIfValid([pivotCard], 'SINGLE');

  const sameRank = sortedHand.filter(c => c.rank === pivotCard.rank);
  if (sameRank.length >= 2) for (const c of sameRank) if (c.id !== pivotCardId) addIfValid([pivotCard, c], 'PAIR');
  if (sameRank.length >= 3) {
    const others = sameRank.filter(c => c.id !== pivotCardId);
    for (let i = 0; i < others.length - 1; i++) for (let j = i + 1; j < others.length; j++) addIfValid([pivotCard, others[i], others[j]], 'TRIPLE');
  }
  if (sameRank.length === 4) addIfValid(sameRank, 'QUAD');

  if (pivotCard.rank !== Rank.Two) {
    const ranksMap: Record<number, Card[]> = {};
    sortedHand.forEach(c => {
      if (c.rank !== Rank.Two) {
        if (!ranksMap[c.rank]) ranksMap[c.rank] = [];
        ranksMap[c.rank].push(c);
      }
    });

    const lastTurn = playPile[playPile.length - 1];
    const targetLen = lastTurn?.cards.length || 0;
    const isLead = playPile.length === 0;

    for (let len = Math.max(3, targetLen); len <= 13; len++) {
      if (!isLead && len !== targetLen) continue;
      // startRank range ensures pivotCard is included in the sequence
      for (let startRank = pivotCard.rank - len + 1; startRank <= pivotCard.rank; startRank++) {
        const endRank = startRank + len - 1;
        if (startRank < 3 || endRank > Rank.Ace) continue;
        let sequencePossible = true;
        for (let r = startRank; r <= endRank; r++) if (!ranksMap[r]) { sequencePossible = false; break; }
        
        if (sequencePossible) {
          const runCandidate: Card[] = [];
          for (let r = startRank; r <= endRank; r++) {
            if (r === pivotCard.rank) runCandidate.push(pivotCard);
            else if (r === 3 && isFirstTurnOfGame && isLead && handHasThreeSpades) runCandidate.push(threeSpades!);
            else runCandidate.push(ranksMap[r][0]);
          }
          addIfValid(runCandidate, 'RUN');
        }
      }
    }
  }

  getConsecutivePairs(sortedHand, 3).forEach(p => addIfValid(p, 'BOMB'));
  getConsecutivePairs(sortedHand, 4).forEach(p => addIfValid(p, 'BOMB'));
  getAllQuads(sortedHand).forEach(q => addIfValid(q, 'BOMB'));

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
  if (playPile.length === 0) {
    if (isFirstTurnOfGame) {
        const threeSpades = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Spades);
        if (!threeSpades) return [sortedHand[0]];
        const combos = findAllValidCombos(hand, threeSpades.id, [], true);
        if (combos.RUN.length > 0) return combos.RUN[combos.RUN.length - 1];
        if (combos.PAIR.length > 0) return combos.PAIR[0];
        return [threeSpades];
    }
    const triples = getAllTriples(sortedHand); if (triples.length > 0) return triples[0];
    const pairs = getAllPairs(sortedHand); if (pairs.length > 0) return pairs[0];
    return [sortedHand[0]];
  }
  const lastTurn = playPile[playPile.length - 1];
  const lastPlayedCards = lastTurn.cards;
  const lType = getComboType(lastPlayedCards) as ComboType;
  const lHigh = getHighestCard(lastPlayedCards);
  let standardMove: Card[] | null = null;
  if (lType === 'SINGLE') { const match = sortedHand.find(c => getCardScore(c) > getCardScore(lHigh)); if (match) standardMove = [match]; }
  else if (lType === 'PAIR') { const pairs = getAllPairs(sortedHand); const match = pairs.find(p => getCardScore(getHighestCard(p)) > getCardScore(lHigh)); if (match) standardMove = match; }
  else if (lType === 'TRIPLE') { const triples = getAllTriples(sortedHand); const match = triples.find(t => getCardScore(getHighestCard(t)) > getCardScore(lHigh)); if (match) standardMove = match; }
  else if (lType === 'QUAD') { const quads = getAllQuads(sortedHand); const match = quads.find(q => getCardScore(getHighestCard(q)) > getCardScore(lHigh)); if (match) standardMove = match; }
  else if (lType === 'RUN') {
      const targetLen = lastPlayedCards.length;
      const uniqueRanks = Array.from(new Set(sortedHand.filter(c => c.rank !== Rank.Two).map(c => c.rank))).sort((a,b) => a-b);
      for (let i = 0; i <= uniqueRanks.length - targetLen; i++) {
        const ranks = uniqueRanks.slice(i, i + targetLen);
        if (ranks.length < targetLen) continue;
        let consecutive = true; for (let k = 0; k < ranks.length - 1; k++) if (ranks[k+1] !== ranks[k] + 1) consecutive = false;
        if (!consecutive) continue;
        const candidate = ranks.map(r => sortedHand.find(c => c.rank === r)!);
        if (getCardScore(getHighestCard(candidate)) > getCardScore(lHigh)) { standardMove = candidate; break; }
      }
  }
  let bombMove: Card[] | null = null;
  const targetIsTwo = lHigh.rank === Rank.Two;
  if (targetIsTwo || ['QUAD', '3_PAIRS', '4_PAIRS'].includes(lType)) {
    const quads = getAllQuads(sortedHand); const p3 = getConsecutivePairs(sortedHand, 3); const p4 = getConsecutivePairs(sortedHand, 4);
    if (lType === 'SINGLE' && targetIsTwo) { if (p3.length > 0) bombMove = p3[0]; else if (quads.length > 0) bombMove = quads[0]; else if (p4.length > 0) bombMove = p4[0]; }
    else if (lType === 'PAIR' && targetIsTwo) { if (quads.length > 0) bombMove = quads[0]; else if (p4.length > 0) bombMove = p4[0]; }
    else if (['QUAD', '3_PAIRS', '4_PAIRS'].includes(lType)) { if (p4.length > 0) bombMove = p4[0]; }
  }
  return bombMove || standardMove;
};
