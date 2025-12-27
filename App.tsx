
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { connectSocket, socket, disconnectSocket } from './services/socket';
import { GameState, GameStatus, SocketEvents, Card, Rank, Suit, BackgroundTheme, AiDifficulty, PlayTurn, UserProfile, Player } from './types';
import { GameTable } from './components/GameTable';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Lobby } from './components/Lobby';
import { VictoryScreen } from './components/VictoryScreen';
import { TutorialMode } from './components/TutorialMode';
import { GameEndTransition } from './components/GameEndTransition';
import { AuthScreen } from './components/AuthScreen';
import { UserHub, HubTab } from './components/UserHub';
import { GameSettings } from './components/GameSettings';
import { Store } from './components/Store';
import { dealCards, validateMove, findBestMove, getComboType } from './utils/gameLogic';
import { CardCoverStyle } from './components/Card';
import { audioService } from './services/audio';
import { supabase, recordGameResult, fetchProfile, fetchGuestProfile, transferGuestData, calculateLevel, AVATAR_NAMES, updateProfileAvatar, updateProfileEquipped, updateActiveBoard, updateProfileSettings } from './services/supabase';
import { v4 as uuidv4 } from 'uuid';

type ViewState = 'WELCOME' | 'LOBBY' | 'GAME_TABLE' | 'VICTORY' | 'TUTORIAL';
type GameMode = 'SINGLE_PLAYER' | 'MULTI_PLAYER' | null;

