import { describe, it, expect } from 'vitest';
import { getComboType, validateMove, sortCards } from './gameLogic';
import { Rank, Suit, Card } from '../types';

const C3 = { id: 'c3', rank: Rank.Three, suit: Suit.Clubs };
const S3 = { id: 's3', rank: Rank.Three, suit: Suit.Spades };
const D3 = { id: 'd3', rank: Rank.Three, suit: Suit.Diamonds };
const H3 = { id: 'h3', rank: Rank.Three, suit: Suit.Hearts };
const S4 = { id: 's4', rank: Rank.Four, suit: Suit.Spades };
const S5 = { id: 's5', rank: Rank.Five, suit: Suit.Spades };
const H2 = { id: 'h2', rank: Rank.Two, suit: Suit.Hearts };

describe('Tiến Lên Game Logic', () => {
  describe('getComboType', () => {
    it('identifies singles', () => {
      expect(getComboType([S3])).toBe('SINGLE');
    });

    it('identifies pairs', () => {
      expect(getComboType([S3, D3])).toBe('PAIR');
    });

    it('identifies triples', () => {
      expect(getComboType([S3, D3, H3])).toBe('TRIPLE');
    });

    it('identifies quads', () => {
      expect(getComboType([S3, C3, D3, H3])).toBe('QUAD');
    });

    it('identifies runs', () => {
      expect(getComboType([S3, S4, S5])).toBe('RUN');
    });

    it('identifies bombs (3 pairs)', () => {
      const bomb = [
        { rank: Rank.Three, suit: Suit.Spades }, { rank: Rank.Three, suit: Suit.Hearts },
        { rank: Rank.Four, suit: Suit.Spades }, { rank: Rank.Four, suit: Suit.Hearts },
        { rank: Rank.Five, suit: Suit.Spades }, { rank: Rank.Five, suit: Suit.Hearts },
      ] as Card[];
      expect(getComboType(bomb)).toBe('BOMB');
    });
  });

  describe('validateMove', () => {
    it('enforces starting with 3 of Spades on the first turn', () => {
      const myHand = [S3, S4, S5];
      const move = [S4];
      const result = validateMove(move, [], true, myHand);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Must include 3♠');
    });

    it('allows leading with any card on a fresh round', () => {
      const result = validateMove([S5], [], false, []);
      expect(result.isValid).toBe(true);
    });

    it('allows beating a single with a higher single', () => {
      const pile = [{ playerId: '1', cards: [S3], comboType: 'SINGLE' }];
      const result = validateMove([H3], pile, false, []);
      expect(result.isValid).toBe(true);
    });

    it('rejects a lower single', () => {
      const pile = [{ playerId: '1', cards: [H3], comboType: 'SINGLE' }];
      const result = validateMove([S3], pile, false, []);
      expect(result.isValid).toBe(false);
    });

    it('allows a Quad to chop a 2', () => {
      const pile = [{ playerId: '1', cards: [H2], comboType: 'SINGLE' }];
      const quad = [S3, C3, D3, H3];
      const result = validateMove(quad, pile, false, []);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('Chop!');
    });
  });
});