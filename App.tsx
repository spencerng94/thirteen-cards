import React, { useState, useEffect } from 'react';
import { connectSocket, socket, disconnectSocket } from './services/socket';
import { GameState, GameStatus, SocketEvents, Card, Player, Rank, Suit, BackgroundTheme } from './types';
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
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('GREEN');
  const [initialRoomCode, setInitialRoomCode] = useState<string | null>(null);
  const [spQuickFinish, setSpQuickFinish] = useState(false);
  
  // Multiplayer State
  const [connected, setConnected] = useState(false);
  const [mpGameState, setMpGameState] = useState<GameState | null>(null);
  const [mpMyHand, setMpMyHand] = useState<Card[]>([]);
  
  // Single Player State
  const [spGameState, setSpGameState] = useState<GameState | null>(null);
  const [spMyHand, setSpMyHand] = useState<Card[]>([]);
  const [spOpponentHands, setSpOpponentHands] = useState<Record<string, Card[]>>({});
  
  const [error, setError] = useState<string | null>(null);

  // --- Initial URL Parse (Share Link) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room.length === 4) {
      setInitialRoomCode(room.toUpperCase());
    }
  }, []);

  // --- Safety Redirect for Invalid Game State ---
  useEffect(() => {
    if (view === 'GAME_TABLE' && !gameMode) {
      setView('WELCOME');
    }
  }, [view, gameMode]);

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

    const players: Player[] = [
      { id: myId, name: name, avatar: avatar, cardCount: 13, isHost: true, hasPassed: false, finishedRank: null },
      ...bots.map((b) => ({ id: b.id, name: b.name, avatar: b.avatar, cardCount: 13, isHost: false, hasPassed: false, finishedRank: null }))
    ];

    setSpMyHand(hands[0]);
    setSpOpponentHands({
      'bot-1': hands[1],
      'bot-2': hands[2],
      'bot-3': hands[3]
    });

    setSpGameState({
      roomId: 'LOCAL_MATCH',
      status: GameStatus.PLAYING,
      players: players,
      currentPlayerId: players[startingPlayerIndex].id,
      currentPlayPile: [],
      lastPlayerToPlayId: null,
      winnerId: null,
      finishedPlayers: [],
      isFirstTurnOfGame: true
    });
    
    setView('GAME_TABLE');
  };

  // AI Turn Effect
  useEffect(() => {
    if (gameMode !== 'SINGLE_PLAYER' || !spGameState || spGameState.status !== GameStatus.PLAYING) return;
    
    const currentPlayer = spGameState.players.find(p => p.id === spGameState.currentPlayerId);
    if (currentPlayer && currentPlayer.id.startsWith('bot-') && !currentPlayer.finishedRank) {
      const timer = setTimeout(() => {
        handleBotTurn(currentPlayer.id);
      }, 1000 + Math.random() * 1000);
      return () => clearTimeout(timer);
    }
  }, [spGameState, gameMode]);

  const handleBotTurn = (botId: string) => {
    const hand = spOpponentHands[botId];
    if (!hand || hand.length === 0) return;
    const move = findBestMove(hand, spGameState!.currentPlayPile, spGameState!.isFirstTurnOfGame);
    if (move) {
      handleLocalPlay(botId, move);
    } else {
      handleLocalPass(botId);
    }
  };

  const handleLocalPlay = (playerId: string, cards: Card[]) => {
    if (!spGameState) return;

    if (playerId === 'player-me') {
       const res = validateMove(cards, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame);
       if (!res.isValid) {
         setError(res.reason);
         setTimeout(() => setError(null), 2000);
         return;
       }
    }

    let newHandCount = 0;
    let handIsEmpty = false;

    if (playerId === 'player-me') {
       const newHand = spMyHand.filter(c => !cards.some(played => played.id === c.id));
       setSpMyHand(newHand);
       newHandCount = newHand.length;
       if (newHandCount === 0) handIsEmpty = true;
    } else {
       const newHand = spOpponentHands[playerId].filter(c => !cards.some(played => played.id === c.id));
       setSpOpponentHands(prev => ({ ...prev, [playerId]: newHand }));
       newHandCount = newHand.length;
       if (newHandCount === 0) handIsEmpty = true;
    }

    let updatedPlayers = spGameState.players.map(p => 
        p.id === playerId ? { ...p, cardCount: newHandCount } : p
    );
    let updatedFinishedPlayers = [...spGameState.finishedPlayers];

    if (handIsEmpty) {
        updatedFinishedPlayers.push(playerId);
        updatedPlayers = updatedPlayers.map(p => 
            p.id === playerId ? { ...p, finishedRank: updatedFinishedPlayers.length } : p
        );

        // --- Quick Finish Logic ---
        if (playerId === 'player-me' && spQuickFinish) {
            // Automatically rank all bots based on current card counts
            const remainingBots = updatedPlayers
                .filter(p => !p.finishedRank)
                .sort((a, b) => a.cardCount - b.cardCount);
            
            let nextRank = updatedFinishedPlayers.length + 1;
            for (const bot of remainingBots) {
                updatedPlayers = updatedPlayers.map(p => 
                    p.id === bot.id ? { ...p, finishedRank: nextRank++ } : p
                );
            }

            setSpGameState(prev => ({
                ...prev!,
                status: GameStatus.FINISHED,
                players: updatedPlayers,
                finishedPlayers: updatedPlayers.sort((a,b) => (a.finishedRank||99)-(b.finishedRank||99)).map(p => p.id)
            }));
            setView('VICTORY');
            return;
        }

        const activeCount = updatedPlayers.filter(p => !p.finishedRank).length;
        if (activeCount <= 1) {
             if (activeCount === 1) {
                 updatedPlayers = updatedPlayers.map(p => {
                     if (!p.finishedRank) return { ...p, finishedRank: updatedPlayers.length };
                     return p;
                 });
             }
             setSpGameState(prev => ({
                 ...prev!,
                 status: GameStatus.FINISHED,
                 players: updatedPlayers,
                 finishedPlayers: updatedFinishedPlayers
             }));
             setView('VICTORY');
             return;
        }
    }

    const playEntry = {
        playerId,
        cards,
        comboType: getComboType(cards)
    };

    // Determine Next Player
    let nextPlayerId = getNextActivePlayerId(updatedPlayers, playerId);
    let nextPlayPile = [...spGameState.currentPlayPile, playEntry];
    let nextStatePlayers = updatedPlayers;

    // Check if the finisher's move automatically wins the round because everyone else had already passed
    if (handIsEmpty) {
      const othersStillInRound = updatedPlayers.filter(p => !p.finishedRank && p.id !== playerId && !p.hasPassed);
      if (othersStillInRound.length === 0) {
        // Round clears immediately
        nextPlayPile = [];
        nextStatePlayers = nextStatePlayers.map(p => ({ ...p, hasPassed: false }));
        nextPlayerId = getNextActivePlayerId(nextStatePlayers, playerId, true); // ignorePass: true
      }
    }

    setSpGameState(prev => ({
        ...prev!,
        players: nextStatePlayers,
        currentPlayPile: nextPlayPile,
        currentPlayerId: nextPlayerId,
        lastPlayerToPlayId: playerId,
        finishedPlayers: updatedFinishedPlayers,
        isFirstTurnOfGame: false
    }));
  };

  const handleLocalPass = (playerId: string) => {
    if (!spGameState) return;

    const updatedPlayers = spGameState.players.map(p => 
      p.id === playerId ? { ...p, hasPassed: true } : p
    );

    let nextPlayerId = getNextActivePlayerId(updatedPlayers, playerId);
    let nextStatePlayers = updatedPlayers;
    let nextPlayPile = spGameState.currentPlayPile;
    
    const lastPlayerToPlay = spGameState.players.find(p => p.id === spGameState.lastPlayerToPlayId);
    
    let roundOver = false;
    let newLeaderId = nextPlayerId;

    // A round is over if it rotates back to the person who played last,
    // or if the only people left have already passed.
    if (lastPlayerToPlay && !lastPlayerToPlay.finishedRank) {
        if (nextPlayerId === spGameState.lastPlayerToPlayId) {
            roundOver = true;
        }
    } else {
        // Last player to play has already finished and left.
        // Round is over if all remaining non-finished players have passed.
        const activeNonPassed = updatedPlayers.filter(p => !p.finishedRank && !p.hasPassed);
        if (activeNonPassed.length === 0) {
            roundOver = true;
            if (spGameState.lastPlayerToPlayId) {
                newLeaderId = getNextActivePlayerId(updatedPlayers, spGameState.lastPlayerToPlayId, true);
            }
        }
    }

    if (roundOver) {
        nextPlayPile = [];
        nextStatePlayers = nextStatePlayers.map(p => ({ ...p, hasPassed: false }));
        nextPlayerId = newLeaderId;
    }

    setSpGameState(prev => ({
      ...prev!,
      players: nextStatePlayers,
      currentPlayPile: nextPlayPile,
      currentPlayerId: nextPlayerId
    }));
  };

  /**
   * Helper to find the next valid player ID.
   * @param players List of players
   * @param currentId Starting ID
   * @param ignorePass Whether to ignore the 'hasPassed' flag (used when starting new rounds)
   */
  const getNextActivePlayerId = (players: Player[], currentId: string, ignorePass: boolean = false): string => {
    const idx = players.findIndex(p => p.id === currentId);
    if (idx === -1) return players[0].id;
    
    for (let i = 1; i <= players.length; i++) {
      const nextIdx = (idx + i) % players.length;
      const p = players[nextIdx];
      if (p.finishedRank) continue;
      if (!ignorePass && p.hasPassed) continue;
      return p.id;
    }
    
    // If we're searching within a round and no one is left, return current player (they win the round)
    return currentId;
  };

  // --- Handlers ---

  const handleStart = (name: string, mode: GameMode, style: CardCoverStyle, avatar: string, quickFinish?: boolean) => {
    setPlayerName(name);
    setGameMode(mode);
    setCardCoverStyle(style);
    setPlayerAvatar(avatar);
    if (quickFinish !== undefined) setSpQuickFinish(quickFinish);
    
    if (mode === 'MULTI_PLAYER') {
      connectSocket();
      setView('LOBBY');
    } else {
      initSinglePlayer(name, avatar);
    }
  };

  const handlePlayAgain = () => {
    if (gameMode === 'SINGLE_PLAYER') {
        initSinglePlayer(playerName, playerAvatar);
    } else {
        setView('LOBBY');
    }
  };

  const handleGoHome = () => {
    if (gameMode === 'MULTI_PLAYER') {
      disconnectSocket();
    }
    setConnected(false);
    setSpGameState(null);
    setMpGameState(null);
    setGameMode(null);
    setInitialRoomCode(null);
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.warn("Navigation failed:", e);
    }
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

  const renderContent = () => {
    if (view === 'GAME_TABLE' && !gameMode) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
             <div className="w-10 h-10 border-2 border-white/20 border-t-yellow-500 rounded-full animate-spin"></div>
             <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Exiting...</span>
         </div>
      );
    }

    if (view === 'WELCOME') return <WelcomeScreen onStart={handleStart} />;

    if (view === 'LOBBY') {
        if (!connected) {
          return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 gap-8 relative overflow-hidden transition-colors duration-1000">
               {/* Ambient Background Orbs */}
               <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-yellow-500/10 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>
               <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-emerald-500/10 blur-[100px] rounded-full animate-pulse delay-700 pointer-events-none"></div>
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

               <div className="relative z-10 flex flex-col items-center">
                 {/* Visual Loading Centerpiece */}
                 <div className="relative mb-12">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border border-white/5 flex items-center justify-center relative">
                        {/* Rotating Rings */}
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-500/40 border-l-yellow-500/40 animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border border-transparent border-b-emerald-500/30 border-r-emerald-500/30 animate-[spin_3s_linear_infinite_reverse]"></div>
                        
                        <div className="text-3xl md:text-4xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">⚡</div>
                    </div>
                 </div>

                 <div className="text-center space-y-4 max-w-xs">
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500">
                            Connecting
                        </h2>
                        <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mt-1"></div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] leading-relaxed">
                        Initializing secure arena link to global servers
                    </p>
                 </div>
               </div>

               <button 
                  onClick={handleGoHome} 
                  className="relative z-10 group px-10 py-3 bg-white/5 hover:bg-red-950/20 border border-white/10 hover:border-red-500/30 rounded-full text-gray-400 hover:text-red-400 font-bold text-[10px] tracking-[0.2em] uppercase transition-all hover:scale-105 active:scale-95 flex items-center gap-3 backdrop-blur-sm"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                 </svg>
                 Cancel Connection
               </button>
            </div>
          );
        }
        return (
          <Lobby playerName={playerName} gameState={mpGameState} error={null} playerAvatar={playerAvatar} initialRoomCode={initialRoomCode} backgroundTheme={backgroundTheme} onBack={handleGoHome} />
        );
    }

    if (view === 'VICTORY') {
        const state = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
        return <VictoryScreen players={state?.players || []} myId={gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me'} onPlayAgain={handlePlayAgain} onGoHome={handleGoHome} />;
    }

    if (view === 'GAME_TABLE') {
        const state = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
        const hand = gameMode === 'MULTI_PLAYER' ? mpMyHand : spMyHand;
        const myId = gameMode === 'MULTI_PLAYER' ? (socket.id || '') : 'player-me';

        if (!state) {
            return (
              <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
                 <div className="w-10 h-10 border-2 border-white/20 border-t-yellow-500 rounded-full animate-spin"></div>
                 <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Game...</span>
                 <button onClick={handleGoHome} className="text-xs text-red-400 hover:text-red-300 underline">Cancel</button>
              </div>
            );
        }

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
            backgroundTheme={backgroundTheme} 
            onChangeBackgroundTheme={setBackgroundTheme}
            spQuickFinish={spQuickFinish}
            setSpQuickFinish={setSpQuickFinish}
            isSinglePlayer={gameMode === 'SINGLE_PLAYER'}
          />
        );
    }

    return <div>Loading...</div>;
  };

  return (
    <>
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm pointer-events-none">
            <div className="relative overflow-hidden bg-gradient-to-br from-red-500/85 via-red-800/85 to-red-950/90 backdrop-blur-md border border-red-400/30 text-white px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-4 transition-all">
                <div className="p-2 bg-red-500/20 rounded-full shrink-0 border border-red-400/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-xs tracking-wider uppercase text-red-200">System Notice</span>
                    <span className="font-semibold tracking-wide text-sm drop-shadow-sm leading-tight">{error}</span>
                </div>
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-red-400/30 blur-2xl rounded-full"></div>
            </div>
        </div>
      )}
      {renderContent()}
    </>
  );
};

export default App;