const SESSION_KEY = 'thirteen_active_session';
const PERSISTENT_ID_KEY = 'thirteen_persistent_uuid';
const BOT_AVATARS = [':robot:', ':annoyed:', ':devil:', ':smile:', ':money_mouth_face:', ':girly:', ':cool:'];

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [view, setView] = useState<ViewState>('WELCOME');
  const [hubState, setHubState] = useState<{ open: boolean, tab: HubTab }>({ open: false, tab: 'PROFILE' });
  const [gameSettingsOpen, setGameSettingsOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<'SLEEVES' | 'AVATARS' | 'BOARDS'>('SLEEVES');
  
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('😎');
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [cardCoverStyle, setCardCoverStyle] = useState<CardCoverStyle>('RED');
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('EMERALD');
  const [spQuickFinish, setSpQuickFinish] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('MEDIUM');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [mpGameState, setMpGameState] = useState<GameState | null>(null);
  const [mpMyHand, setMpMyHand] = useState<Card[]>([]);
  
  const [spGameState, setSpGameState] = useState<GameState | null>(null);
  const [spMyHand, setSpMyHand] = useState<Card[]>([]);
  const [spOpponentHands, setSpOpponentHands] = useState<Record<string, Card[]>>({});
  const [spChops, setSpChops] = useState(0);
  
  const [error, setError] = useState<string | null>(null);
  const [lastMatchRewards, setLastMatchRewards] = useState<{ xp: number, coins: number, diff: AiDifficulty, bonus: boolean } | null>(null);

  const isLoggingOutRef = useRef(false);
  const initialSyncCompleteRef = useRef(false);
  const loadingProfileInProgressRef = useRef(false);

  const myPersistentId = useMemo(() => {
    let id = localStorage.getItem(PERSISTENT_ID_KEY);
    if (!id) {
      try {
        id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uuidv4();
      } catch (e) {
        id = 'p-' + Math.random().toString(36).substr(2, 9) + Date.now();
      }
      localStorage.setItem(PERSISTENT_ID_KEY, id);
    }
    return id;
  }, []);

  const urlRoomCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && gameMode === 'MULTI_PLAYER') {
        if (!socket.connected) {
           connectSocket();
           const saved = localStorage.getItem(SESSION_KEY);
           if (saved) {
              const { roomId, playerId: savedId } = JSON.parse(saved);
              socket.emit(SocketEvents.RECONNECT, { roomId, playerId: savedId || myPersistentId });
           }
        } else {
           socket.emit(SocketEvents.REQUEST_SYNC, { playerId: myPersistentId });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [gameMode, myPersistentId]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
      if (session?.user) {
        setIsGuest(false);
        const meta = session.user.user_metadata || {};
        const googleName = meta.full_name || meta.name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
        if (!playerName) setPlayerName(googleName.toUpperCase());
        await transferGuestData(session.user.id);
        loadProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        setIsGuest(false);
        const meta = session.user.user_metadata || {};
        const googleName = meta.full_name || meta.name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
        if (!playerName) setPlayerName(googleName.toUpperCase());
        await transferGuestData(session.user.id);
        loadProfile(session.user.id);
      } else if (!isGuest) {
        setProfile(null);
        initialSyncCompleteRef.current = false;
      }
    });
    return () => subscription.unsubscribe();
  }, [isGuest]);

  const loadProfile = async (uid: string) => {
    loadingProfileInProgressRef.current = true;
    initialSyncCompleteRef.current = false;
    const data = await fetchProfile(uid, playerAvatar);
    if (data) {
      if (data.username && (!playerName || playerName.includes('AGENT'))) setPlayerName(data.username);
      if (data.avatar_url) setPlayerAvatar(data.avatar_url);
      if (data.active_sleeve || data.equipped_sleeve) setCardCoverStyle((data.active_sleeve || data.equipped_sleeve) as CardCoverStyle);
      if (data.active_board || data.equipped_board) setBackgroundTheme((data.active_board || data.equipped_board) as BackgroundTheme);
      if (data.sfx_enabled !== undefined) setSoundEnabled(data.sfx_enabled);
      if (data.turbo_enabled !== undefined) setSpQuickFinish(data.turbo_enabled);
      setProfile(data);
    }
    setTimeout(() => { 
      initialSyncCompleteRef.current = true;
      loadingProfileInProgressRef.current = false; 
    }, 800);
  };

  useEffect(() => {
    if (isGuest && !session) {
      const data = fetchGuestProfile();
      setProfile(data);
      if (data.username && !playerName) setPlayerName(data.username);
      if (data.avatar_url) setPlayerAvatar(data.avatar_url);
      if (data.active_sleeve) setCardCoverStyle(data.active_sleeve as CardCoverStyle);
      if (data.active_board) setBackgroundTheme(data.active_board as BackgroundTheme);
      if (data.sfx_enabled !== undefined) setSoundEnabled(data.sfx_enabled);
      if (data.turbo_enabled !== undefined) setSpQuickFinish(data.turbo_enabled);
      initialSyncCompleteRef.current = true;
    }
  }, [isGuest, session]);

  useEffect(() => {
    const userId = session?.user?.id || (isGuest ? 'guest' : null);
    if (!authChecked || !userId || !profile || !initialSyncCompleteRef.current || isLoggingOutRef.current) return;
    const updates: Partial<UserProfile> = {};
    if (playerAvatar !== profile.avatar_url) updateProfileAvatar(userId, playerAvatar);
    if (cardCoverStyle !== profile.active_sleeve) { updates.active_sleeve = cardCoverStyle; updates.equipped_sleeve = cardCoverStyle; }
    if (backgroundTheme !== profile.active_board) { updates.active_board = backgroundTheme; updates.equipped_board = backgroundTheme; }
    if (soundEnabled !== profile.sfx_enabled) updates.sfx_enabled = soundEnabled;
    if (spQuickFinish !== profile.turbo_enabled) updates.turbo_enabled = spQuickFinish;
    if (Object.keys(updates).length > 0) {
      updateProfileSettings(userId, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [playerAvatar, cardCoverStyle, backgroundTheme, soundEnabled, spQuickFinish, session, authChecked, profile, isGuest]);

  const handleSignOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    isLoggingOutRef.current = true;
    initialSyncCompleteRef.current = false;
    if (session) await supabase.auth.signOut();
    setIsGuest(false); setProfile(null); setPlayerName(''); setPlayerAvatar('😎'); setCardCoverStyle('RED'); setBackgroundTheme('EMERALD'); setSoundEnabled(true); setSpQuickFinish(true); setView('WELCOME'); setHubState({ open: false, tab: 'PROFILE' }); setGameSettingsOpen(false); setStoreOpen(false); handleExit();
    setTimeout(() => { isLoggingOutRef.current = false; }, 500);
  };

  const handleOpenStore = (tab?: 'SLEEVES' | 'AVATARS' | 'BOARDS') => { if (tab) setStoreTab(tab); setStoreOpen(true); };

  useEffect(() => { audioService.setEnabled(soundEnabled); }, [soundEnabled]);

  const triggerMatchEndTransition = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => { setView('VICTORY'); setIsTransitioning(false); }, 2500);
  }, []);

  useEffect(() => {
    const onGameState = (state: GameState) => {
      setMpGameState(state);
      if (state.roomId !== 'LOCAL') {
         localStorage.setItem(SESSION_KEY, JSON.stringify({ 
           roomId: state.roomId, 
           playerId: myPersistentId, 
           timestamp: Date.now() 
         }));
      }
      if (state.status === GameStatus.PLAYING) setView('GAME_TABLE');
      else if (state.status === GameStatus.FINISHED && view === 'GAME_TABLE') triggerMatchEndTransition();
      else if (state.status === GameStatus.FINISHED && view !== 'GAME_TABLE') setView('VICTORY');
      else if (state.status === GameStatus.LOBBY) setView('LOBBY');
    };
    const onPlayerHand = (cards: Card[]) => setMpMyHand(cards);
    socket.on(SocketEvents.GAME_STATE, onGameState);
    socket.on(SocketEvents.PLAYER_HAND, onPlayerHand);
    socket.on(SocketEvents.ERROR, (m) => { 
        if (m === 'Session Expired') localStorage.removeItem(SESSION_KEY);
        setError(m); setTimeout(() => setError(null), 3000); 
    });
    return () => {
      socket.off(SocketEvents.GAME_STATE); socket.off(SocketEvents.PLAYER_HAND);
      socket.off(SocketEvents.ERROR);
    };
  }, [view, triggerMatchEndTransition, myPersistentId]);

  const handleLocalPass = (pid: string) => {
    setSpGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING || prev.currentPlayerId !== pid) return prev;
      if (prev.currentPlayPile.length === 0) return prev;

      const players = prev.players.map(p => p.id === pid ? { ...p, hasPassed: true } : p);
      
      let nextIndex = (prev.players.findIndex(p => p.id === pid) + 1) % prev.players.length;
      let loopCount = 0;
      while ((players[nextIndex].hasPassed || players[nextIndex].finishedRank) && loopCount < players.length) { 
        nextIndex = (nextIndex + 1) % prev.players.length; 
        loopCount++;
      }
      
      let finalPlayPile = prev.currentPlayPile;
      let nextPlayerId = players[nextIndex].id;
      
      if (nextPlayerId === prev.lastPlayerToPlayId) {
        finalPlayPile = []; 
        players.forEach(p => p.hasPassed = false);
        
        if (players[nextIndex].finishedRank) { 
          let leadIndex = nextIndex;
          let innerLoop = 0;
          while (players[leadIndex].finishedRank && innerLoop < players.length) { 
            leadIndex = (leadIndex + 1) % prev.players.length; 
            innerLoop++;
          } 
          nextPlayerId = players[leadIndex].id; 
        }
      }
      return { ...prev, players, currentPlayerId: nextPlayerId, currentPlayPile: finalPlayPile };
    });
    audioService.playPass();
  };

  const handleLocalPlay = (pid: string, cards: Card[]) => {
    let playError: string | null = null;
    setSpGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING || prev.currentPlayerId !== pid) return prev;
      
      const res = validateMove(cards, prev.currentPlayPile, !!prev.isFirstTurnOfGame, pid === 'me' ? spMyHand : spOpponentHands[pid]);
      if (!res.isValid) { playError = res.reason; return prev; }

      let currentChops = spChops;
      const lastTurn = prev.currentPlayPile[prev.currentPlayPile.length - 1];
      if (lastTurn && (getComboType(cards) === 'QUAD' || getComboType(cards) === '3_PAIRS' || getComboType(cards) === '4_PAIRS') && lastTurn.cards[0].rank === Rank.Two) {
        currentChops++; setSpChops(currentChops);
      }

      const players = prev.players.map(p => {
          if (p.id === pid) {
              const newCount = p.cardCount - cards.length;
              return { ...p, cardCount: newCount };
          }
          return p;
      });

      if (pid === 'me') setSpMyHand(prevHand => prevHand.filter(c => !cards.some(rc => rc.id === c.id)));
      else setSpOpponentHands(prevHands => ({ ...prevHands, [pid]: prevHands[pid].filter(c => !cards.some(rc => rc.id === c.id)) }));

      const activeMover = players.find(p => p.id === pid)!;
      let finalStatus = prev.status;
      let finishedPlayers = [...prev.finishedPlayers];

      if (activeMover.cardCount === 0) {
          finishedPlayers.push(pid);
          activeMover.finishedRank = finishedPlayers.length;
          const stillPlaying = players.filter(p => !p.finishedRank);
          if (stillPlaying.length <= 1) {
              if (stillPlaying.length === 1) {
                  stillPlaying[0].finishedRank = finishedPlayers.length + 1;
                  finishedPlayers.push(stillPlaying[0].id);
              }
              finalStatus = GameStatus.FINISHED;
          }
      }

      if (finalStatus === GameStatus.FINISHED) {
          setTimeout(async () => {
             const result = await recordGameResult(activeMover.finishedRank || 1, true, aiDifficulty, isGuest, session?.user?.id, currentChops, spMyHand.length);
             setLastMatchRewards({ xp: result.xpGained, coins: result.coinsGained, diff: aiDifficulty, bonus: result.xpBonusApplied });
             triggerMatchEndTransition();
          }, 1000);
          return { ...prev, players, status: finalStatus, finishedPlayers, currentPlayPile: [], lastPlayerToPlayId: pid };
      }

      const newPlayPile = [...prev.currentPlayPile, { playerId: pid, cards, comboType: getComboType(cards) }];
      
      let nextIndex = (prev.players.findIndex(p => p.id === pid) + 1) % prev.players.length;
      let loopCount = 0;
      while ((players[nextIndex].hasPassed || players[nextIndex].finishedRank) && loopCount < players.length) {
          nextIndex = (nextIndex + 1) % prev.players.length;
          loopCount++;
      }

      let finalPlayerId = players[nextIndex].id;
      let finalPile = newPlayPile;

      if (finalPlayerId === pid) {
          finalPile = [];
          players.forEach(p => p.hasPassed = false);
          if (activeMover.finishedRank) {
              let leadIdx = nextIndex;
              let innerLoop = 0;
              while (players[leadIdx].finishedRank && innerLoop < players.length) {
                  leadIdx = (leadIdx + 1) % prev.players.length;
                  innerLoop++;
              }
              finalPlayerId = players[leadIdx].id;
          }
      }

      return { ...prev, players, status: finalStatus, finishedPlayers, currentPlayerId: finalPlayerId, currentPlayPile: finalPile, lastPlayerToPlayId: pid, isFirstTurnOfGame: false };
    });

    if (playError) { setError(playError); setTimeout(() => setError(null), 2500); } else { audioService.playPlay(); }
  };

  useEffect(() => {
    if (gameMode !== 'SINGLE_PLAYER' || !spGameState || spGameState.status !== GameStatus.PLAYING) return;
    const curPlayer = spGameState.players.find(p => p.id === spGameState.currentPlayerId);
    if (curPlayer?.isBot && !curPlayer.finishedRank) {
        const timer = setTimeout(() => {
            if (!spGameState || spGameState.status !== GameStatus.PLAYING) return;
            const move = findBestMove(spOpponentHands[curPlayer.id], spGameState.currentPlayPile, !!spGameState.isFirstTurnOfGame, aiDifficulty);
            if (move) handleLocalPlay(curPlayer.id, move);
            else handleLocalPass(curPlayer.id);
        }, 1200);
        return () => clearTimeout(timer);
    }
  }, [spGameState?.currentPlayerId, spGameState?.status, gameMode, aiDifficulty]);

  const handleStart = (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL', coverStyle: CardCoverStyle, avatar: string, quickFinish?: boolean, difficulty?: AiDifficulty) => {
    setPlayerName(name.toUpperCase());
    setPlayerAvatar(avatar);
    setCardCoverStyle(coverStyle);
    if (quickFinish !== undefined) setSpQuickFinish(quickFinish);
    if (difficulty) setAiDifficulty(difficulty);
    
    if (mode === 'TUTORIAL') { setView('TUTORIAL'); return; }
    
    setGameMode(mode);
    if (mode === 'MULTI_PLAYER') {
      connectSocket();
      socket.emit(SocketEvents.CREATE_ROOM, { name, avatar, playerId: myPersistentId, isPublic: true });
    } else {
      const hands = dealCards();
      const pNames = ['SABER', 'LANCE', 'PHANTOM'];
      const players: Player[] = [
        { id: 'me', name: name.toUpperCase(), avatar, cardCount: 13, isHost: true },
        { id: 'bot1', name: pNames[0], avatar: BOT_AVATARS[0], cardCount: 13, isHost: false, isBot: true },
        { id: 'bot2', name: pNames[1], avatar: BOT_AVATARS[1], cardCount: 13, isHost: false, isBot: true },
        { id: 'bot3', name: pNames[2], avatar: BOT_AVATARS[2], cardCount: 13, isHost: false, isBot: true }
      ];
      setSpMyHand(hands[0]);
      setSpOpponentHands({ 'bot1': hands[1], 'bot2': hands[2], 'bot3': hands[3] });
      setSpChops(0);
      
      let starterIndex = 0;
      let minScore = 999;
      let has3S = false;
      hands.forEach((h, i) => h.forEach(c => {
          const s = c.rank * 10 + c.suit;
          if (s < minScore) { minScore = s; starterIndex = i; }
          if (c.rank === Rank.Three && c.suit === Suit.Spades) has3S = true;
      }));
      
      setSpGameState({
        roomId: 'LOCAL', status: GameStatus.PLAYING, players, currentPlayerId: players[starterIndex].id,
        currentPlayPile: [], lastPlayerToPlayId: null, winnerId: null, finishedPlayers: [], isFirstTurnOfGame: has3S
      });
      setView('GAME_TABLE');
    }
  };

  const handleExit = () => {
    if (gameMode === 'MULTI_PLAYER') disconnectSocket();
    setGameMode(null); setMpGameState(null); setSpGameState(null); setSpOpponentHands({}); setSpMyHand([]); setView('WELCOME');
    localStorage.removeItem(SESSION_KEY);
    window.history.replaceState({}, '', '/');
  };

  const currentGameState = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
  const currentHand = gameMode === 'MULTI_PLAYER' ? mpMyHand : spMyHand;

  if (!authChecked || (session?.user && !profile && !loadingProfileInProgressRef.current)) {
     return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!session && !isGuest) return <AuthScreen onPlayAsGuest={() => setIsGuest(true)} />;

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-yellow-500/30">
      {isTransitioning && <GameEndTransition />}
      
      {view === 'WELCOME' && (
        <WelcomeScreen 
          playerName={playerName} setPlayerName={setPlayerName} playerAvatar={playerAvatar} setPlayerAvatar={setPlayerAvatar}
          cardCoverStyle={cardCoverStyle} setCardCoverStyle={setCardCoverStyle} aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty}
          quickFinish={spQuickFinish} setQuickFinish={setSpQuickFinish} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
          backgroundTheme={backgroundTheme} setBackgroundTheme={setBackgroundTheme}
          onStart={handleStart} onSignOut={handleSignOut} profile={profile} onRefreshProfile={() => session?.user && loadProfile(session.user.id)}
          onOpenHub={(tab) => setHubState({ open: true, tab })} onOpenStore={() => setStoreOpen(true)} isGuest={isGuest}
        />
      )}

      {view === 'LOBBY' && (
        <Lobby playerName={playerName} gameState={mpGameState} error={error} playerAvatar={playerAvatar} initialRoomCode={urlRoomCode} backgroundTheme={backgroundTheme} onBack={handleExit} onSignOut={handleSignOut} myId={myPersistentId} />
      )}

      {view === 'GAME_TABLE' && currentGameState && (
        <GameTable 
          gameState={currentGameState} myId={gameMode === 'MULTI_PLAYER' ? myPersistentId : 'me'} myHand={currentHand}
          onPlayCards={(cards) => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.PLAY_CARDS, { roomId: currentGameState.roomId, cards, playerId: myPersistentId }) : handleLocalPlay('me', cards)}
          onPassTurn={() => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.PASS_TURN, { roomId: currentGameState.roomId, playerId: myPersistentId }) : handleLocalPass('me')}
          cardCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} onExitGame={handleExit} onSignOut={handleSignOut}
          backgroundTheme={backgroundTheme} onChangeBackgroundTheme={setBackgroundTheme} isSinglePlayer={gameMode === 'SINGLE_PLAYER'}
          spQuickFinish={spQuickFinish} setSpQuickFinish={setSpQuickFinish} aiDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty}
          soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} onOpenSettings={() => setGameSettingsOpen(true)} profile={profile}
        />
      )}

      {view === 'VICTORY' && currentGameState && (
        <VictoryScreen 
           players={currentGameState.players} myId={gameMode === 'MULTI_PLAYER' ? myPersistentId : 'me'}
           onPlayAgain={() => { if (gameMode === 'MULTI_PLAYER') socket.emit(SocketEvents.START_GAME, { roomId: currentGameState.roomId, playerId: myPersistentId }); else handleStart(playerName, 'SINGLE_PLAYER', cardCoverStyle, playerAvatar); }}
           onGoHome={handleExit} profile={profile} xpGained={lastMatchRewards?.xp || 0} coinsGained={lastMatchRewards?.coins || 0} xpBonusApplied={lastMatchRewards?.bonus}
        />
      )}

      {view === 'TUTORIAL' && <TutorialMode onExit={() => setView('WELCOME')} />}

      {hubState.open && (
        <UserHub 
          onClose={() => setHubState({ ...hubState, open: false })} profile={profile} playerName={playerName} setPlayerName={setPlayerName}
          playerAvatar={playerAvatar} setPlayerAvatar={setPlayerAvatar} onSignOut={handleSignOut} onRefreshProfile={() => session?.user && loadProfile(session.user.id)} isGuest={isGuest} remoteEmotes={[]}
        />
      )}

      {gameSettingsOpen && (
        <GameSettings 
          onClose={() => setGameSettingsOpen(false)} onExitGame={handleExit} currentCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle}
          currentTheme={backgroundTheme} onChangeTheme={setBackgroundTheme} isSinglePlayer={gameMode === 'SINGLE_PLAYER'} spQuickFinish={spQuickFinish}
          setSpQuickFinish={setSpQuickFinish} currentDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
        />
      )}

      {storeOpen && (
        <Store 
          onClose={() => setStoreOpen(false)} profile={profile} onRefreshProfile={() => session?.user && loadProfile(session.user.id)}
          onEquipSleeve={setCardCoverStyle} currentSleeve={cardCoverStyle} playerAvatar={playerAvatar} onEquipAvatar={setPlayerAvatar}
          currentTheme={backgroundTheme} onEquipBoard={setBackgroundTheme} isGuest={isGuest} initialTab={storeTab}
        />
      )}

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 bg-red-600/90 backdrop-blur-xl border-2 border-red-400 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl animate-in slide-in-from-bottom-4">
           {error}
        </div>
      )}
    </div>
  );
};

export default App;
