
import React, { useState, useEffect } from 'react';
import { connectSocket, socket, disconnectSocket } from './services/socket';
import { GameState, GameStatus, SocketEvents, Card, Player, Rank, Suit, BackgroundTheme, AiDifficulty, PlayTurn } from './types';
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
  const [spQuickFinish, setSpQuickFinish] = useState(true);
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
    if (state?.currentPlayerId === myId && state?.status === GameStatus.PLAYING) {
      audioService.playTurn();
    }
  }, [mpGameState?.currentPlayerId, spGameState?.currentPlayerId, gameMode]);

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
      socket.off('connect');
      socket.off('disconnect');
      socket.off(SocketEvents.GAME_STATE);
      socket.off(SocketEvents.PLAYER_HAND);
      socket.off(SocketEvents.ERROR);
    };
  }, []);

  // -- SINGLE PLAYER HANDLERS --

  // Fix: implement handleLocalPass to avoid "Cannot find name 'handleLocalPass'" errors
  const handleLocalPass = (pid: string) => {
    if (!spGameState) return;
    if (spGameState.currentPlayerId !== pid) return;

    setSpGameState(prev => {
      if (!prev) return null;
      const players = prev.players.map(p => p.id === pid ? { ...p, hasPassed: true } : p);
      
      let nextIdx = prev.players.findIndex(p => p.id === pid);
      
      const getNextActive = (start: number, ignorePass: boolean = false) => {
        for (let i = 1; i <= prev.players.length; i++) {
          const idx = (start + i) % prev.players.length;
          const p = players[idx];
          if (p.finishedRank) continue;
          if (!ignorePass && p.hasPassed) continue;
          return idx;
        }
        return start;
      };

      let nextPlayerIdx = getNextActive(nextIdx);
      let newPlayPile = prev.currentPlayPile;
      let finalPlayers = players;

      const nextPlayerId = players[nextPlayerIdx].id;
      if (nextPlayerId === prev.lastPlayerToPlayId || (newPlayPile.length === 0 && players.filter(p => !p.finishedRank && !p.hasPassed).length <= 1)) {
        newPlayPile = [];
        finalPlayers = players.map(p => ({ ...p, hasPassed: false }));
        const lastP = finalPlayers.find(p => p.id === prev.lastPlayerToPlayId);
        if (lastP?.finishedRank) {
           nextPlayerIdx = getNextActive(nextPlayerIdx, true);
        } else {
           nextPlayerIdx = finalPlayers.findIndex(p => p.id === prev.lastPlayerToPlayId);
        }
      }

      return {
        ...prev,
        players: finalPlayers,
        currentPlayerId: finalPlayers[nextPlayerIdx].id,
        currentPlayPile: newPlayPile
      };
    });
  };

  // Fix: complete handleLocalPlay implementation
  const handleLocalPlay = (pid: string, cards: Card[]) => {
    if (!spGameState) return;
    if (spGameState.currentPlayerId !== pid) return;

    const res = validateMove(cards, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame);
    if (!res.isValid && pid === 'player-me') {
       setError(res.reason);
       setTimeout(() => setError(null), 3000);
       return;
    }

    setSpGameState(prev => {
      if (!prev) return null;
      
      const isBot = pid.startsWith('bot-');
      if (!isBot) {
        setSpMyHand(prevHand => prevHand.filter(c => !cards.some(pc => pc.id === c.id)));
      } else {
        setSpOpponentHands(prevHands => ({
          ...prevHands,
          [pid]: prevHands[pid].filter(c => !cards.some(pc => pc.id === c.id))
        }));
      }

      const player = prev.players.find(p => p.id === pid)!;
      const newCardCount = Math.max(0, player.cardCount - cards.length);
      
      let newFinishedPlayers = prev.finishedPlayers;
      let finishedRank = player.finishedRank;
      
      if (newCardCount === 0 && !finishedRank) {
        newFinishedPlayers = [...prev.finishedPlayers, pid];
        finishedRank = newFinishedPlayers.length;
      }

      const updatedPlayers = prev.players.map(p => p.id === pid ? { ...p, cardCount: newCardCount, finishedRank } : p);
      
      if (updatedPlayers.filter(p => !p.finishedRank).length <= 1) {
        if (pid === 'player-me' && spQuickFinish) {
           setTimeout(() => setView('VICTORY'), 500);
        }
        return {
          ...prev,
          players: updatedPlayers,
          status: GameStatus.FINISHED,
          finishedPlayers: newFinishedPlayers
        };
      }

      const comboType = getComboType(cards);
      const newTurn: PlayTurn = { playerId: pid, cards, comboType };
      const newPlayPile = [...prev.currentPlayPile, newTurn];

      const activeInRound = updatedPlayers.filter(p => !p.finishedRank && !p.hasPassed && p.id !== pid);
      
      let nextPlayerIdx;
      let finalPlayers = updatedPlayers;
      let finalPlayPile = newPlayPile;

      if (activeInRound.length === 0) {
        finalPlayPile = [];
        finalPlayers = updatedPlayers.map(p => ({ ...p, hasPassed: false }));
        const curPlayer = finalPlayers.find(p => p.id === pid)!;
        if (curPlayer.finishedRank) {
           let start = finalPlayers.indexOf(curPlayer);
           nextPlayerIdx = (start + 1) % finalPlayers.length;
           while (finalPlayers[nextPlayerIdx].finishedRank) {
             nextPlayerIdx = (nextPlayerIdx + 1) % finalPlayers.length;
           }
        } else {
           nextPlayerIdx = finalPlayers.indexOf(curPlayer);
        }
      } else {
        let start = updatedPlayers.findIndex(p => p.id === pid);
        nextPlayerIdx = (start + 1) % updatedPlayers.length;
        while (updatedPlayers[nextPlayerIdx].finishedRank || updatedPlayers[nextPlayerIdx].hasPassed) {
          nextPlayerIdx = (nextPlayerIdx + 1) % updatedPlayers.length;
        }
      }

      return {
        ...prev,
        players: finalPlayers,
        currentPlayPile: finalPlayPile,
        currentPlayerId: finalPlayers[nextPlayerIdx].id,
        lastPlayerToPlayId: pid,
        isFirstTurnOfGame: false,
        finishedPlayers: newFinishedPlayers
      };
    });
  };

  const initSinglePlayer = (name: string, avatar: string) => {
    const hands = dealCards();
    let startingIdx = 0;
    for (let i = 0; i < 4; i++) {
        if (hands[i].some(c => c.rank === Rank.Three && c.suit === Suit.Spades)) { startingIdx = i; break; }
    }
    const myId = 'player-me';
    const players: Player[] = [
      { id: myId, name, avatar, cardCount: 13, isHost: true, hasPassed: false, finishedRank: null },
      { id: 'bot-1', name: 'CPU 1', avatar: BOT_AVATARS[0], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null, isBot: true, difficulty: aiDifficulty },
      { id: 'bot-2', name: 'CPU 2', avatar: BOT_AVATARS[1], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null, isBot: true, difficulty: aiDifficulty },
      { id: 'bot-3', name: 'CPU 3', avatar: BOT_AVATARS[2], cardCount: 13, isHost: false, hasPassed: false, finishedRank: null, isBot: true, difficulty: aiDifficulty }
    ];
    setSpMyHand(hands[0]);
    setSpOpponentHands({ 'bot-1': hands[1], 'bot-2': hands[2], 'bot-3': hands[3] });
    setSpGameState({ roomId: 'LOCAL', status: GameStatus.PLAYING, players, currentPlayerId: players[startingIdx].id, currentPlayPile: [], lastPlayerToPlayId: null, winnerId: null, finishedPlayers: [], isFirstTurnOfGame: true });
    setGameMode('SINGLE_PLAYER');
    setView('GAME_TABLE');
  };

  // Bot logic
  useEffect(() => {
    if (gameMode !== 'SINGLE_PLAYER' || !spGameState || spGameState.status !== GameStatus.PLAYING) return;
    const cur = spGameState.players.find(p => p.id === spGameState.currentPlayerId);
    if (cur?.id.startsWith('bot-') && !cur.finishedRank) {
      const timer = setTimeout(() => {
        // Implement Easy AI stupidity here
        if (aiDifficulty === 'EASY' && spGameState.currentPlayPile.length > 0 && Math.random() < 0.35) {
          handleLocalPass(cur.id);
          return;
        }

        const hand = spOpponentHands[cur.id];
        const move = findBestMove(hand, spGameState.currentPlayPile, spGameState.isFirstTurnOfGame, aiDifficulty);
        if (move) handleLocalPlay(cur.id, move);
        else handleLocalPass(cur.id);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [spGameState, gameMode, aiDifficulty, spOpponentHands]);

  const handleStart = (name: string, mode: GameMode, style: CardCoverStyle, avatar: string, quick?: boolean, diff?: AiDifficulty) => {
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setGameMode(mode);
    setCardCoverStyle(style);
    if (quick !== undefined) setSpQuickFinish(quick);
    if (diff !== undefined) setAiDifficulty(diff);

    if (mode === 'SINGLE_PLAYER') {
      initSinglePlayer(name, avatar);
    } else {
      connectSocket();
      setView('LOBBY');
    }
  };

  const handleExit = () => {
    if (gameMode === 'MULTI_PLAYER') disconnectSocket();
    setGameMode(null);
    setMpGameState(null);
    setSpGameState(null);
    setView('WELCOME');
  };

  const renderContent = () => {
    switch (view) {
      case 'WELCOME':
        return <WelcomeScreen onStart={handleStart} />;
      case 'LOBBY':
        return <Lobby 
          playerName={playerName} 
          gameState={mpGameState} 
          error={error} 
          playerAvatar={playerAvatar}
          initialRoomCode={initialRoomCode}
          backgroundTheme={backgroundTheme}
          onBack={handleExit}
        />;
      case 'GAME_TABLE':
        if (gameMode === 'MULTI_PLAYER') {
          if (!mpGameState) return <ConnectingScreen onCancel={handleExit} />;
          return <GameTable 
            gameState={mpGameState} 
            myId={socket.id} 
            myHand={mpMyHand} 
            onPlayCards={(cards) => socket.emit(SocketEvents.PLAY_CARDS, { roomId: mpGameState.roomId, cards })}
            onPassTurn={() => socket.emit(SocketEvents.PASS_TURN, { roomId: mpGameState.roomId })}
            cardCoverStyle={cardCoverStyle}
            onChangeCoverStyle={setCardCoverStyle}
            onExitGame={handleExit}
            backgroundTheme={backgroundTheme}
            onChangeBackgroundTheme={setBackgroundTheme}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
          />;
        } else {
          if (!spGameState) return null;
          return <GameTable 
            gameState={spGameState} 
            myId="player-me" 
            myHand={spMyHand} 
            onPlayCards={(cards) => handleLocalPlay('player-me', cards)}
            onPassTurn={() => handleLocalPass('player-me')}
            cardCoverStyle={cardCoverStyle}
            onChangeCoverStyle={setCardCoverStyle}
            onExitGame={handleExit}
            backgroundTheme={backgroundTheme}
            onChangeBackgroundTheme={setBackgroundTheme}
            isSinglePlayer
            spQuickFinish={spQuickFinish}
            setSpQuickFinish={setSpQuickFinish}
            aiDifficulty={aiDifficulty}
            onChangeDifficulty={setAiDifficulty}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
          />;
        }
      case 'VICTORY':
        const finalState = gameMode === 'MULTI_PLAYER' ? mpGameState : spGameState;
        if (!finalState) return null;
        return <VictoryScreen 
          players={finalState.players} 
          myId={gameMode === 'MULTI_PLAYER' ? socket.id : 'player-me'} 
          onPlayAgain={() => {
            if (gameMode === 'MULTI_PLAYER') {
              socket.emit(SocketEvents.START_GAME, { roomId: finalState.roomId });
            } else {
              initSinglePlayer(playerName, playerAvatar);
            }
          }}
          onGoHome={handleExit}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full">
      {renderContent()}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-black uppercase tracking-widest text-xs animate-bounce">
          {error}
        </div>
      )}
    </div>
  );
};

// Fix: Add default export to resolve index.tsx import error
export default App;
