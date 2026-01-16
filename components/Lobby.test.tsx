import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lobby } from './Lobby';
import { BackgroundTheme } from '../types';

// Mock dependencies
vi.mock('./UserHub', () => ({
  BoardSurface: ({ themeId }: { themeId: string }) => <div data-testid="board-surface">Board Surface: {themeId}</div>,
}));

vi.mock('./VisualEmote', () => ({
  VisualEmote: ({ trigger }: { trigger: string }) => <span data-testid="visual-emote">{trigger}</span>,
}));

vi.mock('./Toast', () => ({
  Toast: ({ message }: { message: string }) => <div data-testid="toast">{message}</div>,
}));

vi.mock('../services/supabase', () => ({
  fetchEmotes: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/localDiscovery', () => ({
  localDiscoveryService: {
    hostRoom: vi.fn(),
    joinRoom: vi.fn(),
    stopHosting: vi.fn(),
    checkLocalNetwork: vi.fn().mockResolvedValue({
      isLocalNetwork: false,
      networkType: 'wifi' as const,
      canHost: false,
    }),
  },
}));

vi.mock('../utils/wordFilter', () => ({
  containsProfanity: vi.fn().mockReturnValue(false),
}));

describe('Lobby Component - Tab Switching', () => {
  const defaultProps = {
    playerName: 'Test Player',
    gameState: null,
    error: null,
    playerAvatar: ':smile:',
    initialRoomCode: null,
    backgroundTheme: 'EMERALD' as BackgroundTheme,
    onBack: vi.fn(),
    onSignOut: vi.fn(),
    myId: 'test-user-id',
    turnTimerSetting: 30,
    selected_sleeve_id: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Lobby component', () => {
    render(<Lobby {...defaultProps} />);
    expect(screen.getByText(/PLAY WITH FRIENDS/i)).toBeInTheDocument();
  });

  it('shows Public tab content by default (Find Match)', () => {
    render(<Lobby {...defaultProps} />);
    
    // Verify Public tab content is visible
    expect(screen.getByText(/Join with Room Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Public Matches/i)).toBeInTheDocument();
    
    // Verify Create tab content is NOT visible
    expect(screen.queryByText(/Room Name/i)).not.toBeInTheDocument();
    
    // Verify Local tab content is NOT visible
    expect(screen.queryByText(/Traveler's Guide/i)).not.toBeInTheDocument();
  });

  it('switches to Create tab when Create Room button is clicked', async () => {
    render(<Lobby {...defaultProps} />);
    
    // Find and click the Create Room button
    const createRoomButton = screen.getByRole('button', { name: /Create Room/i });
    expect(createRoomButton).toBeInTheDocument();
    
    fireEvent.click(createRoomButton);
    
    // Wait for the tab content to change
    await waitFor(() => {
      // Verify Create tab content is visible
      expect(screen.getByText(/Room Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Create Room/i)).toBeInTheDocument();
    });
    
    // Verify Public tab content is GONE
    expect(screen.queryByText(/Join with Room Code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Public Matches/i)).not.toBeInTheDocument();
    
    // Verify Local tab content is NOT visible
    expect(screen.queryByText(/Traveler's Guide/i)).not.toBeInTheDocument();
  });

  it('switches to Local tab when Local button is clicked', async () => {
    render(<Lobby {...defaultProps} />);
    
    // Find and click the Local button
    const localButton = screen.getByRole('button', { name: /Local/i });
    expect(localButton).toBeInTheDocument();
    
    fireEvent.click(localButton);
    
    // Wait for the tab content to change
    await waitFor(() => {
      // Verify Local tab content is visible
      expect(screen.getByText(/Traveler's Guide/i)).toBeInTheDocument();
      expect(screen.getByText(/Host starts Hotspot/i)).toBeInTheDocument();
      expect(screen.getByText(/Friends join Wi-Fi/i)).toBeInTheDocument();
      expect(screen.getByText(/Play anywhere/i)).toBeInTheDocument();
    });
    
    // Verify Public tab content is NOT visible
    expect(screen.queryByText(/Join with Room Code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Public Matches/i)).not.toBeInTheDocument();
    
    // Verify Create tab content is NOT visible
    expect(screen.queryByText(/Room Name/i)).not.toBeInTheDocument();
  });

  it('switches back to Public tab from Create tab', async () => {
    render(<Lobby {...defaultProps} />);
    
    // First, switch to Create tab
    const createRoomButton = screen.getByRole('button', { name: /Create Room/i });
    fireEvent.click(createRoomButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Room Name/i)).toBeInTheDocument();
    });
    
    // Then, switch back to Public tab
    const findMatchButton = screen.getByRole('button', { name: /Find Match/i });
    expect(findMatchButton).toBeInTheDocument();
    
    fireEvent.click(findMatchButton);
    
    // Wait for the tab content to change back
    await waitFor(() => {
      // Verify Public tab content is visible again
      expect(screen.getByText(/Join with Room Code/i)).toBeInTheDocument();
      expect(screen.getByText(/Public Matches/i)).toBeInTheDocument();
    });
    
    // Verify Create tab content is GONE
    expect(screen.queryByText(/Room Name/i)).not.toBeInTheDocument();
  });

  it('switches back to Public tab from Local tab', async () => {
    render(<Lobby {...defaultProps} />);
    
    // First, switch to Local tab
    const localButton = screen.getByRole('button', { name: /Local/i });
    fireEvent.click(localButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Traveler's Guide/i)).toBeInTheDocument();
    });
    
    // Then, switch back to Public tab
    const findMatchButton = screen.getByRole('button', { name: /Find Match/i });
    expect(findMatchButton).toBeInTheDocument();
    
    fireEvent.click(findMatchButton);
    
    // Wait for the tab content to change back
    await waitFor(() => {
      // Verify Public tab content is visible again
      expect(screen.getByText(/Join with Room Code/i)).toBeInTheDocument();
      expect(screen.getByText(/Public Matches/i)).toBeInTheDocument();
    });
    
    // Verify Local tab content is GONE
    expect(screen.queryByText(/Traveler's Guide/i)).not.toBeInTheDocument();
  });

  it('can switch between all three tabs successfully', async () => {
    render(<Lobby {...defaultProps} />);
    
    // Start on Public tab
    expect(screen.getByText(/Join with Room Code/i)).toBeInTheDocument();
    
    // Switch to Create tab
    const createRoomButton = screen.getByRole('button', { name: /Create Room/i });
    fireEvent.click(createRoomButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Room Name/i)).toBeInTheDocument();
    });
    
    // Switch to Local tab
    const localButton = screen.getByRole('button', { name: /Local/i });
    fireEvent.click(localButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Traveler's Guide/i)).toBeInTheDocument();
    });
    
    // Switch back to Public tab
    const findMatchButton = screen.getByRole('button', { name: /Find Match/i });
    fireEvent.click(findMatchButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Join with Room Code/i)).toBeInTheDocument();
      expect(screen.queryByText(/Room Name/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Traveler's Guide/i)).not.toBeInTheDocument();
    });
  });
});
