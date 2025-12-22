
import React, { useState, useEffect, useCallback } from 'react';
import { connectSocket, socket, disconnectSocket } from './services/socket';
import { GameState, GameStatus, SocketEvents, Card, Player, Rank, Suit, BackgroundTheme, AiDifficulty, PlayTurn } from './types';
import { GameTable } from './components/GameTable';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Lobby } from './components/Lobby';
import { VictoryScreen } from './components/VictoryScreen';
import { ConnectingScreen } from './components/ConnectingScreen';
import { TutorialMode } from './components/TutorialMode';
import { GameEndTransition } from './components/GameEndTransition';
import { AuthScreen } from './components/AuthScreen';
import { dealCards, validateMove, findBestMove, getComboType } from './utils/gameLogic';
import { CardCoverStyle } from './components/Card';
import { audioService } from './services/audio';
import { supabase, recordGameResult } from './services/supabase';

type ViewState = 'WELCOME' | 'LOBBY' | 'GAME_TABLE' | 'VICTORY' | 'TUTORIAL';
type GameMode = 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL' | null;

const BOT_AVATARS = ['🤖', '👾', '👽', '🤡', '👹', '👺', '👻'];

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [view, setView] = useState<ViewState>('WELCOME');
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('😎');
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [cardCoverStyle, setCardCoverStyle] = useState<CardCoverStyle>('RED');
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('GREEN');
  const [initialRoomCode, setInitialRoomCode] = useState<string | null>(null);
  const [spQuickFinish, setSpQuickFinish] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('MEDIUM');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [connected, setConnected] = useState(false);
  const [mpGameState, setMpGameState] = useState<GameState | null>(null);
  const [mpMyHand, setMpMyHand] = useState<Card[]>([]);
  
  const [spGameState, setSpGameState] = useState<GameState | null>(null);
  const [spMyHand, setSpMyHand] = useState<Card[]>([]);
  const [spOpponentHands, setSpOpponentHands] = useState<Record<string, Card[]>>({});
  
  const [error, setError] = useState<string | null>(null);

  // --- Auth Management ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (session) {
      await supabase.auth.signOut();
    }
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem('thirteen_stats');
      localStorage.removeItem('guest_id');
      localStorage.removeItem('guest_data');
    }
    // Reset view to Welcome for clean state
    setView('WELCOME');
    handleExit(); // Ensure socket is disconnected if in multiplayer
  };

  useEffect(() => {
    audioService.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const state = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
    const myId = gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me';
    if (state?.currentPlayerId === myId && state?.status === GameStatus.PLAYING) {
      audioService.playTurn();
    }
  }, [mpGameState?.currentPlayerId, spGameState?.currentPlayerId, gameMode]);

  useEffect(() => {
    if (view === 'VICTORY') {
      audioService.playVictory();
      
      // Persist results
      const finalState = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
      const myId = gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me';
      const me = finalState?.players.find(p => p.id === myId);
      if (me) {
        recordGameResult(me.finishedRank === 1, isGuest, session?.user?.id);
      }
    }
  }, [view, gameMode, mpGameState, spGameState, isGuest, session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room.length === 4) setInitialRoomCode(room.toUpperCase());
  }, []);

  const triggerMatchEndTransition = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setView('VICTORY');
      setIsTransitioning(false);
    }, 2500);
  }, []);

  useEffect(() => {
    const onGameState = (state: GameState) => {
      setMpGameState(state);
      if (state.status === GameStatus.PLAYING) setView('GAME_TABLE');
      else if (state.status === GameStatus.FINISHED && view === 'GAME_TABLE') triggerMatchEndTransition();
      else if (state.status === GameStatus.FINISHED && view !== 'GAME_TABLE') setView('VICTORY');
      else if (state.status === GameStatus.LOBBY) setView('LOBBY');
    };
    const onPlayerHand = (cards: Card[]) => setMpMyHand(cards);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on(SocketEvents.GAME_STATE, onGameState);
    socket.on(SocketEvents.PLAYER_HAND, onPlayerHand);
    socket.on(SocketEvents.ERROR, (m) => { setError(m); setTimeout(() => setError(null), 3000); });
    return () => {
      socket.off('connect'); socket.off('disconnect');
      socket.off(SocketEvents.GAME_STATE); socket.off(SocketEvents.PLAYER_HAND);
      socket.off(SocketEvents.ERROR);
    };
  }, [view, triggerMatchEndTransition]);

  const getNextActivePlayerId = useCallback((players: Player[], currentId: string, skipPassed: boolean = true) => {
    const startIdx = players.findIndex(p => p.id === currentId);
    for (let i = 1; i <= players.length; i++) {
      const idx = (startIdx + i) % players.length;
      const p = players[idx];
      if (p.finishedRank) continue;
      if (skipPassed && p.hasPassed) continue;
      return p.id;
    }
    return currentId;
  }, []);

  const handleLocalPass = (pid: string) => {
    if (!spGameState || spGameState.status !== GameStatus.PLAYING || spGameState.currentPlayerId !== pid) return;
    setSpGameState(prev => {
      if (!prev) return null;
      const players = prev.players.map(p => p.id === pid ? { ...p, hasPassed: true } : p);
      const nextId = getNextActivePlayerId(players, pid, true);
      let finalPlayers = players;
      let finalPlayPile = prev.currentPlayPile;
      let finalNextId = nextId;
      let finalHistory = prev.roundHistory || [];
      const isRoundOver = nextId === prev.lastPlayerToPlayId || (prev.currentPlayPile.length === 0);
      if (isRoundOver && nextId !== pid) {
        if (prev.currentPlayPile.length > 0) finalHistory = [...finalHistory, [...prev.currentPlayPile]];
        finalPlayPile = [];
        finalPlayers = players.map(p => ({ ...p, hasPassed: false }));
        const lastWinner = finalPlayers.find(p => p.id === prev.lastPlayerToPlayId);
        finalNextId = lastWinner?.finishedRank ? getNextActivePlayerId(finalPlayers, prev.lastPlayerToPlayId!, false) : (prev.lastPlayerToPlayId || getNextActivePlayerId(finalPlayers, pid, false));
      } else if (nextId === pid) {
        if (prev.currentPlayPile.length > 0) finalHistory = [...finalHistory, [...prev.currentPlayPile]];
        finalPlayPile = [];
        finalPlayers = players.map(p => ({ ...p, hasPassed: false }));
        finalNextId = getNextActivePlayerId(finalPlayers, pid, false);
      }
      return { ...prev, players: finalPlayers, currentPlayerId: finalNextId, currentPlayPile: finalPlayPile, roundHistory: finalHistory };
    });
  };

  const handleLocalPlay = (pid: string, cards: Card[]) => {
    if (!spGameState || spGameState.status !== GameStatus.PLAYING || spGameState.currentPlayerId !== pid) return;
    const res = validateMove(cards, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame);
    if (!res.isValid && pid === 'player-me') {
       setError(res.reason); setTimeout(() => setError(null), 3000); return;
    }
    setSpGameState(prev => {
      if (!prev) return null;
      const isBot = pid.startsWith('bot-');
      if (!isBot) setSpMyHand(h => h.filter(c => !cards.some(pc => pc.id === c.id)));
      else setSpOpponentHands(prevHands => ({ ...prevHands, [pid]: prevHands[pid].filter(c => !cards.some(pc => pc.id === c.id)) }));
      
      const player = prev.players.find(p => p.id === pid)!;
      const newCardCount = Math.max(0, player.cardCount - cards.length);
      let newFinishedPlayers = prev.finishedPlayers;
      let finishedRank = player.finishedRank;
      
      if (newCardCount === 0 && !finishedRank) {
        newFinishedPlayers = [...prev.finishedPlayers, pid]; 
        finishedRank = newFinishedPlayers.length;
      }

      const isHumanWin = pid === 'player-me' && newCardCount === 0;
      const shouldTriggerQuickFinish = isHumanWin && spQuickFinish;

      const updatedPlayers = prev.players.map(p => p.id === pid ? { ...p, cardCount: newCardCount, finishedRank } : p);
      const remainingActive = updatedPlayers.filter(p => !p.finishedRank);
      const standardGameIsEnding = remainingActive.length <= 1;
      
      const gameIsEnding = shouldTriggerQuickFinish || standardGameIsEnding;

      let finalHistory = prev.roundHistory || [];
      const newTurn: PlayTurn = { playerId: pid, cards, comboType: getComboType(cards) };
      const newPlayPile = [...prev.currentPlayPile, newTurn];

      if (gameIsEnding) {
        finalHistory = [...finalHistory, newPlayPile];
        
        let finalFinishedPlayersList = newFinishedPlayers;
        let finalPlayersState = updatedPlayers;

        if (shouldTriggerQuickFinish) {
            const botsToRank = updatedPlayers
                .filter(p => !p.finishedRank)
                .sort((a, b) => a.cardCount - b.cardCount);
            
            botsToRank.forEach((bot, idx) => {
                const rank = finalFinishedPlayersList.length + 1;
                finalFinishedPlayersList = [...finalFinishedPlayersList, bot.id];
                finalPlayersState = finalPlayersState.map(p => p.id === bot.id ? { ...p, finishedRank: rank } : p);
            });
        } else {
            const lastPlayer = updatedPlayers.find(p => !p.finishedRank);
            if (lastPlayer) {
                finalFinishedPlayersList = [...newFinishedPlayers, lastPlayer.id];
                finalPlayersState = updatedPlayers.map(p => p.id === lastPlayer.id ? { ...p, finishedRank: updatedPlayers.length } : p);
            }
        }

        setTimeout(() => triggerMatchEndTransition(), shouldTriggerQuickFinish ? 500 : 1000);
        return { 
          ...prev, 
          players: finalPlayersState, 
          status: GameStatus.FINISHED, 
          finishedPlayers: finalFinishedPlayersList, 
          roundHistory: finalHistory, 
          currentPlayPile: [] 
        };
      }

      let nextPlayerId = getNextActivePlayerId(updatedPlayers, pid, true);
      let finalPlayers = updatedPlayers;
      let currentRoundPile = newPlayPile;
      
      if (nextPlayerId === pid) {
        finalHistory = [...finalHistory, newPlayPile]; 
        currentRoundPile = [];
        finalPlayers = updatedPlayers.map(p => ({ ...p, hasPassed: false }));
        if (finishedRank) nextPlayerId = getNextActivePlayerId(finalPlayers, pid, false);
      }
      
      return { 
        ...prev, 
        players: finalPlayers, 
        currentPlayPile: currentRoundPile, 
        currentPlayerId: nextPlayerId, 
        lastPlayerToPlayId: pid, 
        isFirstTurnOfGame: false, 
        finishedPlayers: newFinishedPlayers, 
        roundHistory: finalHistory 
      };
    });
  };

  const initSinglePlayer = (name: string, avatar: string) => {
    const hands = dealCards();
    let startingIdx = 0;
    for (let i = 0; i < 4; i++) { if (hands[i].some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) { startingIdx = i; break; } }
    const myId = 'player-me';
    const players: Player[] = [
      { id: myId, name, avatar, cardCount: 13, isHost: true, hasPassed: false, finishedRank: null },
      { id: 'bot-1', name: 'CPU 1', avatar: BOT_AVATARS[0], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null, isBot: true, difficulty: aiDifficulty },
      { id: 'bot-2', name: 'CPU 2', avatar: BOT_AVATARS[1], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null, isBot: true, difficulty: aiDifficulty },
      { id: 'bot-3', name: 'CPU 3', avatar: BOT_AVATARS[2], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null, isBot: true, difficulty: aiDifficulty }
    ];
    setSpMyHand(hands[0]); setSpOpponentHands({ 'bot-1': hands[1], 'bot-2': hands[2], 'bot-3': hands[3] });
    setSpGameState({ roomId: 'LOCAL', status: GameStatus.PLAYING, players, currentPlayerId: players[startingIdx].id, currentPlayPile: [], roundHistory: [], lastPlayerToPlayId: null, winnerId: null, finishedPlayers: [], isFirstTurnOfGame: true });
    setGameMode('SINGLE_PLAYER'); setView('GAME_TABLE');
  };

  useEffect(() => {
    if (gameMode !== 'SINGLE_PLAYER' || !spGameState || spGameState.status !== GameStatus.PLAYING) return;
    const curId = spGameState.currentPlayerId;
    if (!curId) return;
    const curPlayer = spGameState.players.find(p => p.id === curId);
    if (curId.startsWith('bot-') && !curPlayer?.finishedRank) {
      const timer = setTimeout(() => {
        if (spGameState.currentPlayerId !== curId) return;
        if (aiDifficulty === 'EASY' && spGameState.currentPlayPile.length > 0 && Math.random() < 0.35) {
          handleLocalPass(curId); return;
        }
        const move = findBestMove(spOpponentHands[curId], spGameState.currentPlayPile, spGameState.isFirstTurnOfGame, aiDifficulty);
        if (move) handleLocalPlay(curId, move); else handleLocalPass(curId);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [spGameState?.currentPlayerId, spGameState?.status, gameMode, aiDifficulty, spOpponentHands]);

  const handleStart = (name: string, mode: GameMode | 'TUTORIAL', style: CardCoverStyle, avatar: string, quick?: boolean, diff?: AiDifficulty) => {
    setPlayerName(name); setPlayerAvatar(avatar); setCardCoverStyle(style);
    if (quick !== undefined) setSpQuickFinish(quick);
    if (diff !== undefined) setAiDifficulty(diff);
    if (mode === 'TUTORIAL') { setGameMode('TUTORIAL'); setView('TUTORIAL'); return; }
    setGameMode(mode as GameMode);
    if (mode === 'SINGLE_PLAYER') initSinglePlayer(name, avatar); else { connectSocket(); setView('LOBBY'); }
  };

  const handleExit = () => { if (gameMode === 'MULTI_PLAYER') disconnectSocket(); setGameMode(null); setMpGameState(null); setSpGameState(null); setView('WELCOME'); };

  const renderContent = () => {
    // If not authenticated and not playing as guest, show AuthScreen
    if (!session && !isGuest && authChecked) {
      return <AuthScreen onPlayAsGuest={() => setIsGuest(true)} />;
    }

    switch (view) {
      case 'WELCOME': return <WelcomeScreen onStart={handleStart} onSignOut={handleSignOut} />;
      case 'TUTORIAL': return <TutorialMode onExit={handleExit} />;
      case 'LOBBY': return <Lobby playerName={playerName} gameState={mpGameState} error={error} playerAvatar={playerAvatar} initialRoomCode={initialRoomCode} backgroundTheme={backgroundTheme} onBack={handleExit} onSignOut={handleSignOut} />;
      case 'GAME_TABLE':
        return (
          <div className="relative w-full h-full">
            {gameMode === 'MULTI_PLAYER' ? (
              <GameTable gameState={mpGameState!} myId={socket.id} myHand={mpMyHand} onPlayCards={(cards) => socket.emit(SocketEvents.PLAY_CARDS, { roomId: mpGameState!.roomId, cards })} onPassTurn={() => socket.emit(SocketEvents.PASS_TURN, { roomId: mpGameState!.roomId })} cardCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} onExitGame={handleExit} onSignOut={handleSignOut} backgroundTheme={backgroundTheme} onChangeBackgroundTheme={setBackgroundTheme} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />
            ) : (
              <GameTable gameState={spGameState!} myId="player-me" myHand={spMyHand} onPlayCards={(cards) => handleLocalPlay('player-me', cards)} onPassTurn={() => handleLocalPass('player-me')} cardCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} onExitGame={handleExit} onSignOut={handleSignOut} backgroundTheme={backgroundTheme} onChangeBackgroundTheme={setBackgroundTheme} isSinglePlayer spQuickFinish={spQuickFinish} setSpQuickFinish={setSpQuickFinish} aiDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />
            )}
            {isTransitioning && <GameEndTransition />}
          </div>
        );
      case 'VICTORY':
        const finalState = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
        if (!finalState) return null;
        return <VictoryScreen players={finalState.players} myId={gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me'} onPlayAgain={() => { if (gameMode === 'MULTI_PLAYER') socket.emit(SocketEvents.START_GAME, { roomId: finalState.roomId }); else initSinglePlayer(playerName, playerAvatar); }} onGoHome={handleExit} />;
      default: return null;
    }
  };

  return <div className="w-full h-full">{renderContent()}{error && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-black uppercase tracking-widest text-xs animate-bounce">{error}</div>}</div>;
};

export default App;
