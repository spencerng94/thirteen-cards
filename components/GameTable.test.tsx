
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameTable } from './GameTable';
import { GameStatus, Rank, Suit, GameState } from '../types';

const mockHand = [
  { id: '1', rank: Rank.Three, suit: Suit.Spades },
  { id: '2', rank: Rank.Four, suit: Suit.Clubs },
  { id: '3', rank: Rank.Five, suit: Suit.Hearts },
];

// Added missing lastPlayerToPlayId and winnerId properties to match the GameState interface
const mockGameState: GameState = {
  roomId: 'TEST',
  status: GameStatus.PLAYING,
  players: [
    { id: 'me', name: 'LOCAL PLAYER', avatar: ':cool:', cardCount: 3, isHost: true },
    { id: 'opp1', name: 'OPPONENT 1', avatar: ':robot:', cardCount: 13, isHost: false },
  ],
  currentPlayerId: 'me',
  currentPlayPile: [],
  lastPlayerToPlayId: null,
  winnerId: null,
  finishedPlayers: [],
  isFirstTurnOfGame: true,
  turnEndTime: Date.now() + 60000,
};

describe('GameTable Component', () => {
  const defaultProps = {
    gameState: mockGameState,
    myId: 'me',
    myHand: mockHand,
    onPlayCards: vi.fn(),
    onPassTurn: vi.fn(),
    cardCoverStyle: 'RED' as const,
    backgroundTheme: 'EMERALD' as const,
    onOpenSettings: vi.fn(),
    profile: null,
  };

  it('renders the game board and player names', () => {
    render(<GameTable {...defaultProps} />);
    expect(screen.getByText(/LOCAL PLAYER/i)).toBeInTheDocument();
    expect(screen.getByText(/OPPONENT 1/i)).toBeInTheDocument();
  });

  it('highlights the current player turn', () => {
    render(<GameTable {...defaultProps} />);
    // Check for the "Your Turn" label which only appears when it's 'me's turn
    expect(screen.getByText(/Your Turn/i)).toBeInTheDocument();
  });

  it('toggles card selection on click', () => {
    render(<GameTable {...defaultProps} />);
    
    // Find a card element. In our Card component, we use the Rank label for the text.
    // 3 of Spades should be visible.
    const card = screen.getByText('3');
    const cardContainer = card.closest('.relative'); // The card container
    
    fireEvent.click(cardContainer!);
    
    // In our Card component, selected cards get the '-translate-y-16' class
    expect(cardContainer?.parentElement).toHaveClass('-translate-y-16');
    
    fireEvent.click(cardContainer!);
    expect(cardContainer?.parentElement).not.toHaveClass('-translate-y-16');
  });

  it('disables Play Cards button for invalid moves (First turn must include 3S)', () => {
    render(<GameTable {...defaultProps} />);
    
    const playButton = screen.getByText(/Play Cards/i).closest('button');
    expect(playButton).toBeDisabled();
    
    // Select the 4 of Clubs (id: '2'), which is not the 3 of Spades
    const cardFour = screen.getByText('4').closest('.relative');
    fireEvent.click(cardFour!);
    
    expect(playButton).toBeDisabled();
  });

  it('enables Play Cards button when valid cards are selected', () => {
    render(<GameTable {...defaultProps} />);
    
    const playButton = screen.getByText(/Play Cards/i).closest('button');
    
    // Select the 3 of Spades (id: '1')
    const cardThree = screen.getByText('3').closest('.relative');
    fireEvent.click(cardThree!);
    
    expect(playButton).not.toBeDisabled();
  });

  it('calls onPassTurn when the Pass button is clicked and it is allowed', () => {
    const props = {
      ...defaultProps,
      gameState: {
        ...mockGameState,
        currentPlayPile: [{ playerId: 'opp1', cards: [], comboType: 'SINGLE' }]
      }
    };
    render(<GameTable {...props} />);
    
    const passButton = screen.getByText(/Pass/i).closest('button');
    fireEvent.click(passButton!);
    
    expect(props.onPassTurn).toHaveBeenCalled();
  });
});
