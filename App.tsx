import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { connectSocket, socket, disconnectSocket } from './services/socket';
import { GameState, GameStatus, SocketEvents, Card, Rank, Suit, BackgroundTheme, AiDifficulty, PlayTurn, UserProfile, Player, HubTab } from './types';
import { WelcomeScreen } from './components/WelcomeScreen';
import { FriendsLounge } from './components/FriendsLounge';
import { Lobby } from './components/Lobby';
import { TutorialMode } from './components/TutorialMode';
import { GameEndTransition } from './components/GameEndTransition';
import { AuthScreen } from './components/AuthScreen';
import { GameSettings, SocialFilter } from './components/GameSettings';
import { LegalView } from './components/LegalView';

// Lazy load heavy components for better initial load performance
const GameTable = lazy(() => import('./components/GameTable').then(m => ({ default: m.GameTable })));
const VictoryScreen = lazy(() => import('./components/VictoryScreen').then(m => ({ default: m.VictoryScreen })));
const UserHub = lazy(() => import('./components/UserHub').then(m => ({ default: m.UserHub })));
const Store = lazy(() => import('./components/Store').then(m => ({ default: m.Store })));
const GemPacks = lazy(() => import('./components/GemPacks').then(m => ({ default: m.GemPacks })));
const InventoryModal = lazy(() => import('./components/InventoryModal').then(m => ({ default: m.InventoryModal })));
import { dealCards, validateMove, findBestMove, getComboType, sortCards } from './utils/gameLogic';
import { CardCoverStyle } from './components/Card';
import { audioService } from './services/audio';
import { supabase, recordGameResult, fetchProfile, fetchGuestProfile, transferGuestData, calculateLevel, AVATAR_NAMES, updateProfileAvatar, updateProfileEquipped, updateActiveBoard, updateProfileSettings, globalAuthState, getGuestProgress, migrateGuestData, clearGuestProgress } from './services/supabase';
import { supabase as supabaseClient } from './services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { WelcomeToast } from './components/WelcomeToast';
import { Toast } from './components/Toast';
import { AccountMigrationSuccessModal } from './components/AccountMigrationSuccessModal';
import { adService } from './services/adService';
import { LoadingScreen } from './components/LoadingScreen';

type ViewState = 'WELCOME' | 'LOBBY' | 'GAME_TABLE' | 'VICTORY' | 'TUTORIAL';
type GameMode = 'SINGLE_PLAYER' | 'MULTI_PLAYER' | null;

const SESSION_KEY = 'thirteen_active_session';
const PERSISTENT_ID_KEY = 'thirteen_persistent_uuid';

// All in-house emote trigger codes (excluding premium/remote-only emotes)
const IN_HOUSE_EMOTES = [':smile:', ':blush:', ':cool:', ':annoyed:', ':heart_eyes:', ':money_mouth_face:', ':robot:', ':devil:', ':girly:'];

// Shuffle function for randomizing emote selection
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get a random emote from the shuffled array
const getRandomEmote = (): string => {
  const shuffled = shuffleArray(IN_HOUSE_EMOTES);
  return shuffled[Math.floor(Math.random() * shuffled.length)];
};

// Helper function to check environment variables
const checkSupabaseEnv = (): { isValid: boolean; missing: string[] } => {
  const getEnv = (key: string): string | undefined => {
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env[key];
      }
    } catch (e) {}
    try {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
      }
    } catch (e) {}
    return undefined;
  };

  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  const missing: string[] = [];
  
  // Note: supabaseUrl has a fallback in supabase.ts, but we still want to warn if it's missing
  // The critical one is the anon key
  if (!supabaseAnonKey) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }
  
  // Warn about missing URL but don't block (has fallback)
  if (!supabaseUrl) {
    console.warn('App: WARNING - VITE_SUPABASE_URL is missing, using fallback URL');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
  };
};

