
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { GameSettings } from './components/GameSettings';
import { Store } from './components/Store';
import { dealCards, validateMove, findBestMove, getComboType } from './utils/gameLogic';
import { CardCoverStyle } from './components/Card';
import { audioService } from './services/audio';
import { supabase, recordGameResult, fetchProfile, fetchGuestProfile, transferGuestData, calculateLevel, AVATAR_NAMES, updateProfileAvatar, updateProfileEquipped, updateActiveBoard } from './services/supabase';
import { v4 as uuidv4 } from 'uuid';

type ViewState = 'WELCOME' | 'LOBBY' | 'GAME_TABLE' | 'VICTORY' | 'TUTORIAL';
type GameMode = 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL' | null;

const BOT_AVATARS = ['🤖', '👾', '💩', '🤡', '👹', '👺', '👻'];

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
  
  const [error, setError] = useState<string | null>(null);
  const [lastMatchRewards, setLastMatchRewards] = useState<{ xp: number, coins: number, diff: AiDifficulty, bonus: boolean } | null>(null);

  // Critical Refs for Sync
  const isLoggingOutRef = useRef(false);
  const initialSyncCompleteRef = useRef(false);
  const loadingProfileInProgressRef = useRef(false);

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
      }
      else if (!isGuest) {
        setProfile(null);
        initialSyncCompleteRef.current = false;
      }
    });
    return () => subscription.unsubscribe();
  }, [isGuest]);

  const loadProfile = async (uid: string) => {
    loadingProfileInProgressRef.current = true;
    initialSyncCompleteRef.current = false; // Block saving during load
    
    const data = await fetchProfile(uid, playerAvatar);
    if (data) {
      // Step 1: Update local non-profile states first so they match profile when profile is set
      if (data.username && (!playerName || playerName.includes('AGENT'))) setPlayerName(data.username);
      if (data.avatar_url) setPlayerAvatar(data.avatar_url);
      if (data.equipped_sleeve) setCardCoverStyle(data.equipped_sleeve as CardCoverStyle);
      
      // Support active_board column for theme selection
      const savedTheme = (data.active_board || data.equipped_board || 'EMERALD') as BackgroundTheme;
      setBackgroundTheme(savedTheme);
      
      // Step 2: Set the profile
      setProfile(data);
    }
    
    // Step 3: Release block after a short delay to ensure state updates have settled in the DOM/Lifecycle
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
      if (data.equipped_sleeve) setCardCoverStyle(data.equipped_sleeve as CardCoverStyle);
      
      const savedTheme = (data.active_board || data.equipped_board || 'EMERALD') as BackgroundTheme;
      setBackgroundTheme(savedTheme);
      
      initialSyncCompleteRef.current = true;
    }
  }, [isGuest, session]);

  // Combined Persistence Effect for Customization
  useEffect(() => {
    const userId = session?.user?.id || (isGuest ? 'guest' : null);
    if (!authChecked || !userId || !profile || !initialSyncCompleteRef.current || isLoggingOutRef.current) return;

    // Only save if current state differs from the last known state in the profile object
    const needsAvatarUpdate = playerAvatar !== profile.avatar_url;
    const needsSleeveUpdate = cardCoverStyle !== profile.equipped_sleeve;
    const needsBoardUpdate = backgroundTheme !== (profile.active_board || profile.equipped_board);

    if (needsAvatarUpdate) {
      updateProfileAvatar(userId, playerAvatar);
      setProfile(prev => prev ? { ...prev, avatar_url: playerAvatar } : null);
    }

    if (needsSleeveUpdate) {
      updateProfileEquipped(userId, cardCoverStyle, undefined);
      setProfile(prev => prev ? { ...prev, equipped_sleeve: cardCoverStyle } : null);
    }

    if (needsBoardUpdate) {
      // Validate that user actually owns the board before updating active_board
      if (profile.unlocked_boards.includes(backgroundTheme) || backgroundTheme === 'EMERALD' || backgroundTheme === 'CLASSIC_GREEN' || backgroundTheme === 'CYBER_BLUE' || backgroundTheme === 'CRIMSON_VOID') {
        updateActiveBoard(userId, backgroundTheme);
        setProfile(prev => prev ? { ...prev, active_board: backgroundTheme, equipped_board: backgroundTheme } : null);
      }
    }
  }, [playerAvatar, cardCoverStyle, backgroundTheme, session, authChecked, profile, isGuest]);

  const handleSignOut = async () => {
    isLoggingOutRef.current = true;
    initialSyncCompleteRef.current = false;
    
    if (session) await supabase.auth.signOut();
    
    setIsGuest(false);
    setProfile(null);
    setPlayerName('');
    setPlayerAvatar('😎');
    setCardCoverStyle('RED');
    setBackgroundTheme('EMERALD');
    setView('WELCOME');
    setHubState({ open: false, tab: 'PROFILE' });
    setGameSettingsOpen(false);
    setStoreOpen(false);
    handleExit();
    
    setTimeout(() => { isLoggingOutRef.current = false; }, 500);
  };

  const handleOpenStore = (tab?: 'SLEEVES' | 'AVATARS' | 'BOARDS') => {
    if (tab) setStoreTab(tab);
    setStoreOpen(true);
  };

  useEffect(() => { audioService.setEnabled(soundEnabled); }, [soundEnabled]);

  useEffect(() => {
    const state = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
    const myId = gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me';
    if (state?.currentPlayerId === myId && state?.status === GameStatus.PLAYING) audioService.playTurn();
  }, [mpGameState?.currentPlayerId, spGameState?.currentPlayerId, gameMode]);

  const triggerMatchEndTransition = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => { setView('VICTORY'); setIsTransitioning(false); }, 2500);
  }, []);

  // Listen for Multiplayer match end
  useEffect(() => {
    const onGameState = (state: GameState) => {
      setMpGameState(state);
      if (state.status === GameStatus.PLAYING) setView('GAME_TABLE');
      else if (state.status === GameStatus.FINISHED && view === 'GAME_TABLE') triggerMatchEndTransition();
      else if (state.status === GameStatus.FINISHED && view !== 'GAME_TABLE') setView('VICTORY');
      else if (state.status === GameStatus.LOBBY) setView('LOBBY');
    };
    const onPlayerHand = (cards: Card[]) => setMpMyHand(cards);
    socket.on(SocketEvents.GAME_STATE, onGameState);
    socket.on(SocketEvents.PLAYER_HAND, onPlayerHand);
    socket.on(SocketEvents.ERROR, (m) => { setError(m); setTimeout(() => setError(null), 3000); });
    return () => {
      socket.off(SocketEvents.GAME_STATE); socket.off(SocketEvents.PLAYER_HAND);
      socket.off(SocketEvents.ERROR);
    };
  }, [view, triggerMatchEndTransition]);

  // Listen for Single Player match end
  useEffect(() => {
    if (gameMode === 'SINGLE_PLAYER' && spGameState?.status === GameStatus.FINISHED && view === 'GAME_TABLE' && !isTransitioning) {
        triggerMatchEndTransition();
        const me = spGameState.players.find(p => p.id === 'player-me');
        const myRank = me?.finishedRank || 4;
        
        recordGameResult(myRank, true, aiDifficulty, !!isGuest, profile?.id)
          .then(res => {
              setLastMatchRewards({ 
                xp: res.xpGained, 
                coins: res.coinsGained, 
                diff: aiDifficulty, 
                bonus: res.xpBonusApplied 
              });
              handleRefreshProfile();
          })
          .catch(err => {
              console.error("Single Player reward processing failed:", err);
          });
    }
  }, [spGameState?.status, gameMode, view, isTransitioning, aiDifficulty, isGuest, profile?.id, triggerMatchEndTransition]);

  const handleLocalPass = (pid: string) => {
    if (!spGameState || spGameState.status !== GameStatus.PLAYING || spGameState.currentPlayerId !== pid) return;
    setSpGameState(prev => {
      if (!prev) return null;
      const players = prev.players.map(p => p.id === pid ? { ...p, hasPassed: true } : p);
      let currentIndex = prev.players.findIndex(p => p.id === pid);
      let nextIndex = (currentIndex + 1) % 4;
      let searchCount = 0;
      while ((players[nextIndex].hasPassed || players[nextIndex].finishedRank) && searchCount < 4) {
        nextIndex = (nextIndex + 1) % 4;
        searchCount++;
      }
      let finalPlayPile = prev.currentPlayPile;
      let nextPlayerId = players[nextIndex].id;
      if (nextPlayerId === prev.lastPlayerToPlayId) {
        finalPlayPile = [];
        players.forEach(p => p.hasPassed = false);
        if (players[nextIndex].finishedRank) {
            while (players[nextIndex].finishedRank) { nextIndex = (nextIndex + 1) % 4; }
            nextPlayerId = players[nextIndex].id;
        }
      }
      return { ...prev, players, currentPlayerId: nextPlayerId, currentPlayPile: finalPlayPile };
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
      if (pid === 'player-me') {
        setSpMyHand(prevHand => prevHand.filter(c => !cards.some(pc => pc.id === c.id)));
      } else {
        setSpOpponentHands(prevHands => ({ ...prevHands, [pid]: prevHands[pid].filter(c => !cards.some(pc => pc.id === c.id)) }));
      }
      let updatedPlayers = prev.players.map(p => p.id === pid ? { ...p, cardCount: p.cardCount - cards.length } : p);
      const newPlayPile = [...prev.currentPlayPile, { playerId: pid, cards, comboType: getComboType(cards) }];
      let playerWhoJustPlayed = updatedPlayers.find(p => p.id === pid)!;
      let finishedPlayers = [...prev.finishedPlayers];
      if (playerWhoJustPlayed.cardCount === 0) {
          finishedPlayers.push(pid);
          playerWhoJustPlayed.finishedRank = finishedPlayers.length;
      }
      if (pid === 'player-me' && playerWhoJustPlayed.cardCount === 0 && spQuickFinish) {
          const remaining = updatedPlayers.filter(p => !p.finishedRank).sort((a, b) => a.cardCount - b.cardCount);
          remaining.forEach((p, idx) => {
              const r = updatedPlayers.find(up => up.id === p.id)!;
              r.finishedRank = finishedPlayers.length + idx + 1;
              finishedPlayers.push(p.id);
          });
          return { ...prev, players: updatedPlayers, status: GameStatus.FINISHED, currentPlayPile: [], finishedPlayers };
      }
      const playersRemaining = updatedPlayers.filter(p => !p.finishedRank).length;
      if (playersRemaining <= 1) {
          const loser = updatedPlayers.find(p => !p.finishedRank);
          if (loser) { finishedPlayers.push(loser.id); loser.finishedRank = finishedPlayers.length; }
          return { ...prev, players: updatedPlayers, status: GameStatus.FINISHED, currentPlayPile: [], finishedPlayers };
      }
      let nextIndex = (prev.players.findIndex(p => p.id === pid) + 1) % 4;
      while (updatedPlayers[nextIndex].finishedRank || updatedPlayers[nextIndex].hasPassed) { nextIndex = (nextIndex + 1) % 4; }
      if (updatedPlayers[nextIndex].id === pid && playerWhoJustPlayed.finishedRank) {
          updatedPlayers.forEach(p => p.hasPassed = false);
          while (updatedPlayers[nextIndex].finishedRank) { nextIndex = (nextIndex + 1) % 4; }
          return { ...prev, players: updatedPlayers, currentPlayPile: [], currentPlayerId: updatedPlayers[nextIndex].id, lastPlayerToPlayId: pid, isFirstTurnOfGame: false, finishedPlayers };
      }
      return { ...prev, players: updatedPlayers, currentPlayPile: newPlayPile, currentPlayerId: updatedPlayers[nextIndex].id, lastPlayerToPlayId: pid, isFirstTurnOfGame: false, finishedPlayers };
    });
  };

  const initSinglePlayer = (name: string, avatar: string) => {
    const hands = dealCards();
    const botNames = ['VALKYRIE', 'SABER', 'LANCE'];
    const players: Player[] = [
      { id: 'player-me', name: name || AVATAR_NAMES[avatar]?.toUpperCase() || 'COMMANDER', avatar, cardCount: 13, isHost: true, finishedRank: null },
      { id: 'bot-1', name: botNames[0], avatar: BOT_AVATARS[0], cardCount: 13, isHost: false, finishedRank: null, isBot: true, difficulty: aiDifficulty },
      { id: 'bot-2', name: botNames[1], avatar: BOT_AVATARS[1], cardCount: 13, isHost: false, finishedRank: null, isBot: true, difficulty: aiDifficulty },
      { id: 'bot-3', name: botNames[2], avatar: BOT_AVATARS[2], cardCount: 13, isHost: false, finishedRank: null, isBot: true, difficulty: aiDifficulty }
    ];
    setSpMyHand(hands[0]);
    setSpOpponentHands({ 'bot-1': hands[1], 'bot-2': hands[2], 'bot-3': hands[3] });
    let starterId = 'player-me';
    hands.forEach((hand, i) => { if (hand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) starterId = players[i].id; });
    setSpGameState({ roomId: 'LOCAL', status: GameStatus.PLAYING, players, currentPlayerId: starterId, currentPlayPile: [], finishedPlayers: [], isFirstTurnOfGame: true, lastPlayerToPlayId: null, winnerId: null });
    setGameMode('SINGLE_PLAYER'); setView('GAME_TABLE');
  };

  useEffect(() => {
    if (gameMode === 'SINGLE_PLAYER' && spGameState?.status === GameStatus.PLAYING && spGameState.currentPlayerId?.startsWith('bot-')) {
      const meFinished = spGameState.players.find(p => p.id === 'player-me')?.finishedRank;
      if (meFinished && spQuickFinish) return;
      const botId = spGameState.currentPlayerId;
      const botHand = spOpponentHands[botId];
      const timer = setTimeout(() => {
        const move = findBestMove(botHand, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame, aiDifficulty);
        if (move) handleLocalPlay(botId, move); else handleLocalPass(botId);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [spGameState?.currentPlayerId, spGameState?.currentPlayPile, spGameState?.status, gameMode, spQuickFinish]);

  const handleStart = (n: string, m: GameMode | 'TUTORIAL', s: CardCoverStyle, a: string) => {
    setPlayerName(n); setPlayerAvatar(a); setCardCoverStyle(s);
    if (m === 'TUTORIAL') { setView('TUTORIAL'); return; }
    setGameMode(m as GameMode);
    if (m === 'SINGLE_PLAYER') initSinglePlayer(n, a); else { connectSocket(); setView('LOBBY'); }
  };

  const handleExit = () => { if (gameMode === 'MULTI_PLAYER') disconnectSocket(); setGameMode(null); setMpGameState(null); setSpGameState(null); setView('WELCOME'); setGameSettingsOpen(false); };
  const handleRefreshProfile = () => { if(session?.user?.id) loadProfile(session.user.id); else if(isGuest) setProfile(fetchGuestProfile()); };

  return (
    <div className="w-full h-full bg-[#0a3d23]">
      {storeOpen && (
        <Store onClose={() => setStoreOpen(false)} profile={profile} isGuest={isGuest} onRefreshProfile={handleRefreshProfile} currentSleeve={cardCoverStyle} onEquipSleeve={setCardCoverStyle} playerAvatar={playerAvatar} onEquipAvatar={setPlayerAvatar} currentTheme={backgroundTheme} onEquipBoard={setBackgroundTheme} initialTab={storeTab} />
      )}
      {hubState.open && (
        <UserHub initialTab={hubState.tab} onClose={() => setHubState(p => ({ ...p, open: false }))} profile={profile} isGuest={isGuest} onRefreshProfile={handleRefreshProfile} currentSleeve={cardCoverStyle} onEquipSleeve={setCardCoverStyle} playerName={playerName} setPlayerName={setPlayerName} playerAvatar={playerAvatar} setPlayerAvatar={setPlayerAvatar} currentTheme={backgroundTheme} onChangeTheme={setBackgroundTheme} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} isSinglePlayer={gameMode === 'SINGLE_PLAYER'} spQuickFinish={spQuickFinish} setSpQuickFinish={setSpQuickFinish} currentDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty} onSignOut={handleSignOut} onOpenStore={handleOpenStore} />
      )}
      {gameSettingsOpen && (
        <GameSettings onClose={() => setGameSettingsOpen(false)} onExitGame={handleExit} currentCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} currentTheme={backgroundTheme} onChangeTheme={setBackgroundTheme} isSinglePlayer={gameMode === 'SINGLE_PLAYER'} spQuickFinish={spQuickFinish} setSpQuickFinish={setSpQuickFinish} currentDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />
      )}
      {!session && !isGuest && authChecked ? <AuthScreen onPlayAsGuest={() => setIsGuest(true)} /> : (
        <div className="relative w-full h-full">
          {view === 'WELCOME' && <WelcomeScreen onStart={handleStart} onSignOut={handleSignOut} profile={profile} onRefreshProfile={handleRefreshProfile} onOpenHub={(tab) => setHubState({ open: true, tab })} onOpenStore={() => handleOpenStore()} playerName={playerName} setPlayerName={setPlayerName} playerAvatar={playerAvatar} setPlayerAvatar={setPlayerAvatar} cardCoverStyle={cardCoverStyle} setCardCoverStyle={setCardCoverStyle} aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty} quickFinish={spQuickFinish} setQuickFinish={setSpQuickFinish} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} backgroundTheme={backgroundTheme} setBackgroundTheme={setBackgroundTheme} isGuest={isGuest} />}
          {view === 'LOBBY' && <Lobby playerName={playerName} gameState={mpGameState} error={error} playerAvatar={playerAvatar} backgroundTheme={backgroundTheme} onBack={handleExit} onSignOut={handleSignOut} />}
          {view === 'GAME_TABLE' && (
            <div className="relative w-full h-full">
              <GameTable gameState={(gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState)!} myId={gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me'} myHand={gameMode === 'MULTI_PLAYER' ? mpMyHand : spMyHand} onPlayCards={c => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.PLAY_CARDS, { roomId: mpGameState!.roomId, cards: c }) : handleLocalPlay('player-me', c)} onPassTurn={() => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.PASS_TURN, { roomId: mpGameState!.roomId }) : handleLocalPass('player-me')} cardCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} onExitGame={handleExit} onSignOut={handleSignOut} backgroundTheme={backgroundTheme} onChangeBackgroundTheme={setBackgroundTheme} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} onOpenSettings={() => setGameSettingsOpen(true)} />
              {isTransitioning && <GameEndTransition />}
            </div>
          )}
          {view === 'VICTORY' && <VictoryScreen profile={profile} xpGained={lastMatchRewards?.xp || 0} coinsGained={lastMatchRewards?.coins || 0} xpBonusApplied={lastMatchRewards?.bonus} players={(gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState)!.players} myId={gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me'} onPlayAgain={() => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.START_GAME, { roomId: mpGameState!.roomId }) : initSinglePlayer(playerName, playerAvatar)} onGoHome={handleExit} />}
          {view === 'TUTORIAL' && <TutorialMode onExit={handleExit} />}
        </div>
      )}
    </div>
  );
};

export default App;
