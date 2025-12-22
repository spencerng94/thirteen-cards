
import React, { useState, useEffect, useCallback } from 'react';
import { connectSocket, socket, disconnectSocket } from './services/socket';
import { GameState, GameStatus, SocketEvents, Card, Player, Rank, Suit, BackgroundTheme, AiDifficulty, PlayTurn, UserProfile } from './types';
import { GameTable } from './components/GameTable';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Lobby } from './components/Lobby';
import { VictoryScreen } from './components/VictoryScreen';
import { TutorialMode } from './components/TutorialMode';
import { GameEndTransition } from './components/GameEndTransition';
import { AuthScreen } from './components/AuthScreen';
import { UserHub, HubTab } from './components/UserHub';
import { dealCards, validateMove, findBestMove, getComboType } from './utils/gameLogic';
import { CardCoverStyle } from './components/Card';
import { audioService } from './services/audio';
import { supabase, recordGameResult, fetchProfile, fetchGuestProfile, transferGuestData, calculateLevel } from './services/supabase';

type ViewState = 'WELCOME' | 'LOBBY' | 'GAME_TABLE' | 'VICTORY' | 'TUTORIAL';
type GameMode = 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL' | null;

const BOT_AVATARS = ['🤖', '👾', '👽', '🤡', '👹', '👺', '👻'];

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [view, setView] = useState<ViewState>('WELCOME');
  const [hubState, setHubState] = useState<{ open: boolean, tab: HubTab }>({ open: false, tab: 'PROFILE' });
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('😎');
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [cardCoverStyle, setCardCoverStyle] = useState<CardCoverStyle>('RED');
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('EMERALD');
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
  const [lastMatchRewards, setLastMatchRewards] = useState<{ xp: number, coins: number, diff: AiDifficulty, bonus: boolean } | null>(null);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
      if (session?.user) {
        await transferGuestData(session.user.id);
        loadProfile(session.user.id);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await transferGuestData(session.user.id);
        loadProfile(session.user.id);
      }
      else if (!isGuest) setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, [isGuest]);

  const loadProfile = async (uid: string) => {
    const data = await fetchProfile(uid);
    if (data) {
      setProfile(data);
      if (data.username && !playerName) setPlayerName(data.username);
    }
  };

  useEffect(() => {
    if (isGuest && !session) {
      const data = fetchGuestProfile();
      setProfile(data);
      if (data.username && !playerName) setPlayerName(data.username);
    }
  }, [isGuest, session]);

  const handleSignOut = async () => {
    if (session) await supabase.auth.signOut();
    if (isGuest) {
      setIsGuest(false);
      setProfile(null);
    }
    setView('WELCOME');
    setHubState({ open: false, tab: 'PROFILE' });
    handleExit();
  };

  useEffect(() => { audioService.setEnabled(soundEnabled); }, [soundEnabled]);

  useEffect(() => {
    const state = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
    const myId = gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me';
    if (state?.currentPlayerId === myId && state?.status === GameStatus.PLAYING) audioService.playTurn();
  }, [mpGameState?.currentPlayerId, spGameState?.currentPlayerId, gameMode]);

  useEffect(() => {
    if (view === 'VICTORY') {
      audioService.playVictory();
      const finalState = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
      const myId = gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me';
      const me = finalState?.players.find(p => p.id === myId);
      if (me) {
        recordGameResult(
          me.finishedRank || 4, 
          gameMode === 'SINGLE_PLAYER', 
          aiDifficulty, 
          isGuest, 
          session?.user?.id
        ).then((rewards) => {
          if (rewards) {
            setLastMatchRewards({ 
                xp: rewards.xpGained, 
                coins: rewards.coinsGained, 
                diff: aiDifficulty,
                bonus: rewards.xpBonusApplied 
            });
            
            // Critical: Refresh profile state immediately so the bar is accurate
            if (isGuest) {
                const updated = fetchGuestProfile();
                setProfile(updated);
                if (updated.coins >= 1000 || calculateLevel(updated.xp) >= 2) {
                    setShowRegisterPrompt(true);
                }
            } else if (session?.user?.id) {
                loadProfile(session.user.id);
            }
          }
        });
      }
    }
  }, [view, gameMode, mpGameState, spGameState, isGuest, session, aiDifficulty]);

  const triggerMatchEndTransition = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => { setView('VICTORY'); setIsTransitioning(false); }, 2500);
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
    if (startIdx === -1) return currentId;
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
      
      let nextId = getNextActivePlayerId(players, pid, true);
      let finalPlayers = players;
      let finalPlayPile = prev.currentPlayPile;
      
      const isRoundOver = nextId === prev.lastPlayerToPlayId || nextId === pid;
      
      if (isRoundOver) {
        finalPlayPile = [];
        finalPlayers = players.map(p => ({ ...p, hasPassed: false }));
        const lastWinner = finalPlayers.find(p => p.id === prev.lastPlayerToPlayId);
        nextId = lastWinner && !lastWinner.finishedRank 
          ? lastWinner.id 
          : getNextActivePlayerId(finalPlayers, prev.lastPlayerToPlayId || pid, false);
      }
      
      return { ...prev, players: finalPlayers, currentPlayerId: nextId, currentPlayPile: finalPlayPile };
    });
  };

  const handleLocalPlay = (pid: string, cards: Card[]) => {
    if (!spGameState || spGameState.status !== GameStatus.PLAYING || spGameState.currentPlayerId !== pid) return;
    const res = validateMove(cards, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame);
    if (!res.isValid && pid === 'player-me') { setError(res.reason); setTimeout(() => setError(null), 3000); return; }
    
    setSpGameState(prev => {
      if (!prev) return null;
      const isBot = pid.startsWith('bot-');
      if (!isBot) setSpMyHand(h => h.filter(c => !cards.some(pc => pc.id === c.id)));
      else setSpOpponentHands(h => ({ ...h, [pid]: h[pid].filter(c => !cards.some(pc => pc.id === c.id)) }));
      
      const player = prev.players.find(p => p.id === pid)!;
      const newCardCount = Math.max(0, player.cardCount - cards.length);
      let newFinishedPlayersList = [...prev.finishedPlayers];
      let playerRank = player.finishedRank;
      
      if (newCardCount === 0 && !playerRank) { 
        newFinishedPlayersList.push(pid); 
        playerRank = newFinishedPlayersList.length; 
      }

      let updatedPlayers = prev.players.map(p => p.id === pid ? { ...p, cardCount: newCardCount, finishedRank: playerRank } : p);
      const remainingActive = updatedPlayers.filter(p => !p.finishedRank);

      if ((pid === 'player-me' && newCardCount === 0 && spQuickFinish) || remainingActive.length <= 1) {
        let finalPlayers = [...updatedPlayers];
        let finalFinishedList = [...newFinishedPlayersList];
        
        const losers = [...remainingActive].sort((a, b) => a.cardCount - b.cardCount);
        losers.forEach(l => {
          finalFinishedList.push(l.id);
          finalPlayers = finalPlayers.map(p => p.id === l.id ? { ...p, finishedRank: finalFinishedList.length } : p);
        });

        setTimeout(() => triggerMatchEndTransition(), remainingActive.length <= 1 ? 1000 : 500);
        return { ...prev, players: finalPlayers, finishedPlayers: finalFinishedList, status: GameStatus.FINISHED };
      }

      let nextPlayerId = getNextActivePlayerId(updatedPlayers, pid, true);
      let finalPlayersForState = updatedPlayers;
      let currentRoundPile = [...prev.currentPlayPile, { playerId: pid, cards, comboType: getComboType(cards) }];

      if (nextPlayerId === pid) {
        currentRoundPile = [];
        finalPlayersForState = updatedPlayers.map(p => ({ ...p, hasPassed: false }));
        if (newCardCount === 0) {
           nextPlayerId = getNextActivePlayerId(finalPlayersForState, pid, false);
        }
      }

      return { 
        ...prev, 
        players: finalPlayersForState, 
        currentPlayPile: currentRoundPile, 
        lastPlayerToPlayId: pid, 
        isFirstTurnOfGame: false, 
        currentPlayerId: nextPlayerId,
        finishedPlayers: newFinishedPlayersList
      };
    });
  };

  const initSinglePlayer = (name: string, avatar: string) => {
    const hands = dealCards();
    const players: Player[] = [
      { id: 'player-me', name, avatar, cardCount: 13, isHost: true, finishedRank: null },
      { id: 'bot-1', name: 'CPU 1', avatar: BOT_AVATARS[0], cardCount: 13, isHost: false, finishedRank: null, isBot: true, difficulty: aiDifficulty },
      { id: 'bot-2', name: 'CPU 2', avatar: BOT_AVATARS[1], cardCount: 13, isHost: false, finishedRank: null, isBot: true, difficulty: aiDifficulty },
      { id: 'bot-3', name: 'CPU 3', avatar: BOT_AVATARS[2], cardCount: 13, isHost: false, finishedRank: null, isBot: true, difficulty: aiDifficulty }
    ];

    let starterId = 'player-me';
    if (hands[1].some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) starterId = 'bot-1';
    else if (hands[2].some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) starterId = 'bot-2';
    else if (hands[3].some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) starterId = 'bot-3';

    setSpMyHand(hands[0]); setSpOpponentHands({ 'bot-1': hands[1], 'bot-2': hands[2], 'bot-3': hands[3] });
    setSpGameState({ roomId: 'LOCAL', status: GameStatus.PLAYING, players, currentPlayerId: starterId, currentPlayPile: [], finishedPlayers: [], isFirstTurnOfGame: true, lastPlayerToPlayId: null, winnerId: null });
    setLastMatchRewards(null);
    setGameMode('SINGLE_PLAYER'); setView('GAME_TABLE');
  };

  useEffect(() => {
    if (gameMode !== 'SINGLE_PLAYER' || !spGameState || spGameState.status !== GameStatus.PLAYING) return;
    const curId = spGameState.currentPlayerId;
    if (curId?.startsWith('bot-')) {
      const timer = setTimeout(() => {
        const move = findBestMove(spOpponentHands[curId], spGameState.currentPlayPile, spGameState.isFirstTurnOfGame, aiDifficulty);
        if (move) handleLocalPlay(curId, move); else handleLocalPass(curId);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [spGameState?.currentPlayerId, spGameState?.status, gameMode, spOpponentHands, aiDifficulty]);

  const handleStart = (n: string, m: GameMode | 'TUTORIAL', s: CardCoverStyle, a: string) => {
    setPlayerName(n); setPlayerAvatar(a); setCardCoverStyle(s);
    if (m === 'TUTORIAL') { setView('TUTORIAL'); return; }
    setGameMode(m as GameMode);
    if (m === 'SINGLE_PLAYER') initSinglePlayer(n, a); else { connectSocket(); setView('LOBBY'); }
  };

  const handleExit = () => { if (gameMode === 'MULTI_PLAYER') disconnectSocket(); setGameMode(null); setMpGameState(null); setSpGameState(null); setView('WELCOME'); };

  return (
    <div className="w-full h-full bg-[#031109]">
      {showRegisterPrompt && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
              <div className="max-w-md w-full bg-[#0a0f0d] border border-yellow-500/20 rounded-[3rem] p-10 text-center space-y-6 shadow-[0_0_100px_rgba(234,179,8,0.15)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none"></div>
                  <div className="relative text-6xl">🛡️</div>
                  <div className="space-y-2 relative">
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Secure Your Legacy</h2>
                      <p className="text-gray-400 text-xs leading-relaxed uppercase tracking-wider font-medium">
                        You have reached <span className="text-yellow-500">Elite Status</span>. 
                        Create an account now to protect your <span className="text-white">XP</span>, 
                        <span className="text-white">Wins</span>, and <span className="text-white">Gold</span> permanently.
                      </p>
                  </div>
                  <div className="flex flex-col gap-3 relative">
                      <button 
                        onClick={() => { setShowRegisterPrompt(false); handleSignOut(); }}
                        className="w-full py-4 bg-yellow-500 text-black font-black rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-yellow-400 transition-all active:scale-95 shadow-lg"
                      >
                        Create Account
                      </button>
                      <button 
                        onClick={() => setShowRegisterPrompt(false)}
                        className="w-full py-3 bg-white/5 text-white/40 font-black rounded-xl uppercase tracking-widest text-[10px] hover:text-white/60 transition-all"
                      >
                        I'll risk it (Remind later)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {hubState.open && (
        <UserHub initialTab={hubState.tab} onClose={() => setHubState(p => ({ ...p, open: false }))} profile={profile} isGuest={isGuest} onRefreshProfile={() => { if(session?.user?.id) loadProfile(session.user.id); else if(isGuest) setProfile(fetchGuestProfile()); }} currentSleeve={cardCoverStyle} onEquipSleeve={setCardCoverStyle} playerName={playerName} setPlayerName={setPlayerName} playerAvatar={playerAvatar} setPlayerAvatar={setPlayerAvatar} currentTheme={backgroundTheme} onChangeTheme={setBackgroundTheme} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} isSinglePlayer={gameMode === 'SINGLE_PLAYER'} spQuickFinish={spQuickFinish} setSpQuickFinish={setSpQuickFinish} currentDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty} onExitGame={view === 'GAME_TABLE' ? handleExit : undefined} onSignOut={handleSignOut} />
      )}
      {!session && !isGuest && authChecked ? <AuthScreen onPlayAsGuest={() => setIsGuest(true)} /> : (
        <div className="relative w-full h-full">
          {view === 'WELCOME' && (
            <WelcomeScreen onStart={handleStart} onSignOut={handleSignOut} profile={profile} onRefreshProfile={() => { if(session?.user?.id) loadProfile(session.user.id); else if(isGuest) setProfile(fetchGuestProfile()); }} playerName={playerName} setPlayerName={setPlayerName} playerAvatar={playerAvatar} setPlayerAvatar={setPlayerAvatar} cardCoverStyle={cardCoverStyle} setCardCoverStyle={setCardCoverStyle} aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty} quickFinish={spQuickFinish} setQuickFinish={setSpQuickFinish} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} backgroundTheme={backgroundTheme} setBackgroundTheme={setBackgroundTheme} isGuest={isGuest} />
          )}
          {view === 'LOBBY' && (
            <Lobby playerName={playerName} gameState={mpGameState} error={error} playerAvatar={playerAvatar} backgroundTheme={backgroundTheme} onBack={handleExit} onSignOut={handleSignOut} />
          )}
          {view === 'GAME_TABLE' && (
            <div className="relative w-full h-full">
              {gameMode === 'MULTI_PLAYER' ? (
                <GameTable gameState={mpGameState!} myId={socket.id} myHand={mpMyHand} onPlayCards={c => socket.emit(SocketEvents.PLAY_CARDS, { roomId: mpGameState!.roomId, cards: c })} onPassTurn={() => socket.emit(SocketEvents.PASS_TURN, { roomId: mpGameState!.roomId })} cardCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} onExitGame={handleExit} onSignOut={handleSignOut} backgroundTheme={backgroundTheme} onChangeBackgroundTheme={setBackgroundTheme} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />
              ) : (
                <GameTable gameState={spGameState!} myId="player-me" myHand={spMyHand} onPlayCards={c => handleLocalPlay('player-me', c)} onPassTurn={() => handleLocalPass('player-me')} cardCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} onExitGame={handleExit} onSignOut={handleSignOut} backgroundTheme={backgroundTheme} onChangeBackgroundTheme={setBackgroundTheme} isSinglePlayer spQuickFinish={spQuickFinish} setSpQuickFinish={setSpQuickFinish} aiDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />
              )}
              {isTransitioning && <GameEndTransition />}
            </div>
          )}
          {view === 'VICTORY' && (
            <VictoryScreen 
                profile={profile} 
                xpGained={lastMatchRewards?.xp || 0} 
                coinsGained={lastMatchRewards?.coins || 0} 
                xpBonusApplied={lastMatchRewards?.bonus}
                players={(gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState)!.players} 
                myId={gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me'} 
                onPlayAgain={() => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.START_GAME, { roomId: mpGameState!.roomId }) : initSinglePlayer(playerName, playerAvatar)} 
                onGoHome={handleExit} 
            />
          )}
          {view === 'TUTORIAL' && <TutorialMode onExit={handleExit} />}
        </div>
      )}
      {error && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-black uppercase tracking-widest text-xs animate-bounce">{error}</div>}
    </div>
  );
};

export default App;
