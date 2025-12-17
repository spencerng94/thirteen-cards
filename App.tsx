import React, { useState, useEffect } from 'react';
import { connectSocket, socket, disconnectSocket } from './services/socket';
import { GameState, GameStatus, SocketEvents, Card, Player, Rank, Suit } from './types';
import { GameTable } from './components/GameTable';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Lobby } from './components/Lobby';
import { VictoryScreen } from './components/VictoryScreen';
import { dealCards, validateMove, findBestMove, getComboType } from './utils/gameLogic';
import { CardCoverStyle } from './components/Card';

type ViewState = 'WELCOME' | 'LOBBY' | 'GAME_TABLE' | 'VICTORY';
type GameMode = 'SINGLE_PLAYER' | 'MULTI_PLAYER' | null;

const BOT_AVATARS = ['🤖', '👾', '👽', '🤡', '👹', '👺', '👻'];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('WELCOME');
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('😎');
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [cardCoverStyle, setCardCoverStyle] = useState<CardCoverStyle>('BLUE');
  
  // Multiplayer State
  const [connected, setConnected] = useState(false);
  const [mpGameState, setMpGameState] = useState<GameState | null>(null);
  const [mpMyHand, setMpMyHand] = useState<Card[]>([]);
  
  // Single Player State
  const [spGameState, setSpGameState] = useState<GameState | null>(null);
  const [spMyHand, setSpMyHand] = useState<Card[]>([]);
  const [spOpponentHands, setSpOpponentHands] = useState<Record<string, Card[]>>({});
  
  const [error, setError] = useState<string | null>(null);

  // --- Multiplayer Setup ---
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    
    const onGameState = (state: GameState) => {
      setMpGameState(state);
      setError(null);
      if (state.status === GameStatus.PLAYING) {
        setView('GAME_TABLE');
      } else if (state.status === GameStatus.FINISHED) {
        setView('VICTORY');
      } else if (state.status === GameStatus.LOBBY) {
        setView('LOBBY');
      }
    };

    const onPlayerHand = (cards: Card[]) => {
      setMpMyHand(cards);
    };

    const onError = (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SocketEvents.GAME_STATE, onGameState);
    socket.on(SocketEvents.PLAYER_HAND, onPlayerHand);
    socket.on(SocketEvents.ERROR, onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SocketEvents.GAME_STATE, onGameState);
      socket.off(SocketEvents.PLAYER_HAND, onPlayerHand);
      socket.off(SocketEvents.ERROR, onError);
    };
  }, []);

  // --- Single Player Logic ---

  const initSinglePlayer = (name: string, avatar: string) => {
    const hands = dealCards(); // Returns 4 hands
    
    // Find the player with 3 of Spades
    let startingPlayerIndex = 0;
    
    // Check all hands
    for (let i = 0; i < 4; i++) {
        if (hands[i].some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) {
            startingPlayerIndex = i;
            break;
        }
    }

    const myId = 'player-me';
    const bots = [
      { id: 'bot-1', name: 'Bot 1', avatar: BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)] },
      { id: 'bot-2', name: 'Bot 2', avatar: BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)] },
      { id: 'bot-3', name: 'Bot 3', avatar: BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)] }
    ];

    // Map hands to players based on fixed slots
    const players: Player[] = [
      { id: myId, name: name, avatar: avatar, cardCount: 13, isHost: true, hasPassed: false },
      ...bots.map((b) => ({ id: b.id, name: b.name, avatar: b.avatar, cardCount: 13, isHost: false, hasPassed: false }))
    ];

    setSpMyHand(hands[0]);
    setSpOpponentHands({
      'bot-1': hands[1],
      'bot-2': hands[2],
      'bot-3': hands[3]
    });

    const startingPlayerId = players[startingPlayerIndex].id;

    setSpGameState({
      roomId: 'LOCAL_MATCH',
      status: GameStatus.PLAYING,
      players: players,
      currentPlayerId: startingPlayerId,
      currentPlayPile: [],
      lastPlayerToPlayId: null,
      winnerId: null,
      isFirstTurnOfGame: true
    });
    
    setView('GAME_TABLE');
  };

  // AI Turn Effect
  useEffect(() => {
    if (gameMode !== 'SINGLE_PLAYER' || !spGameState || spGameState.status !== GameStatus.PLAYING) return;
    
    const currentPlayer = spGameState.players.find(p => p.id === spGameState.currentPlayerId);
    if (currentPlayer && currentPlayer.id.startsWith('bot-')) {
      const timer = setTimeout(() => {
        handleBotTurn(currentPlayer.id);
      }, 1000 + Math.random() * 1000); // Randomized delay
      return () => clearTimeout(timer);
    }
  }, [spGameState, gameMode]);

  const handleBotTurn = (botId: string) => {
    const hand = spOpponentHands[botId];
    const move = findBestMove(hand, spGameState!.currentPlayPile, spGameState!.isFirstTurnOfGame);

    if (move) {
      handleLocalPlay(botId, move);
    } else {
      handleLocalPass(botId);
    }
  };

  const handleLocalPlay = (playerId: string, cards: Card[]) => {
    if (!spGameState) return;

    // Validate if human
    if (playerId === 'player-me') {
       const res = validateMove(cards, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame);
       if (!res.isValid) {
         setError(res.reason);
         setTimeout(() => setError(null), 2000);
         return;
       }
    }

    // Update Hand
    let newHandCount = 0;
    if (playerId === 'player-me') {
       const newHand = spMyHand.filter(c => !cards.some(played => played.id === c.id));
       setSpMyHand(newHand);
       newHandCount = newHand.length;
    } else {
       const newHand = spOpponentHands[playerId].filter(c => !cards.some(played => played.id === c.id));
       setSpOpponentHands(prev => ({ ...prev, [playerId]: newHand }));
       newHandCount = newHand.length;
    }

    // Check Win
    if (newHandCount === 0) {
      setSpGameState(prev => ({
        ...prev!,
        status: GameStatus.FINISHED,
        winnerId: playerId
      }));
      setView('VICTORY');
      return;
    }

    // Create Play Entry
    const playEntry = {
        playerId,
        cards,
        comboType: getComboType(cards)
    };

    // Update State
    const updatedPlayers = spGameState.players.map(p => 
      p.id === playerId ? { ...p, cardCount: newHandCount } : p
    );

    setSpGameState(prev => ({
        ...prev!,
        players: updatedPlayers,
        currentPlayPile: [...prev!.currentPlayPile, playEntry],
        currentPlayerId: getNextPlayerId(prev!, playerId),
        lastPlayerToPlayId: playerId,
        isFirstTurnOfGame: false // Clear flag after any valid play
    }));
  };

  const handleLocalPass = (playerId: string) => {
    if (!spGameState) return;

    const updatedPlayers = spGameState.players.map(p => 
      p.id === playerId ? { ...p, hasPassed: true } : p
    );

    let nextPlayerId = getNextPlayerId({ ...spGameState, players: updatedPlayers }, playerId);
    let nextStatePlayers = updatedPlayers;
    let nextPlayPile = spGameState.currentPlayPile;

    // Logic: If next player is the one who last played (everyone else passed)
    if (nextPlayerId === spGameState.lastPlayerToPlayId) {
        // Reset round
        nextPlayPile = [];
        nextStatePlayers = nextStatePlayers.map(p => ({ ...p, hasPassed: false }));
    }

    setSpGameState(prev => ({
      ...prev!,
      players: nextStatePlayers,
      currentPlayPile: nextPlayPile,
      currentPlayerId: nextPlayerId
    }));
  };

  const getNextPlayerId = (state: GameState, currentId: string): string => {
    const idx = state.players.findIndex(p => p.id === currentId);
    let nextIdx = (idx + 1) % state.players.length;
    let loopCount = 0;

    // Find next non-passed player
    while (state.players[nextIdx].hasPassed && loopCount < state.players.length) {
      nextIdx = (nextIdx + 1) % state.players.length;
      loopCount++;
    }
    
    return state.players[nextIdx].id;
  };

  // --- Handlers ---

  const handleStart = (name: string, mode: GameMode, style: CardCoverStyle, avatar: string) => {
    setPlayerName(name);
    setGameMode(mode);
    setCardCoverStyle(style);
    setPlayerAvatar(avatar);
    
    if (mode === 'MULTI_PLAYER') {
      connectSocket();
      setView('LOBBY');
    } else {
      initSinglePlayer(name, avatar);
    }
  };

  const handlePlayAgain = () => {
    // Reset Single Player Game
    if (gameMode === 'SINGLE_PLAYER') {
        initSinglePlayer(playerName, playerAvatar);
    } else {
        // Simple fallback for MP for now
        setView('LOBBY');
    }
  };

  const handleGoHome = () => {
    if (gameMode === 'MULTI_PLAYER') {
      disconnectSocket();
    }
    setSpGameState(null);
    setMpGameState(null);
    setGameMode(null);
    setView('WELCOME');
  };

  const onPlayCards = (cards: Card[]) => {
    if (gameMode === 'MULTI_PLAYER' && mpGameState) {
      socket.emit(SocketEvents.PLAY_CARDS, { roomId: mpGameState.roomId, cards });
    } else if (gameMode === 'SINGLE_PLAYER') {
      handleLocalPlay('player-me', cards);
    }
  };

  const onPassTurn = () => {
    if (gameMode === 'MULTI_PLAYER' && mpGameState) {
      socket.emit(SocketEvents.PASS_TURN, { roomId: mpGameState.roomId });
    } else if (gameMode === 'SINGLE_PLAYER') {
      handleLocalPass('player-me');
    }
  };

  // --- Render View Content ---

  const renderContent = () => {
    if (view === 'WELCOME') {
        return <WelcomeScreen onStart={handleStart} />;
    }

    if (view === 'LOBBY') {
        if (!connected) {
          return (
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 via-black to-black text-white flex flex-col items-center justify-center p-6 gap-8">
               <div className="relative">
                 <div className="w-20 h-20 border-4 border-white/10 border-t-yellow-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                 </div>
               </div>
               
               <div className="text-center">
                 <div className="text-2xl font-black tracking-widest uppercase mb-2 animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
                    Connecting
                 </div>
                 <div className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em]">
                    Establishing secure link...
                 </div>
               </div>
               
               <button 
                 onClick={handleGoHome}
                 className="group px-8 py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 rounded-full text-red-400 font-bold text-xs tracking-widest uppercase transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
                 Cancel
               </button>
            </div>
          );
        }
        // Pass error as null to suppress inline error in Lobby, since we use the global toast now
        return <Lobby playerName={playerName} gameState={mpGameState} error={null} playerAvatar={playerAvatar} />;
    }

    if (view === 'VICTORY') {
        const state = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
        const winner = state?.players.find(p => p.id === state.winnerId);
        const winnerName = winner?.name || 'Unknown';
        const isMe = state?.winnerId === (gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me');
        
        return (
            <VictoryScreen 
                winnerName={winnerName} 
                isMe={isMe} 
                onPlayAgain={handlePlayAgain}
                onGoHome={handleGoHome}
            />
        );
    }

    if (view === 'GAME_TABLE') {
        const state = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
        const hand = gameMode === 'MULTI_PLAYER' ? mpMyHand : spMyHand;
        const myId = gameMode === 'MULTI_PLAYER' ? (socket.id || '') : 'player-me';

        if (!state) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading Game...</div>;

        return (
          <GameTable 
            gameState={state} 
            myId={myId} 
            myHand={hand} 
            onPlayCards={onPlayCards}
            onPassTurn={onPassTurn}
            cardCoverStyle={cardCoverStyle}
            onChangeCoverStyle={setCardCoverStyle}
            onExitGame={handleGoHome}
          />
        );
    }

    return <div>Loading...</div>;
  };

  return (
    <>
      {/* Global Premium Error Toast */}
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm pointer-events-none">
            <div className="relative overflow-hidden bg-gradient-to-br from-red-500/85 via-red-800/85 to-red-950/90 backdrop-blur-md border border-red-400/30 text-white px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-4 transition-all">
                <div className="p-2 bg-red-500/20 rounded-full shrink-0 border border-red-400/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-xs tracking-wider uppercase text-red-200">System Notice</span>
                    <span className="font-semibold tracking-wide text-sm drop-shadow-sm leading-tight">{error}</span>
                </div>
                {/* Decorative glow */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-red-400/30 blur-2xl rounded-full"></div>
            </div>
        </div>
      )}

      {renderContent()}
    </>
  );
};

export default App;