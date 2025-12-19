
import React, { useState, useEffect } from 'react';
import { connectSocket, socket, disconnectSocket } from './services/socket';
import { GameState, GameStatus, SocketEvents, Card, Player, Rank, Suit, BackgroundTheme, AiDifficulty } from './types';
import { GameTable } from './components/GameTable';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Lobby } from './components/Lobby';
import { VictoryScreen } from './components/VictoryScreen';
import { ConnectingScreen } from './components/ConnectingScreen';
import { dealCards, validateMove, findBestMove, getComboType } from './utils/gameLogic';
import { CardCoverStyle } from './components/Card';
import { audioService } from './services/audio';

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
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('MEDIUM');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [connected, setConnected] = useState(false);
  const [mpGameState, setMpGameState] = useState<GameState | null>(null);
  const [mpMyHand, setMpMyHand] = useState<Card[]>([]);
  
  const [spGameState, setSpGameState] = useState<GameState | null>(null);
  const [spMyHand, setSpMyHand] = useState<Card[]>([]);
  const [spOpponentHands, setSpOpponentHands] = useState<Record<string, Card[]>>({});
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    audioService.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Sync turn sounds
  useEffect(() => {
    const state = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
    const myId = gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me';
    if (state?.currentPlayerId === myId && state.status === GameStatus.PLAYING) {
      audioService.playTurn();
    }
  }, [mpGameState?.currentPlayerId, spGameState?.currentPlayerId]);

  useEffect(() => {
    if (view === 'VICTORY') {
      audioService.playVictory();
    }
  }, [view]);

  // Initial Room Param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room.length === 4) setInitialRoomCode(room.toUpperCase());
  }, []);

  // Multiplayer Socket Listeners
  useEffect(() => {
    const onGameState = (state: GameState) => {
      setMpGameState(state);
      if (state.status === GameStatus.PLAYING) setView('GAME_TABLE');
      else if (state.status === GameStatus.FINISHED) setView('VICTORY');
      else if (state.status === GameStatus.LOBBY) setView('LOBBY');
    };
    const onPlayerHand = (cards: Card[]) => setMpMyHand(cards);
    
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on(SocketEvents.GAME_STATE, onGameState);
    socket.on(SocketEvents.PLAYER_HAND, onPlayerHand);
    socket.on(SocketEvents.ERROR, (m) => { setError(m); setTimeout(() => setError(null), 3000); });

    return () => {
      socket.off(SocketEvents.GAME_STATE);
      socket.off(SocketEvents.PLAYER_HAND);
    };
  }, []);

  const initSinglePlayer = (name: string, avatar: string) => {
    const hands = dealCards();
    let startingIdx = 0;
    for (let i = 0; i < 4; i++) {
        if (hands[i].some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) { startingIdx = i; break; }
    }
    const myId = 'player-me';
    const players: Player[] = [
      { id: myId, name, avatar, cardCount: 13, isHost: true, hasPassed: false, finishedRank: null },
      { id: 'bot-1', name: 'Bot 1', avatar: BOT_AVATARS[0], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null },
      { id: 'bot-2', name: 'Bot 2', avatar: BOT_AVATARS[1], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null },
      { id: 'bot-3', name: 'Bot 3', avatar: BOT_AVATARS[2], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null }
    ];
    setSpMyHand(hands[0]);
    setSpOpponentHands({ 'bot-1': hands[1], 'bot-2': hands[2], 'bot-3': hands[3] });
    setSpGameState({ roomId: 'LOCAL', status: GameStatus.PLAYING, players, currentPlayerId: players[startingIdx].id, currentPlayPile: [], lastPlayerToPlayId: null, winnerId: null, finishedPlayers: [], isFirstTurnOfGame: true });
    setView('GAME_TABLE');
  };

  useEffect(() => {
    if (gameMode !== 'SINGLE_PLAYER' || !spGameState || spGameState.status !== GameStatus.PLAYING) return;
    const cur = spGameState.players.find(p => p.id === spGameState.currentPlayerId);
    if (cur?.id.startsWith('bot-') && !cur.finishedRank) {
      const timer = setTimeout(() => {
        const hand = spOpponentHands[cur.id];
        const move = findBestMove(hand, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame, aiDifficulty);
        if (move) handleLocalPlay(cur.id, move);
        else handleLocalPass(cur.id);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [spGameState, gameMode]);

  const handleLocalPlay = (pid: string, cards: Card[]) => {
    if (!spGameState) return;
    if (pid === 'player-me') {
       const res = validateMove(cards, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame);
       if (!res.isValid) { setError(res.reason); setTimeout(() => setError(null), 2000); return; }
    }
    let handIsEmpty = false;
    let newCount = 0;
    if (pid === 'player-me') {
       const h = spMyHand.filter(c => !cards.some(p => p.id === c.id));
       setSpMyHand(h); newCount = h.length; if (newCount === 0) handIsEmpty = true;
    } else {
       const h = spOpponentHands[pid].filter(c => !cards.some(p => p.id === c.id));
       setSpOpponentHands(prev => ({ ...prev, [pid]: h })); newCount = h.length; if (newCount === 0) handIsEmpty = true;
    }
    let updatedPlayers = spGameState.players.map(p => p.id === pid ? { ...p, cardCount: newCount } : p);
    let updatedFinished = [...spGameState.finishedPlayers];
    if (handIsEmpty) {
        updatedFinished.push(pid);
        updatedPlayers = updatedPlayers.map(p => p.id === pid ? { ...p, finishedRank: updatedFinished.length } : p);
        if (pid === 'player-me' && spQuickFinish) {
            setSpGameState(prev => ({ ...prev!, status: GameStatus.FINISHED, players: updatedPlayers }));
            setView('VICTORY'); return;
        }
    }
    let nextId = getNextActivePlayerId(updatedPlayers, pid);
    let nextPile = [...spGameState.currentPlayPile, { playerId: pid, cards, comboType: getComboType(cards) }];
    let nextStatePlayers = updatedPlayers;
    if (handIsEmpty && updatedPlayers.filter(p => !p.finishedRank && p.id !== pid && !p.hasPassed).length === 0) {
        nextPile = []; nextStatePlayers = nextStatePlayers.map(p => ({ ...p, hasPassed: false }));
        nextId = getNextActivePlayerId(nextStatePlayers, pid, true);
    }
    setSpGameState(prev => ({ ...prev!, players: nextStatePlayers, currentPlayPile: nextPile, currentPlayerId: nextId, lastPlayerToPlayId: pid, finishedPlayers: updatedFinished, isFirstTurnOfGame: false }));
  };

  const handleLocalPass = (pid: string) => {
    if (!spGameState) return;
    const updated = spGameState.players.map(p => p.id === pid ? { ...p, hasPassed: true } : p);
    let nextId = getNextActivePlayerId(updated, pid);
    let nextPile = spGameState.currentPlayPile;
    let nextPlayers = updated;
    const lastP = spGameState.players.find(p => p.id === spGameState.lastPlayerToPlayId);
    if (nextId === spGameState.lastPlayerToPlayId || (lastP?.finishedRank && updated.filter(p => !p.finishedRank && !p.hasPassed).length === 0)) {
        nextPile = []; nextPlayers = nextPlayers.map(p => ({ ...p, hasPassed: false }));
        if (lastP?.finishedRank) nextId = getNextActivePlayerId(nextPlayers, spGameState.lastPlayerToPlayId!, true);
    }
    setSpGameState(prev => ({ ...prev!, players: nextPlayers, currentPlayPile: nextPile, currentPlayerId: nextId }));
  };

  const getNextActivePlayerId = (players: Player[], currentId: string, ignorePass: boolean = false): string => {
    const idx = players.findIndex(p => p.id === currentId);
    for (let i = 1; i <= players.length; i++) {
      const p = players[(idx + i) % players.length];
      if (p.finishedRank) continue;
      if (!ignorePass && p.hasPassed) continue;
      return p.id;
    }
    return currentId;
  };

  const handleStart = (name: string, mode: GameMode, style: CardCoverStyle, avatar: string, quick?: boolean, diff?: AiDifficulty) => {
    setPlayerName(name); setGameMode(mode); setCardCoverStyle(style); setPlayerAvatar(avatar);
    if (quick !== undefined) setSpQuickFinish(quick); if (diff !== undefined) setAiDifficulty(diff);
    if (mode === 'MULTI_PLAYER') { connectSocket(); setView('LOBBY'); } else initSinglePlayer(name, avatar);
  };

  function handleGoHome() {
    if (gameMode === 'MULTI_PLAYER') disconnectSocket();
    setConnected(false); setSpGameState(null); setMpGameState(null); setGameMode(null); setInitialRoomCode(null);
    setView('WELCOME');
  }

  return (
    <>
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm pointer-events-none">
            <div className="bg-red-500/85 backdrop-blur-md border border-red-400/30 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4">
                <span className="font-semibold">{error}</span>
            </div>
        </div>
      )}
      {view === 'WELCOME' && <WelcomeScreen onStart={handleStart} />}
      {view === 'LOBBY' && (
        !connected ? <ConnectingScreen onCancel={handleGoHome} />
        : <Lobby playerName={playerName} gameState={mpGameState} error={null} playerAvatar={playerAvatar} initialRoomCode={initialRoomCode} backgroundTheme={backgroundTheme} onBack={handleGoHome} />
      )}
      {view === 'VICTORY' && <VictoryScreen players={(gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState)?.players || []} myId={gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me'} onPlayAgain={() => gameMode === 'SINGLE_PLAYER' ? initSinglePlayer(playerName, playerAvatar) : setView('LOBBY')} onGoHome={handleGoHome} />}
      {view === 'GAME_TABLE' && (
        <GameTable 
            gameState={(gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState)!} 
            myId={gameMode === 'MULTI_PLAYER' ? socket.id! : 'player-me'} 
            myHand={gameMode === 'MULTI_PLAYER' ? mpMyHand : spMyHand} 
            onPlayCards={gameMode === 'MULTI_PLAYER' ? (cards) => socket.emit(SocketEvents.PLAY_CARDS, { roomId: mpGameState?.roomId, cards }) : (c) => handleLocalPlay('player-me', c)} 
            onPassTurn={gameMode === 'MULTI_PLAYER' ? () => socket.emit(SocketEvents.PASS_TURN, { roomId: mpGameState?.roomId }) : () => handleLocalPass('player-me')}
            cardCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} onExitGame={handleGoHome} backgroundTheme={backgroundTheme} onChangeBackgroundTheme={setBackgroundTheme}
            spQuickFinish={spQuickFinish} setSpQuickFinish={setSpQuickFinish} isSinglePlayer={gameMode === 'SINGLE_PLAYER'} aiDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty}
            soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
        />
      )}
    </>
  );
};

export default App;