const AppContent: React.FC = () => {
  console.log('App: Step 6 - App component initializing...');
  
  // Check Supabase environment variables early
  const envCheck = checkSupabaseEnv();
  if (!envCheck.isValid) {
    console.error('App: ERROR - Missing environment variables:', envCheck.missing);
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: '#000',
        color: '#ff4444',
        fontFamily: 'monospace',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>⚠️ Missing Environment Variables</h1>
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>
          The following required environment variables are missing:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '16px' }}>
          {envCheck.missing.map(key => (
            <li key={key} style={{ margin: '10px 0', color: '#ffaa00' }}>{key}</li>
          ))}
        </ul>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#aaa' }}>
          Please configure these in your Vercel environment variables or .env file.
        </p>
      </div>
    );
  }
  
  console.log('App: Step 7 - Environment variables check passed');
  
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false); // Block state updates during OAuth
  
  console.log('App: Step 8 - State initialized');

  const [view, setView] = useState<ViewState>('WELCOME');
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [hubState, setHubState] = useState<{ open: boolean, tab: HubTab }>({ open: false, tab: 'PROFILE' });
  const [gameSettingsOpen, setGameSettingsOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [gemPacksOpen, setGemPacksOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<'SLEEVES' | 'EMOTES' | 'BOARDS'>('SLEEVES');
  
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(':cool:');
  const [cardCoverStyle, setCardCoverStyle] = useState<CardCoverStyle>('RED');
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('EMERALD');
  const [spQuickFinish, setSpQuickFinish] = useState(true);
  const [sleeveEffectsEnabled, setSleeveEffectsEnabled] = useState(true);
  const [playAnimationsEnabled, setPlayAnimationsEnabled] = useState(true);
  const [autoPassEnabled, setAutoPassEnabled] = useState(() => {
    const saved = localStorage.getItem('thirteen_auto_pass_enabled');
    return saved === 'true';
  });
  const [turnTimerSetting, setTurnTimerSetting] = useState(0);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('MEDIUM');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socialFilter, setSocialFilter] = useState<SocialFilter>('UNMUTED');
  const [sessionMuted, setSessionMuted] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState('');
  const [loadingStatus, setLoadingStatus] = useState('Shuffling deck...');
  const [showGuestHint, setShowGuestHint] = useState(false);
  const [migrationToast, setMigrationToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [migrationSuccessData, setMigrationSuccessData] = useState<{
    show: boolean;
    migratedGems: number;
    bonusGems: number;
    migratedXp: number;
    migratedCoins: number;
    newGemBalance: number;
  } | null>(null);
  
  const [mpGameState, setMpGameState] = useState<GameState | null>(null);
  const [mpMyHand, setMpMyHand] = useState<Card[]>([]);
  
  const [spGameState, setSpGameState] = useState<GameState | null>(null);
  const [spMyHand, setSpMyHand] = useState<Card[]>([]);
  const [spOpponentHands, setSpOpponentHands] = useState<Record<string, Card[]>>({});
  const [spChops, setSpChops] = useState(0);
  const [spBombs, setSpBombs] = useState(0);
  const [spLastCardRank, setSpLastCardRank] = useState(0);
  
  const [error, setError] = useState<string | null>(null);
  const [lastMatchRewards, setLastMatchRewards] = useState<{ xp: number, coins: number, diff: AiDifficulty, bonus: boolean, totalXpAfter: number, speedBonus?: { gold: number; xp: number } } | null>(null);

  const isLoggingOutRef = useRef(false);
  const initialSyncCompleteRef = useRef(false);
  const loadingProfileInProgressRef = useRef(false);
  const aiThinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializingRef = useRef(false);
  const authListenerSetupRef = useRef(false);
  const didInitRef = useRef(false); // Guard to ensure auth check only runs once
  const manualRecoveryInProgressRef = useRef(false); // Guard to prevent multiple manual recovery attempts

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
    if (gameMode !== 'SINGLE_PLAYER' || !spGameState || spGameState.status !== GameStatus.PLAYING) return;
    const currentPlayerId = spGameState.currentPlayerId;
    const isBot = currentPlayerId?.startsWith('b');
    if (isBot) {
      if (aiThinkingTimerRef.current) clearTimeout(aiThinkingTimerRef.current);
      aiThinkingTimerRef.current = setTimeout(() => {
        const botHand = spOpponentHands[currentPlayerId!];
        if (!botHand) return;
        const move = findBestMove(botHand, spGameState.currentPlayPile, !!spGameState.isFirstTurnOfGame, aiDifficulty);
        if (move) {
          handleLocalPlay(currentPlayerId!, move);
        } else {
          if (spGameState.currentPlayPile.length > 0) {
            handleLocalPass(currentPlayerId!);
          } else {
            const sorted = sortCards(botHand);
            handleLocalPlay(currentPlayerId!, [sorted[0]]);
          }
        }
      }, 1000 + Math.random() * 1000);
    }
    return () => {
      if (aiThinkingTimerRef.current) clearTimeout(aiThinkingTimerRef.current);
    };
  }, [spGameState?.currentPlayerId, spGameState?.status, spGameState?.currentPlayPile?.length, gameMode, spOpponentHands, aiDifficulty]);

  // Initialize AdMob and pre-load ads on app start
  // CRITICAL: This is completely non-blocking - app renders regardless of AdMob status
  useEffect(() => {
    // Use setTimeout to ensure this doesn't block initial render
    setTimeout(() => {
      const initializeAds = async () => {
        try {
          // These calls are now guaranteed to never throw or block
          await adService.initialize();
          await adService.load();
        } catch (error) {
          // This should never happen now, but just in case
          console.error('Failed to initialize ads (non-blocking):', error);
        }
      };
      initializeAds();
    }, 0);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (view === 'WELCOME' && !gameMode) return;
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
  }, [gameMode, myPersistentId, view]);

  // URL Guard: Prevent redirects when OAuth hash is present
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      console.log('App: Step 17 - OAuth redirect detected in URL hash');
      console.log('App: Step 17b - URL Guard active - preventing redirects while Supabase processes hash');
      setLoadingStatus('Completing sign in...');
      
      // Store original location to prevent navigation away
      const originalLocation = window.location.href;
      
      // Monitor for any navigation attempts
      const checkNavigation = () => {
        // If hash still contains access_token, don't allow navigation
        if (window.location.hash.includes('access_token')) {
          // If someone tries to navigate away, log it
          if (window.location.href !== originalLocation && !window.location.href.includes('access_token')) {
            console.warn('App: URL Guard - Navigation attempt detected while processing OAuth, blocking');
            // Don't actually block, but log for debugging
          }
        }
      };
      
      // Clean up hash after Supabase processes it (but don't redirect)
      const cleanupHash = () => {
        // Only clean hash if auth is complete, not during processing
        if (authChecked && hasSession) {
          if (window.location.hash.includes('access_token')) {
            console.log('App: Cleaning up OAuth hash after successful auth');
            // Use replaceState to clean hash without navigation
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }
      };
      
      // Check periodically if auth is complete
      const checkInterval = setInterval(() => {
        checkNavigation();
        if (authChecked && hasSession) {
          cleanupHash();
          clearInterval(checkInterval);
        }
      }, 100);
      
      return () => {
        clearInterval(checkInterval);
      };
    } else {
      console.log('App: Step 18 - No OAuth hash found in URL');
    }
  }, [authChecked, hasSession]);

  useEffect(() => {
    // IMMEDIATE HASH EXTRACTION: Manual session recovery at the very top (Step 6)
    // This bypasses the onAuthStateChange listener which is hanging
    
    // Guard: Prevent multiple manual recovery attempts
    if (manualRecoveryInProgressRef.current) {
      console.log('MANUAL RECOVERY: Already in progress, skipping...');
      return;
    }
    
    // Guard: If we already have a session, skip manual recovery
    if (session && hasSession) {
      console.log('MANUAL RECOVERY: Session already exists, skipping...');
      return;
    }
    
    // Guard: Check global auth state - if session was already set there, use it
    const manualRecoverySession = globalAuthState.getSession();
    if (manualRecoverySession) {
      console.log('MANUAL RECOVERY: Global session found, using it instead of parsing hash');
      setSession(manualRecoverySession);
      setAuthChecked(true);
      setHasSession(true);
      setIsGuest(false);
      setIsProcessingOAuth(false);
      window.history.replaceState({}, document.title, '/');
      return;
    }
    
    const hash = window.location.hash;
    const hasAccessToken = hash.includes('access_token');
    const hasIdToken = hash.includes('id_token');
    
    if (hasAccessToken || hasIdToken) {
      console.log('MANUAL RECOVERY: Attempting to force session from hash...');
      console.log('App: Step 6 - Immediate hash extraction detected');
      
      // Set processing flag immediately to block UI (persist in localStorage for remounts)
      manualRecoveryInProgressRef.current = true;
      localStorage.setItem('thirteen_manual_recovery', 'true');
      setIsProcessingOAuth(true);
      setLoadingStatus('Completing sign in...');
      
      // Parse hash parameters manually
      try {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const idToken = hashParams.get('id_token');
        
        if (accessToken) {
          console.log('MANUAL RECOVERY: Found access_token in hash, setting session manually...');
          
          // Manual setSession - bypasses automatic listener
          // NOTE: Only use accessToken, not idToken (idToken is for verification, not auth)
          console.log('MANUAL RECOVERY: Calling setSession with tokens...', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken
          });
          
          // Add timeout to prevent hanging - wrap in async function for better error handling
          (async () => {
            try {
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('setSession timeout after 10 seconds')), 10000);
              });
              
              const result: any = await Promise.race([
                supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || ''
                }),
                timeoutPromise
              ]);
              
              const { data, error } = result;
              console.log('MANUAL RECOVERY: setSession response:', {
                hasError: !!error,
                errorMessage: error?.message,
                hasData: !!data,
                hasSession: !!data?.session,
                sessionUserId: data?.session?.user?.id
              });
              
              manualRecoveryInProgressRef.current = false;
              localStorage.removeItem('thirteen_manual_recovery');
              
              if (!error && data?.session) {
                console.log('MANUAL RECOVERY: SUCCESS - Session set manually from hash');
                
                // NUCLEAR STATE FLIP: Immediately set flags
                setSession(data.session);
                setAuthChecked(true);
                setHasSession(true);
                setIsGuest(false);
                setIsProcessingOAuth(false);
                
                // Cleanup URL: Remove hash to prevent reprocessing
                window.history.replaceState({}, document.title, '/');
                console.log('MANUAL RECOVERY: URL hash cleaned up');
                
                // Process the session
                const meta = data.session.user?.user_metadata || {};
                const googleName = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
                if (!playerName) setPlayerName(googleName.toUpperCase());
                
                transferGuestData(data.session.user.id).then(() => {
                  supabase.from('profiles').select('id').eq('id', data.session.user.id).maybeSingle().then(({ data: existingProfile }) => {
                    loadProfile(data.session.user.id, !existingProfile);
                  });
                });
                
                isInitializingRef.current = false;
              } else {
                console.warn('MANUAL RECOVERY: setSession failed:', error);
                setIsProcessingOAuth(false);
                // Fallback to normal OAuth bypass logic will run on next render
              }
            } catch (err: any) {
              console.error('MANUAL RECOVERY: Error setting session:', err);
              manualRecoveryInProgressRef.current = false;
              localStorage.removeItem('thirteen_manual_recovery');
              setIsProcessingOAuth(false);
              // Fallback to normal OAuth bypass logic will run on next render
            }
          })();
          
          // Exit early - don't run fallback logic while manual recovery is processing
          return;
        } else {
          // No accessToken found - reset flags and let normal flow handle it
          console.warn('MANUAL RECOVERY: No accessToken found in hash, only idToken:', !!idToken);
          manualRecoveryInProgressRef.current = false;
          localStorage.removeItem('thirteen_manual_recovery');
          setIsProcessingOAuth(false);
        } else {
          manualRecoveryInProgressRef.current = false;
          localStorage.removeItem('thirteen_manual_recovery');
          setIsProcessingOAuth(false);
        }
      } catch (error) {
        console.error('MANUAL RECOVERY: Error parsing hash:', error);
        manualRecoveryInProgressRef.current = false;
        localStorage.removeItem('thirteen_manual_recovery');
        setIsProcessingOAuth(false);
        // Continue to fallback logic below
      }
    }
    
    // Check if manual recovery is in progress from previous mount
    if (localStorage.getItem('thirteen_manual_recovery') === 'true') {
      console.log('MANUAL RECOVERY: Detected in-progress recovery from previous mount');
      manualRecoveryInProgressRef.current = true;
      setIsProcessingOAuth(true);
      setLoadingStatus('Completing sign in...');
    }
    
    // APP-LEVEL BYPASS: If OAuth hash/code is present, force loading screen and block state updates
    
    const search = window.location.search;
    const hasOAuthHash = hash.includes('access_token') || hash.includes('code=');
    const hasOAuthCode = search.includes('code=');
    
    if (hasOAuthHash || hasOAuthCode) {
      console.log('App: OAuth bypass active - URL contains access_token or code');
      console.log('App: Forcing loading screen, blocking state updates until session confirmed');
      setIsProcessingOAuth(true);
      setLoadingStatus('Completing sign in...');
      
      // ESCAPE HATCH: 10-second timeout to prevent infinite loop
      const escapeHatchTimeout = setTimeout(() => {
        if (isProcessingOAuth) {
          console.error('App: ESCAPE HATCH - Auth service timeout after 10 seconds');
          setError('Auth Service Timeout. Please try refreshing or check your internet.');
          setIsProcessingOAuth(false);
          setAuthChecked(true);
          setHasSession(false);
          setIsGuest(true);
          setLoadingStatus('Auth Service Timeout. Please try refreshing or check your internet.');
          isInitializingRef.current = false;
        }
      }, 10000);
      
      // Wait for session with timeout
      const waitForSession = async () => {
        const maxWaitTime = 10000; // 10 seconds max
        const checkInterval = 500; // Check every 500ms
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
          const { data, error } = await supabase.auth.getSession();
          
          if (!error && data?.session) {
            console.log('App: OAuth bypass - Session confirmed!');
            clearTimeout(escapeHatchTimeout);
            globalAuthState.setSession(data.session);
            globalAuthState.setAuthChecked(true);
            globalAuthState.setHasSession(true);
            setSession(data.session);
            setAuthChecked(true);
            setHasSession(true);
            setIsGuest(false);
            setIsProcessingOAuth(false);
            
            // Process the session
            const meta = data.session.user.user_metadata || {};
            const googleName = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
            if (!playerName) setPlayerName(googleName.toUpperCase());
            
            transferGuestData(data.session.user.id).then(() => {
              supabase.from('profiles').select('id').eq('id', data.session.user.id).maybeSingle().then(({ data: existingProfile }) => {
                loadProfile(data.session.user.id, !existingProfile);
              });
            });
            
            isInitializingRef.current = false;
            return;
          }
          
          // Check if global session was set by the global listener
          const sessionFromGlobal = globalAuthState.getSession();
          if (sessionFromGlobal) {
            console.log('App: OAuth bypass - Global session found!');
            clearTimeout(escapeHatchTimeout);
            setSession(sessionFromGlobal);
            setAuthChecked(true);
            setHasSession(true);
            setIsGuest(false);
            setIsProcessingOAuth(false);
            
            const meta = sessionFromGlobal.user?.user_metadata || {};
            const googleName = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
            if (!playerName) setPlayerName(googleName.toUpperCase());
            
            transferGuestData(sessionFromGlobal.user.id).then(() => {
              supabase.from('profiles').select('id').eq('id', sessionFromGlobal.user.id).maybeSingle().then(({ data: existingProfile }) => {
                loadProfile(sessionFromGlobal.user.id, !existingProfile);
              });
            });
            
            isInitializingRef.current = false;
            return;
          }
          
          // Wait before next check
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        // Timeout - session not found
        console.warn('App: OAuth bypass - Timeout waiting for session');
        clearTimeout(escapeHatchTimeout);
        setIsProcessingOAuth(false);
        setAuthChecked(true);
        setHasSession(false);
        setIsGuest(true);
        setError('Auth Service Timeout. Please try refreshing or check your internet.');
        setLoadingStatus('Auth Service Timeout. Please try refreshing or check your internet.');
        isInitializingRef.current = false;
      };
      
      waitForSession();
      return; // Exit early, don't proceed with normal auth flow
    }
    
    // CRITICAL: Check global auth state FIRST (before any React lifecycle)
    // This catches sessions that were processed outside React
    const globalSession = globalAuthState.getSession();
    if (globalSession) {
      console.log('GLOBAL: Session caught before mount - using global session');
      console.log('App: Step 9a - Global session found, setting state immediately');
      setSession(globalSession);
      setAuthChecked(globalAuthState.authChecked);
      setHasSession(globalAuthState.hasSession);
      setIsGuest(false);
      setLoadingStatus('Syncing profile...');
      
      // Process the global session
      const meta = globalSession.user?.user_metadata || {};
      const googleName = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
      if (!playerName) setPlayerName(googleName.toUpperCase());
      
      // Load profile asynchronously
      transferGuestData(globalSession.user.id).then(() => {
        supabase.from('profiles').select('id').eq('id', globalSession.user.id).maybeSingle().then(({ data: existingProfile }) => {
          loadProfile(globalSession.user.id, !existingProfile);
        });
      });
      
      isInitializingRef.current = false;
      return;
    }
    
    // If global auth was checked but no session, use that state
    if (globalAuthState.authChecked && !globalSession) {
      console.log('App: Step 9b - Global auth checked, no session - using guest mode');
      setAuthChecked(true);
      setHasSession(false);
      setIsGuest(true);
      setLoadingStatus('Preparing guest profile...');
      isInitializingRef.current = false;
      return;
    }
    
    // Initialization Guard: Use didInitRef to ensure auth check only runs exactly once
    if (didInitRef.current) {
      console.log('App: Auth already initialized, skipping duplicate init');
      return;
    }
    
    // Prevent multiple initializations
    if (isInitializingRef.current) {
      console.log('App: Already initializing, skipping duplicate init');
      return;
    }
    
    didInitRef.current = true;
    isInitializingRef.current = true;
    console.log('App: Step 9 - Starting auth check...');
    setLoadingStatus('Checking credentials...');
    
    // Timeout safety: after 6s, force authChecked to true so user can at least click 'Enter as Guest'
    const timeoutId = setTimeout(() => {
      if (!authChecked) {
        console.warn('App: Auth Timeout - forcing authChecked to true after 6s');
        setAuthChecked(true);
        setShowGuestHint(true);
        setLoadingStatus('You can enter as Guest.');
      }
    }, 6000);
    
    // Explicit session recovery: Check for session immediately
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('App: ERROR - Failed to get session:', error);
          console.log('App: Step 10b - No session found (error), forcing guest mode');
          setSession(null);
          setLoadingStatus('Network hiccup. You can enter as Guest.');
          setAuthChecked(true); // Force result so user can proceed
          setHasSession(false);
          setIsGuest(false);
          isInitializingRef.current = false;
          return;
        }
        
        if (data?.session) {
          console.log('App: Step 10a - Session found, user:', data.session.user.id);
          console.log('App: Step 17 - Session detected from URL');
          setSession(data.session);
          setAuthChecked(true);
          setHasSession(true);
          setIsGuest(false);
          console.log('App: Step 11 - Auth checked, session set');
          console.log('App: Step 12 - User found, processing user data...');
          setLoadingStatus('Syncing profile...');
          const meta = data.session.user.user_metadata || {};
          const googleName = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
          if (!playerName) setPlayerName(googleName.toUpperCase());
          console.log('App: Step 13 - Transferring guest data...');
          await transferGuestData(data.session.user.id);
          console.log('App: Step 14 - Checking if user is new...');
          const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', data.session.user.id).maybeSingle();
          const isNewUser = !existingProfile;
          console.log('App: Step 15 - Loading profile, isNewUser:', isNewUser);
          loadProfile(data.session.user.id, isNewUser);
          isInitializingRef.current = false;
        } else {
          console.log('App: Step 10b - No session found, forcing guest mode');
          console.log('App: Step 18 - No session found in URL');
          setLoadingStatus('Preparing guest profile...');
          setSession(null);
          setAuthChecked(true); // Force result so user can proceed
          setHasSession(false);
          setIsGuest(true);
          console.log('App: Step 12 - No user session, will show auth screen or guest mode');
          isInitializingRef.current = false;
        }
      } catch (error: any) {
        console.error('App: ERROR - Failed to get session:', error);
        console.log('App: Step 10b - No session found (catch), forcing guest mode');
        setLoadingStatus('Network hiccup. You can enter as Guest.');
        setSession(null);
        setAuthChecked(true); // Force result so user can proceed
        setHasSession(false);
        setIsGuest(false);
        isInitializingRef.current = false;
      }
    };
    
    checkSession();

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array - only run once on mount

  // Set up auth state change listener with useLayoutEffect to catch session before first paint
  useLayoutEffect(() => {
    // Guard: Only set up listener once
    if (authListenerSetupRef.current) {
      console.log('App: Auth listener already set up, skipping duplicate setup');
      return;
    }
    
    console.log('App: Step 16 - Setting up auth state change listener (useLayoutEffect)...');
    authListenerSetupRef.current = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Debug logging as requested
      console.log('SUPABASE AUTH EVENT:', event, session);
      
      console.log('App: Auth Event Received:', event, session ? 'Session exists' : 'No session');
      console.log('App: Step 17 - Auth state changed:', event, session ? 'Session exists' : 'No session');
      
      // CRITICAL: For SIGNED_IN event, immediately set flags before doing anything else
      if (event === 'SIGNED_IN' && session) {
        console.log('App: SIGNED_IN event detected - immediately setting auth flags');
        setAuthChecked(true);
        setHasSession(true);
        setSession(session);
        setIsGuest(false);
        console.log('App: Auth flags set immediately, now processing profile...');
      } else {
        setSession(session);
      }
      
      if (session?.user) {
        // If not SIGNED_IN, still set flags but after session check
        if (event !== 'SIGNED_IN') {
          setIsGuest(false);
          setAuthChecked(true);
          setHasSession(true);
        }
        
        setLoadingStatus('Syncing profile...');
        const meta = session.user.user_metadata || {};
        const googleName = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
        if (!playerName) setPlayerName(googleName.toUpperCase());
        
        // Only do async operations after flags are set
        await transferGuestData(session.user.id);
        
        // Guest-to-Permanent Migration: Check for guest progress and migrate
        // Only migrate if isMigrating flag is set (user clicked "Link Account")
        const isMigrating = localStorage.getItem('thirteen_is_migrating') === 'true';
        if ((event === 'SIGNED_UP' || event === 'SIGNED_IN') && isMigrating) {
          const guestProgress = getGuestProgress();
          if (guestProgress && (guestProgress.gems > 0 || guestProgress.xp > 0 || guestProgress.coins > 0)) {
            console.log('Guest migration: Found guest progress:', guestProgress);
            setLoadingStatus('Migrating your progress...');
            
            const migrationResult = await migrateGuestData(
              session.user.id,
              guestProgress.gems,
              guestProgress.xp,
              guestProgress.coins
            );
            
            // Clear migration flag
            localStorage.removeItem('thirteen_is_migrating');
            
            if (migrationResult.success) {
              console.log('Guest migration: Successfully migrated progress');
              clearGuestProgress();
              
              // Show success modal with breakdown
              if (migrationResult.migratedGems !== undefined || migrationResult.bonusGems !== undefined) {
                setMigrationSuccessData({
                  show: true,
                  migratedGems: migrationResult.migratedGems || 0,
                  bonusGems: migrationResult.bonusGems || 0,
                  migratedXp: migrationResult.migratedXp || 0,
                  migratedCoins: migrationResult.migratedCoins || 0,
                  newGemBalance: migrationResult.newGemBalance || 0,
                });
              } else {
                // Fallback to toast if breakdown data not available
                setMigrationToast({
                  show: true,
                  message: 'Progress successfully synced to your new account!',
                  type: 'success'
                });
                setTimeout(() => {
                  setMigrationToast({ show: false, message: '', type: 'success' });
                }, 4000);
              }
            } else {
              console.warn('Guest migration: Failed to migrate:', migrationResult.error);
              // Don't show error toast for expected failures (account too old)
              if (migrationResult.error?.includes('not new')) {
                // Account is older than 5 minutes, clear guest data silently
                clearGuestProgress();
              } else {
                setMigrationToast({
                  show: true,
                  message: 'Could not migrate progress. Your account may be too old.',
                  type: 'error'
                });
                setTimeout(() => {
                  setMigrationToast({ show: false, message: '', type: 'error' });
                }, 4000);
              }
            }
          } else {
            // No guest progress to migrate, just clear the flag
            localStorage.removeItem('thirteen_is_migrating');
          }
        }
        
        if (event === 'SIGNED_IN') {
          const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle();
          loadProfile(session.user.id, !existingProfile);
        } else {
          loadProfile(session.user.id, false);
        }
      } else {
        // Force a Result: If the event is INITIAL_SESSION and no session is found, 
        // call setAuthChecked(true) immediately so the app doesn't hang
        if (event === 'INITIAL_SESSION') {
          console.log('App: INITIAL_SESSION with no session - forcing authChecked to true');
          setAuthChecked(true);
          setHasSession(false);
          setIsGuest(true);
          setLoadingStatus('Ready to play');
        } else if (!isGuest) {
          setHasSession(false);
          setProfile(null);
          initialSyncCompleteRef.current = false;
        }
      }
    });
    
    return () => {
      console.log('App: Step 18 - Cleaning up auth state change listener');
      subscription.unsubscribe();
      authListenerSetupRef.current = false;
    };
  }, []); // Empty dependency array - only run once on mount

  const loadProfile = async (uid: string, isNewUser: boolean = false) => {
    console.log('App: Step 19 - Loading profile for user:', uid, 'isNewUser:', isNewUser);
    loadingProfileInProgressRef.current = true;
    initialSyncCompleteRef.current = false;
    const meta = session?.user?.user_metadata || {};
    // Use Google metadata: full_name, name, or display_name
    const baseUsername = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
    console.log('App: Step 20 - Fetching profile data...');
    const data = await fetchProfile(uid, playerAvatar, baseUsername);
    console.log('App: Step 21 - Profile data fetched:', data ? 'Profile exists' : 'No profile');
    if (data) {
      if (data.username && (!playerName || playerName.includes('AGENT'))) setPlayerName(data.username);
      
      // Show welcome toast for new users
      if (isNewUser && data.username) {
        setWelcomeUsername(data.username);
        setShowWelcomeToast(true);
      }
      
      if (data.avatar_url) {
        console.log(`🖼️ Loading avatar from profile: ${data.avatar_url} (was: ${playerAvatar})`);
        setPlayerAvatar(data.avatar_url);
      } else {
        console.log(`⚠️ No avatar_url in profile, keeping current: ${playerAvatar}`);
      }
      if (data.active_sleeve || data.equipped_sleeve) setCardCoverStyle((data.active_sleeve || data.equipped_sleeve) as CardCoverStyle);
      if (data.active_board || data.equipped_board) setBackgroundTheme((data.active_board || data.equipped_board) as BackgroundTheme);
      if (data.sfx_enabled !== undefined) setSoundEnabled(data.sfx_enabled);
      if (data.turbo_enabled !== undefined) setSpQuickFinish(data.turbo_enabled);
      if (data.sleeve_effects_enabled !== undefined) setSleeveEffectsEnabled(data.sleeve_effects_enabled);
      if (data.play_animations_enabled !== undefined) setPlayAnimationsEnabled(data.play_animations_enabled);
      if (data.auto_pass_enabled !== undefined) {
        setAutoPassEnabled(data.auto_pass_enabled);
        localStorage.setItem('thirteen_auto_pass_enabled', data.auto_pass_enabled ? 'true' : 'false');
      }
      if (data.turn_timer_setting !== undefined) setTurnTimerSetting(data.turn_timer_setting);
      setProfile(data);
      console.log('App: Step 22 - Profile set in state');
    }
    setTimeout(() => { 
      initialSyncCompleteRef.current = true;
      loadingProfileInProgressRef.current = false;
      console.log('App: Step 23 - Initial sync complete');
    }, 800);
  };

  useEffect(() => {
    if (isGuest && !session) {
      console.log('App: Step 24 - Loading guest profile...');
      const data = fetchGuestProfile();
      setProfile(data);
      if (data.username && !playerName) setPlayerName(data.username);
      if (data.avatar_url) setPlayerAvatar(data.avatar_url);
      if (data.active_sleeve) setCardCoverStyle(data.active_sleeve as CardCoverStyle);
      if (data.active_board) setBackgroundTheme(data.active_board as BackgroundTheme);
      if (data.sfx_enabled !== undefined) setSoundEnabled(data.sfx_enabled);
      if (data.turbo_enabled !== undefined) setSpQuickFinish(data.turbo_enabled);
      if (data.sleeve_effects_enabled !== undefined) setSleeveEffectsEnabled(data.sleeve_effects_enabled);
      if (data.play_animations_enabled !== undefined) setPlayAnimationsEnabled(data.play_animations_enabled);
      if (data.auto_pass_enabled !== undefined) {
        setAutoPassEnabled(data.auto_pass_enabled);
        localStorage.setItem('thirteen_auto_pass_enabled', data.auto_pass_enabled ? 'true' : 'false');
      }
      if (data.turn_timer_setting !== undefined) setTurnTimerSetting(data.turn_timer_setting);
      initialSyncCompleteRef.current = true;
      console.log('App: Step 25 - Guest profile loaded');
    }
  }, [isGuest, session, playerName]);

  useEffect(() => {
    const userId = session?.user?.id || (isGuest ? 'guest' : null);
    if (!authChecked || !userId || !profile || !initialSyncCompleteRef.current || isLoggingOutRef.current) return;
    const updates: Partial<UserProfile> = {};
    if (playerAvatar !== profile.avatar_url) updateProfileAvatar(userId, playerAvatar);
    if (cardCoverStyle !== profile.active_sleeve) { updates.active_sleeve = cardCoverStyle; updates.equipped_sleeve = cardCoverStyle; }
    if (backgroundTheme !== profile.active_board) { updates.active_board = backgroundTheme; updates.equipped_board = backgroundTheme; }
    if (soundEnabled !== profile.sfx_enabled) updates.sfx_enabled = soundEnabled;
    if (spQuickFinish !== profile.turbo_enabled) updates.turbo_enabled = spQuickFinish;
    if (sleeveEffectsEnabled !== profile.sleeve_effects_enabled) updates.sleeve_effects_enabled = sleeveEffectsEnabled;
    if (playAnimationsEnabled !== profile.play_animations_enabled) updates.play_animations_enabled = playAnimationsEnabled;
    if (autoPassEnabled !== profile.auto_pass_enabled) {
      updates.auto_pass_enabled = autoPassEnabled;
      localStorage.setItem('thirteen_auto_pass_enabled', autoPassEnabled ? 'true' : 'false');
    }
    if (turnTimerSetting !== profile.turn_timer_setting) updates.turn_timer_setting = turnTimerSetting;
    if (Object.keys(updates).length > 0) {
      updateProfileSettings(userId, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [playerAvatar, cardCoverStyle, backgroundTheme, soundEnabled, spQuickFinish, sleeveEffectsEnabled, playAnimationsEnabled, autoPassEnabled, turnTimerSetting, session, authChecked, profile, isGuest]);

  const handleSignOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    isLoggingOutRef.current = true;
    initialSyncCompleteRef.current = false;
    if (session) await supabase.auth.signOut();
    setIsGuest(false); setProfile(null); setPlayerName(''); setPlayerAvatar(':cool:'); setCardCoverStyle('RED'); setBackgroundTheme('EMERALD'); setSoundEnabled(true); setSpQuickFinish(true); setSleeveEffectsEnabled(true); setPlayAnimationsEnabled(true); setView('WELCOME'); setHubState({ open: false, tab: 'PROFILE' }); setGameSettingsOpen(false); setStoreOpen(false); setGemPacksOpen(false); setInventoryOpen(false); setFriendsOpen(false); setGameMode(null);
    setTimeout(() => { isLoggingOutRef.current = false; }, 500);
  };

  const handleOpenStore = (tab?: 'SLEEVES' | 'EMOTES' | 'BOARDS' | 'GEMS') => { 
    if (tab === 'GEMS') {
      setGemPacksOpen(true);
    } else {
      if (tab) setStoreTab(tab as 'SLEEVES' | 'EMOTES' | 'BOARDS'); 
      setStoreOpen(true); 
    }
  };

  const handleOpenGemPacks = () => setGemPacksOpen(true);
  const handleOpenFriends = () => setFriendsOpen(true);

  const handleRefreshProfile = () => {
    if (session?.user) {
      loadProfile(session.user.id);
    } else if (isGuest) {
      const data = fetchGuestProfile();
      setProfile(data);
    }
  };

  useEffect(() => { audioService.setEnabled(soundEnabled); }, [soundEnabled]);

  const triggerMatchEndTransition = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => { setView('VICTORY'); setIsTransitioning(false); }, 2500);
  }, []);

  useEffect(() => {
    const onGameState = async (state: GameState) => {
      if (view === 'WELCOME' && !gameMode) return;
      const prevStatus = mpGameState?.status;
      setMpGameState(state);
      if (state.roomId !== 'LOCAL') {
         localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: state.roomId, playerId: myPersistentId, timestamp: Date.now() }));
      }
      if (state.status === GameStatus.PLAYING) {
        setView('GAME_TABLE');
      } else if (state.status === GameStatus.FINISHED) {
        // Check if we were just playing or already on game table
        // Also prevent duplicate processing if we already processed this finished state
        const alreadyProcessed = prevStatus === GameStatus.FINISHED;
        const shouldShowVictory = (prevStatus === GameStatus.PLAYING || view === 'GAME_TABLE' || prevStatus === null || prevStatus === undefined) && !alreadyProcessed;
        
        if (shouldShowVictory) {
          const myRank = state.players.find(p => p.id === myPersistentId)?.finishedRank || 4;
          // Extract speed bonuses
          const mySpeedBonus = state.speedBonuses?.[myPersistentId] || { gold: 0, xp: 0 };
          // Note: In MP, we lack precise metadata currently, defaults used.
          const result = await recordGameResult(myRank, false, 'MEDIUM', isGuest, profile, { chopsInMatch: 0, bombsInMatch: 0, lastCardRank: 15 });
          // Add speed bonuses to rewards
          const totalCoins = result.coinsGained + mySpeedBonus.gold;
          const totalXp = result.xpGained + mySpeedBonus.xp;
          const newTotalXp = result.newTotalXp + mySpeedBonus.xp;
          setLastMatchRewards({ 
            xp: result.xpGained, 
            coins: result.coinsGained, 
            diff: 'MEDIUM', 
            bonus: result.xpBonusApplied, 
            totalXpAfter: result.newTotalXp,
            speedBonus: mySpeedBonus
          });
          
          setProfile(prev => prev ? { 
            ...prev, 
            xp: newTotalXp, 
            coins: prev.coins + totalCoins,
            event_stats: result.updatedStats || prev.event_stats
          } : null);

          // Always show victory screen when game finishes
          if (view === 'GAME_TABLE') {
            triggerMatchEndTransition();
          } else {
            // If not on GAME_TABLE, go directly to victory screen
            setView('VICTORY');
          }
        } else if (view !== 'VICTORY' && !alreadyProcessed) {
          // Fallback: If game is finished but we're not on victory screen, show it
          // This handles edge cases where the transition check above might have failed
          console.warn('Game finished but victory screen not shown - forcing transition', { prevStatus, view, alreadyProcessed, status: state.status });
          setView('VICTORY');
        }
      } else if (state.status === GameStatus.LOBBY) {
        setView('LOBBY');
      }
    };
    const onPlayerHand = (cards: Card[]) => setMpMyHand(cards);
    socket.on(SocketEvents.GAME_STATE, onGameState);
    socket.on(SocketEvents.PLAYER_HAND, onPlayerHand);
    socket.on(SocketEvents.ERROR, (m) => { if (m === 'Session Expired') localStorage.removeItem(SESSION_KEY); setError(m); setTimeout(() => setError(null), 3000); });
    return () => {
      socket.off(SocketEvents.GAME_STATE); socket.off(SocketEvents.PLAYER_HAND); socket.off(SocketEvents.ERROR);
    };
  }, [view, gameMode, triggerMatchEndTransition, myPersistentId, mpGameState?.status, mpMyHand.length, isGuest, session?.user?.id, profile]);

  const handleLocalPass = (pid: string) => {
    setSpGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING || prev.currentPlayerId !== pid) return prev;
      if (prev.currentPlayPile.length === 0) return prev;
      const players = prev.players.map(p => p.id === pid ? { ...p, hasPassed: true } : p);
      let nextIndex = (prev.players.findIndex(p => p.id === pid) + 1) % prev.players.length;
      let loopCount = 0;
      while ((players[nextIndex].hasPassed || players[nextIndex].finishedRank) && loopCount < players.length) { nextIndex = (nextIndex + 1) % prev.players.length; loopCount++; }
      let finalPlayPile = prev.currentPlayPile;
      let nextPlayerId = players[nextIndex].id;
      if (nextPlayerId === prev.lastPlayerToPlayId) {
        finalPlayPile = []; players.forEach(p => p.hasPassed = false);
        if (players[nextIndex].finishedRank) { 
          let leadIndex = nextIndex;
          let innerLoop = 0;
          while (players[leadIndex].finishedRank && innerLoop < players.length) { leadIndex = (leadIndex + 1) % prev.players.length; innerLoop++; } 
          nextPlayerId = players[leadIndex].id; 
        }
      }
      return { ...prev, players, currentPlayerId: nextPlayerId, currentPlayPile: finalPlayPile, turnEndTime: undefined };
    });
    audioService.playPass();
  };

  const handleLocalPlay = (pid: string, cards: Card[]) => {
    let playError: string | null = null;
    const sortedCards = sortCards(cards); 
    setSpGameState(prev => {
      if (!prev || prev.status !== GameStatus.PLAYING || prev.currentPlayerId !== pid) return prev;
      const res = validateMove(sortedCards, prev.currentPlayPile, !!prev.isFirstTurnOfGame, pid === 'me' ? spMyHand : spOpponentHands[pid]);
      if (!res.isValid) { playError = res.reason; return prev; }
      
      let currentChops = spChops;
      let currentBombs = spBombs;
      const combo = getComboType(sortedCards);
      
      if (pid === 'me') {
        if (['QUAD', 'BOMB', '4_PAIRS'].includes(combo)) {
          currentBombs++; setSpBombs(currentBombs);
        }
        const lastTurn = prev.currentPlayPile[prev.currentPlayPile.length - 1];
        if (lastTurn && ['QUAD', 'BOMB', '4_PAIRS'].includes(combo) && lastTurn.cards[0].rank === Rank.Two) {
           currentChops++; setSpChops(currentChops);
        }
      }

      const players = prev.players.map(p => { if (p.id === pid) { const newCount = p.cardCount - sortedCards.length; return { ...p, cardCount: newCount }; } return p; });
      if (pid === 'me') {
        const newHand = spMyHand.filter(c => !sortedCards.some(rc => rc.id === c.id));
        setSpMyHand(newHand);
        if (newHand.length === 0) {
          setSpLastCardRank(sortedCards[sortedCards.length - 1].rank);
        }
      } else {
        setSpOpponentHands(prevHands => ({ ...prevHands, [pid]: prevHands[pid].filter(c => !sortedCards.some(rc => rc.id === c.id)) }));
      }
      
      const activeMover = players.find(p => p.id === pid)!;
      let finalStatus: GameStatus = prev.status;
      let finishedPlayers = [...prev.finishedPlayers];
      if (activeMover.cardCount === 0) {
          finishedPlayers.push(pid); activeMover.finishedRank = finishedPlayers.length;
          const stillPlaying = players.filter(p => !p.finishedRank);
          if (spQuickFinish && pid === 'me') {
             const remainingSorted = [...stillPlaying].sort((a, b) => a.cardCount - b.cardCount);
             const baseRank = finishedPlayers.length;
             remainingSorted.forEach((p, idx) => { const pObj = players.find(pl => pl.id === p.id)!; pObj.finishedRank = baseRank + idx + 1; });
             finalStatus = GameStatus.FINISHED;
          } else if (stillPlaying.length <= 1) {
              if (stillPlaying.length === 1) stillPlaying[0].finishedRank = finishedPlayers.length + 1;
              finalStatus = GameStatus.FINISHED;
          }
      }
      if (finalStatus === GameStatus.FINISHED) {
          const myRank = players.find(p => p.id === 'me')?.finishedRank || 4;
          setTimeout(async () => {
             const result = await recordGameResult(myRank, true, aiDifficulty, isGuest, profile, {
                chopsInMatch: currentChops,
                bombsInMatch: currentBombs,
                lastCardRank: spLastCardRank || 15
             });
             setLastMatchRewards({ xp: result.xpGained, coins: result.coinsGained, diff: aiDifficulty, bonus: result.xpBonusApplied, totalXpAfter: result.newTotalXp });
             
             setProfile(prev => prev ? { 
               ...prev, 
               xp: result.newTotalXp, 
               coins: prev.coins + result.coinsGained,
               event_stats: result.updatedStats || prev.event_stats
             } : null);

             triggerMatchEndTransition();
          }, 1000);
          return { ...prev, players, status: finalStatus, finishedPlayers, currentPlayPile: [], lastPlayerToPlayId: pid, turnEndTime: undefined };
      }
      const newPlayPile = [...prev.currentPlayPile, { playerId: pid, cards: sortedCards, comboType: getComboType(sortedCards) }];
      let nextIndex = (prev.players.findIndex(p => p.id === pid) + 1) % prev.players.length;
      let loopCount = 0;
      while ((players[nextIndex].hasPassed || players[nextIndex].finishedRank) && loopCount < players.length) { nextIndex = (nextIndex + 1) % prev.players.length; loopCount++; }
      let finalPlayerId = players[nextIndex].id;
      let finalPile = newPlayPile;
      if (finalPlayerId === pid) {
          finalPile = []; players.forEach(p => p.hasPassed = false);
          if (activeMover.finishedRank) {
              let leadIdx = nextIndex;
              let innerLoop = 0;
              while (players[leadIdx].finishedRank && innerLoop < players.length) { leadIdx = (leadIdx + 1) % prev.players.length; innerLoop++; }
              finalPlayerId = players[leadIdx].id;
          }
      }
      return { ...prev, players, status: finalStatus, finishedPlayers, currentPlayerId: finalPlayerId, currentPlayPile: finalPile, lastPlayerToPlayId: pid, isFirstTurnOfGame: false, turnEndTime: undefined };
    });
    if (playError) { setError(playError); setTimeout(() => setError(null), 2500); } else { audioService.playPlay(); }
  };

  const handleStart = (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL') => {
    if (mode === 'TUTORIAL') { setView('TUTORIAL'); return; }
    setGameMode(mode);
    if (mode === 'MULTI_PLAYER') {
        connectSocket(); setView('LOBBY');
    } else {
        const hands = dealCards(); setSpMyHand(hands[0]); setSpOpponentHands({ b1: hands[1], b2: hands[2], b3: hands[3] }); setSpChops(0); setSpBombs(0); setSpLastCardRank(0);
        let starterId = 'me'; let minScore = 999;
        hands.forEach((h, i) => { h.forEach(c => { const score = c.rank * 10 + c.suit; if (score < minScore) { minScore = score; starterId = i === 0 ? 'me' : `b${i}`; } }); });
        setSpGameState({
            roomId: 'LOCAL', status: GameStatus.PLAYING, currentPlayerId: starterId, currentPlayPile: [], lastPlayerToPlayId: null, winnerId: null, finishedPlayers: [], isFirstTurnOfGame: true, turnEndTime: undefined,
            players: [
                { id: 'me', name: name.toUpperCase(), avatar: playerAvatar, cardCount: 13, isHost: true },
                { id: 'b1', name: 'TSUBU', avatar: getRandomEmote(), cardCount: 13, isHost: false, isBot: true },
                { id: 'b2', name: 'MUNCHIE', avatar: getRandomEmote(), cardCount: 13, isHost: false, isBot: true },
                { id: 'b3', name: 'KUMA', avatar: getRandomEmote(), cardCount: 13, isHost: false, isBot: true }
            ]
        });
        setView('GAME_TABLE');
    }
  };

  const handleExit = () => { if (gameMode === 'MULTI_PLAYER') disconnectSocket(); setGameMode(null); setView('WELCOME'); setMpGameState(null); setSpGameState(null); localStorage.removeItem(SESSION_KEY); setGameSettingsOpen(false); };

  // Handle guest account linking with migration flag
  const handleLinkAccount = async () => {
    try {
      // Set migration flag in localStorage so auth listener knows to migrate
      localStorage.setItem('thirteen_is_migrating', 'true');
      
      // Trigger Google OAuth
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          flowType: 'implicit',
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        }
      });
      
      if (error) {
        console.error('OAuth error:', error);
        localStorage.removeItem('thirteen_is_migrating');
      }
    } catch (err: any) {
      console.error('Failed to initiate OAuth:', err);
      localStorage.removeItem('thirteen_is_migrating');
    }
  };

  console.log('App: Step 26 - Rendering decision:', { authChecked, isGuest, hasSession: !!session, hasProfile: !!profile });
  
  // Force render fallback: If session exists but authChecked is false, force it to true
  useEffect(() => {
    if (session?.user && !authChecked) {
      console.log('App: Step 27b - Force render: Session detected but authChecked is false, fixing...');
      setAuthChecked(true);
      setIsGuest(false);
    }
  }, [session, authChecked]);
  
  // Allow guest mode even if auth check is still in progress
  // APP-LEVEL BYPASS: Force loading screen during OAuth processing
  if ((!authChecked && !isGuest) || isProcessingOAuth) {
    console.log('App: Step 27 - Waiting for auth check, showing loading...', { 
      authChecked, 
      isGuest, 
      isProcessingOAuth 
    });
    return (
      <LoadingScreen
        status={loadingStatus}
        showGuestButton={!authChecked && !isGuest && showGuestHint && !isProcessingOAuth}
        onEnterGuest={() => { 
          if (!isProcessingOAuth) {
            setAuthChecked(true); 
            setIsGuest(true); 
          }
        }}
      />
    );
  }
  
  if (!session && !isGuest) {
    console.log('App: Step 28 - No session and not guest, showing auth screen');
    return <AuthScreen onPlayAsGuest={() => setIsGuest(true)} />;
  }
  
  console.log('App: Step 29 - Rendering main app content');

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500 selection:text-black">
      {isTransitioning && <GameEndTransition />}
      {view === 'WELCOME' && (
        <WelcomeScreen 
          onStart={handleStart} onSignOut={handleSignOut} profile={profile} onRefreshProfile={handleRefreshProfile}
          onOpenHub={(tab) => {
            if (tab === 'INVENTORY') setInventoryOpen(true);
            else setHubState({ open: true, tab });
          }} 
          onOpenStore={handleOpenStore}
          playerName={playerName} setPlayerName={setPlayerName} playerAvatar={playerAvatar} setPlayerAvatar={setPlayerAvatar}
          cardCoverStyle={cardCoverStyle} setCardCoverStyle={setCardCoverStyle} aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty}
          quickFinish={spQuickFinish} setQuickFinish={setSpQuickFinish} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
          backgroundTheme={backgroundTheme} setBackgroundTheme={setBackgroundTheme} isGuest={isGuest}
          sleeveEffectsEnabled={sleeveEffectsEnabled} setSleeveEffectsEnabled={setSleeveEffectsEnabled}
          playAnimationsEnabled={playAnimationsEnabled} setPlayAnimationsEnabled={setPlayAnimationsEnabled}
          autoPassEnabled={autoPassEnabled} setAutoPassEnabled={setAutoPassEnabled}
          onOpenGemPacks={handleOpenGemPacks}
          onOpenFriends={handleOpenFriends}
          onLinkAccount={handleLinkAccount}
        />
      )}
      {view === 'LOBBY' && <Lobby playerName={playerName} gameState={mpGameState} error={error} playerAvatar={playerAvatar} initialRoomCode={urlRoomCode} backgroundTheme={backgroundTheme} onBack={handleExit} onSignOut={handleSignOut} myId={myPersistentId} turnTimerSetting={turnTimerSetting} selected_sleeve_id={profile?.active_sleeve || profile?.equipped_sleeve} />}
      {view === 'GAME_TABLE' && (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-yellow-400 text-lg">Loading game...</div></div>}>
          <GameTable gameState={gameMode === 'MULTI_PLAYER' ? mpGameState! : spGameState!} myId={gameMode === 'MULTI_PLAYER' ? myPersistentId : 'me'} myHand={gameMode === 'MULTI_PLAYER' ? mpMyHand : spMyHand} onPlayCards={(cards) => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.PLAY_CARDS, { roomId: mpGameState!.roomId, cards, playerId: myPersistentId }) : handleLocalPlay('me', cards)} onPassTurn={() => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.PASS_TURN, { roomId: mpGameState!.roomId, playerId: myPersistentId }) : handleLocalPass('me')} cardCoverStyle={cardCoverStyle} backgroundTheme={backgroundTheme} profile={profile} playAnimationsEnabled={playAnimationsEnabled} autoPassEnabled={autoPassEnabled} onOpenSettings={() => setGameSettingsOpen(true)} socialFilter={socialFilter} sessionMuted={sessionMuted} setSessionMuted={setSessionMuted} />
        </Suspense>
      )}
      {view === 'VICTORY' && (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-yellow-400 text-lg">Loading results...</div></div>}>
          <VictoryScreen players={gameMode === 'MULTI_PLAYER' ? mpGameState!.players : spGameState!.players} myId={gameMode === 'MULTI_PLAYER' ? myPersistentId : 'me'} onPlayAgain={() => { setView(gameMode === 'MULTI_PLAYER' ? 'LOBBY' : 'WELCOME'); if (gameMode === 'SINGLE_PLAYER') handleStart(playerName, 'SINGLE_PLAYER'); }} onGoHome={handleExit} profile={profile} xpGained={lastMatchRewards?.xp || 0} coinsGained={lastMatchRewards?.coins || 0} xpBonusApplied={lastMatchRewards?.bonus} totalXpAfter={lastMatchRewards?.totalXpAfter} speedBonus={lastMatchRewards?.speedBonus} />
        </Suspense>
      )}
      {view === 'TUTORIAL' && <TutorialMode onExit={() => setView('WELCOME')} />}
      {hubState.open && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"><div className="text-yellow-400 text-lg">Loading profile...</div></div>}>
          <UserHub profile={profile} onClose={() => setHubState({ ...hubState, open: false })} playerName={playerName} setPlayerName={setPlayerName} playerAvatar={playerAvatar} setPlayerAvatar={setPlayerAvatar} onSignOut={handleSignOut} onRefreshProfile={handleRefreshProfile} isGuest={isGuest} onLinkAccount={handleLinkAccount} initialTab={hubState.tab} />
        </Suspense>
      )}
      {inventoryOpen && profile && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"><div className="text-yellow-400 text-lg">Loading inventory...</div></div>}>
          <InventoryModal profile={profile} onClose={() => setInventoryOpen(false)} onRefreshProfile={handleRefreshProfile} />
        </Suspense>
      )}
      {gameSettingsOpen && <GameSettings onClose={() => setGameSettingsOpen(false)} onExitGame={handleExit} currentCoverStyle={cardCoverStyle} onChangeCoverStyle={setCardCoverStyle} currentTheme={backgroundTheme} onChangeTheme={setBackgroundTheme} isSinglePlayer={gameMode === 'SINGLE_PLAYER'} spQuickFinish={spQuickFinish} setSpQuickFinish={setSpQuickFinish} currentDifficulty={aiDifficulty} onChangeDifficulty={setAiDifficulty} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} sleeveEffectsEnabled={sleeveEffectsEnabled} setSleeveEffectsEnabled={setSleeveEffectsEnabled} playAnimationsEnabled={playAnimationsEnabled} setPlayAnimationsEnabled={setPlayAnimationsEnabled} autoPassEnabled={autoPassEnabled} setAutoPassEnabled={setAutoPassEnabled} unlockedSleeves={profile?.unlocked_sleeves || []} unlockedBoards={profile?.unlocked_boards || []} socialFilter={socialFilter} setSocialFilter={setSocialFilter} />}
      {storeOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"><div className="text-yellow-400 text-lg">Loading store...</div></div>}>
          <Store onClose={() => setStoreOpen(false)} profile={profile} onRefreshProfile={handleRefreshProfile} onEquipSleeve={setCardCoverStyle} currentSleeve={cardCoverStyle} playerAvatar={playerAvatar} onEquipAvatar={setPlayerAvatar} currentTheme={backgroundTheme} onEquipBoard={setBackgroundTheme} isGuest={isGuest} initialTab={storeTab} onOpenGemPacks={handleOpenGemPacks} />
        </Suspense>
      )}
      {gemPacksOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"><div className="text-yellow-400 text-lg">Loading gem packs...</div></div>}>
          <GemPacks onClose={() => setGemPacksOpen(false)} profile={profile} onRefreshProfile={handleRefreshProfile} isGuest={isGuest} />
        </Suspense>
      )}
      {friendsOpen && <FriendsLounge onClose={() => setFriendsOpen(false)} profile={profile} onRefreshProfile={handleRefreshProfile} isGuest={isGuest} />}
      {showWelcomeToast && welcomeUsername && (
        <WelcomeToast 
          username={welcomeUsername} 
          onClose={() => {
            setShowWelcomeToast(false);
            setWelcomeUsername('');
          }} 
        />
      )}
      {migrationToast.show && (
        <Toast
          message={migrationToast.message}
          type={migrationToast.type}
          onClose={() => {
            setMigrationToast({ show: false, message: '', type: 'success' });
          }}
        />
      )}
      {migrationSuccessData?.show && (
        <AccountMigrationSuccessModal
          migratedGems={migrationSuccessData.migratedGems}
          bonusGems={migrationSuccessData.bonusGems}
          migratedXp={migrationSuccessData.migratedXp}
          migratedCoins={migrationSuccessData.migratedCoins}
          newGemBalance={migrationSuccessData.newGemBalance}
          onClose={() => {
            setMigrationSuccessData(null);
            // Refresh profile after closing modal
            if (profile?.id) {
              handleRefreshProfile();
            }
          }}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const location = useLocation();
  
  // If we're on a legal route, render LegalView directly
  if (location.pathname === '/terms' || location.pathname === '/privacy') {
    return <LegalView />;
  }
  
  // Otherwise, render the main app
  return <AppContent />;
};

export default App;