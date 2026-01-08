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
import { AuthCallback } from './components/AuthCallback';
import { GameSettings, SocialFilter } from './components/GameSettings';
import { LegalView } from './components/LegalView';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useNativeHardware } from './hooks/useNativeHardware';

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
import { supabase, recordGameResult, fetchProfile, fetchGuestProfile, transferGuestData, calculateLevel, AVATAR_NAMES, updateProfileAvatar, updateProfileEquipped, updateActiveBoard, updateProfileSettings, globalAuthState, getGuestProgress, migrateGuestData, clearGuestProgress, persistSupabaseAuthTokenBruteforce } from './services/supabase';
import { supabase as supabaseClient } from './services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { WelcomeToast } from './components/WelcomeToast';
import { Toast } from './components/Toast';
import { AccountMigrationSuccessModal } from './components/AccountMigrationSuccessModal';
import { adService } from './services/adService';
import { LoadingScreen } from './components/LoadingScreen';
import { BillingProvider } from './components/BillingProvider';

type ViewState = 'WELCOME' | 'LOBBY' | 'GAME_TABLE' | 'VICTORY' | 'TUTORIAL';
type GameMode = 'SINGLE_PLAYER' | 'MULTI_PLAYER' | null;

const SESSION_KEY = 'thirteen_active_session';
const PERSISTENT_ID_KEY = 'thirteen_persistent_uuid';

// ============================================================================
// OAUTH CODE EXCHANGE MOVED TO /auth/callback ROUTE
// ============================================================================
// The OAuth code exchange is now handled by AuthCallback.tsx component
// which runs on a dedicated route, preventing AbortError from component re-renders.
// App.tsx now only needs to check for existing sessions and rely on onAuthStateChange.

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
  const authStatusRef = useRef({ hasSession: false, authChecked: false });

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

  // Set up status bar for native Android (immersive dark theme)
  useEffect(() => {
    const setupStatusBar = async () => {
      // Only run on native Android platform
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
        return;
      }
      
      try {
        await StatusBar.setBackgroundColor({ color: '#000000' });
        await StatusBar.setStyle({ style: 'DARK' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (error) {
        // StatusBar API not available or error occurred
        console.log('StatusBar API error:', error);
      }
    };
    setupStatusBar();
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

  // EVENT-DRIVEN AUTH: Single source of truth - getSession() in useLayoutEffect
  // This runs once on mount and immediately checks for a session
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Guard: Only run once
    if (didInitRef.current) {
      return;
    }
    
    didInitRef.current = true;
    isInitializingRef.current = true;
    
    // SIMPLIFIED: OAuth code exchange is now handled by dedicated /auth/callback route
    // App.tsx only needs to check for existing sessions and rely on onAuthStateChange
    // This prevents AbortError from component re-renders during code exchange
    
    console.log('App: Initializing auth check...');
    setLoadingStatus('Checking credentials...');
    
    // Manual check: Call getSession() immediately to get definitive answer
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('App: Error getting session:', error);
          setSession(null);
          setHasSession(false);
          setAuthChecked(true);
          // DO NOT set isGuest - let user choose
          setIsProcessingOAuth(false);
          isInitializingRef.current = false;
          return;
        }
        
        if (data?.session) {
          console.log('App: Session found:', data.session.user.id);
          setSession(data.session);
          setHasSession(true);
          setAuthChecked(true);
          setIsGuest(false);
          setIsProcessingOAuth(false);
          
          // Process session
          const meta = data.session.user.user_metadata || {};
          const googleName = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
          if (!playerName) setPlayerName(googleName.toUpperCase());
          
          await transferGuestData(data.session.user.id);
          const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', data.session.user.id).maybeSingle();
          // loadProfile will be called by useEffect that watches for session changes
          // Store flag to trigger profile load
          if (!existingProfile) {
            setLoadingStatus('Creating profile...');
        } else {
            setLoadingStatus('Loading profile...');
          }
        } else {
          console.log('App: No session found - showing landing screen');
          setSession(null);
          setHasSession(false);
          setAuthChecked(true);
          // DO NOT set isGuest - let user choose
          setIsProcessingOAuth(false);
        }
        
        isInitializingRef.current = false;
      } catch (error: any) {
        console.error('App: Exception getting session:', error);
        setSession(null);
        setHasSession(false);
        setAuthChecked(true);
        // DO NOT set isGuest - let user choose
        setIsProcessingOAuth(false);
        isInitializingRef.current = false;
      }
    };
    
    // Call immediately - don't wait for listener
    checkAuth();
  }, []); // Empty deps - only run once on mount

  // Safety timeout: If authChecked is still false after 10 seconds, set it to true
  // This prevents the app from hanging forever if getSession() doesn't complete
  // Note: OAuth code exchange is handled by /auth/callback route, so we don't need
  // to check for code parameter here anymore
  useEffect(() => {
    // Don't set safety timeout if OAuth is processing
    if (isProcessingOAuth) {
      console.log('App: Skipping safety timeout - OAuth processing in progress');
      return;
    }
    
    const safetyTimeout = setTimeout(() => {
      if (!authChecked) {
        console.warn('App: Safety timeout - authChecked still false after 10 seconds, forcing to true');
        setAuthChecked(true);
        setLoadingStatus('Ready to play');
        isInitializingRef.current = false;
      }
    }, 10000); // 10 seconds to allow for slower operations

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [authChecked, isProcessingOAuth]);

  // Note: OAuth hash cleanup is now handled in the SIGNED_IN event handler above

  // Set up auth state change listener - only once with empty deps
  useEffect(() => {
    // Guard: Only set up listener once
    if (authListenerSetupRef.current) {
      return;
    }
    
    console.log('App: Setting up auth state change listener...');
    authListenerSetupRef.current = true;
    
    // Fix: Properly handle the subscription to avoid 'Y is not a function' error
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const authStateChangeResult = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      // Debug logging as requested
      console.log('SUPABASE AUTH EVENT:', event, session);
      
      console.log('App: Auth Event Received:', event, session ? 'Session exists' : 'No session');
      console.log('App: Step 17 - Auth state changed:', event, session ? 'Session exists' : 'No session');
      
      // CRITICAL: For SIGNED_IN event, immediately set flags before doing anything else
      // This is especially important for OAuth code exchange completion
      if (event === 'SIGNED_IN' && session) {
        console.log('App: SIGNED_IN event detected - immediately setting auth flags');
        console.log('App: OAuth code exchange completed successfully');
        
        // Set auth flags immediately
        setAuthChecked(true);
        setHasSession(true);
        setSession(session);
        setIsGuest(false);
        setIsProcessingOAuth(false);
        isInitializingRef.current = false;
        
        // Clean the OAuth parameters from URL once SIGNED_IN is triggered
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        const hasOAuthParams = hash.includes('access_token') || hash.includes('code=') || searchParams.has('code');
        
        if (hasOAuthParams) {
          console.log('App: Cleaning OAuth parameters from URL');
          window.history.replaceState(null, '', window.location.pathname);
        }
        
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
        setPlayerName((prev) => prev || googleName.toUpperCase());
        
        // Only do async operations after flags are set
        await transferGuestData(session.user.id);
        
        // Guest-to-Permanent Migration: Check for guest progress and migrate
        // Only migrate if isMigrating flag is set (user clicked "Link Account")
        // Only award 50 gem bonus for SIGNED_UP (new signup), not SIGNED_IN (existing account)
        const isMigrating = localStorage.getItem('thirteen_is_migrating') === 'true';
        if ((event === 'SIGNED_UP' || event === 'SIGNED_IN') && isMigrating) {
          const guestProgress = getGuestProgress();
          if (guestProgress && (guestProgress.gems > 0 || guestProgress.xp > 0 || guestProgress.coins > 0)) {
            console.log('Guest migration: Found guest progress:', guestProgress);
            setLoadingStatus('Migrating your progress...');
            
            // Only pass isSignup=true for SIGNED_UP events (new signup)
            // SIGNED_IN events (signing into existing account) should not get the bonus
            const isSignup = event === 'SIGNED_UP';
            
            const migrationResult = await migrateGuestData(
              session.user.id,
              guestProgress.gems,
              guestProgress.xp,
              guestProgress.coins,
              isSignup
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
        // Handle SIGNED_OUT event explicitly
        if (event === 'SIGNED_OUT') {
          console.log('App: SIGNED_OUT event - clearing all state');
          setSession(null);
          setHasSession(false);
          setAuthChecked(true);
          // DO NOT set isGuest - show landing screen instead
          setProfile(null);
          setIsProcessingOAuth(false);
          setLoadingStatus('Ready to play');
          initialSyncCompleteRef.current = false;
        } else if (event === 'INITIAL_SESSION') {
          // If INITIAL_SESSION with no session, show landing screen (don't auto-guest)
          console.log('App: INITIAL_SESSION with no session - showing landing screen');
          setAuthChecked(true);
          setHasSession(false);
          // DO NOT set isGuest - let user choose
          setLoadingStatus('Ready to play');
        } else {
          setHasSession((prev) => prev ? prev : false);
          setProfile(null);
          initialSyncCompleteRef.current = false;
        }
      }
    });
    
      // Extract subscription from the result
      if (authStateChangeResult?.data?.subscription) {
        subscription = authStateChangeResult.data.subscription;
      }
    } catch (error) {
      console.error('App: Error setting up auth state change listener:', error);
      authListenerSetupRef.current = false;
    }
    
    return () => {
      console.log('App: Step 18 - Cleaning up auth state change listener');
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
        }
      } catch (error) {
        console.error('App: Error unsubscribing from auth listener:', error);
      }
      authListenerSetupRef.current = false;
    };
  }, []); // Empty dependency array - only run once

  // Fix render loop: Wrap loadProfile in useCallback to prevent recreation on every render
  const loadProfile = useCallback(async (uid: string, isNewUser: boolean = false) => {
    console.log('App: Loading profile for user:', uid, 'isNewUser:', isNewUser);
    loadingProfileInProgressRef.current = true;
    initialSyncCompleteRef.current = false;
    const meta = session?.user?.user_metadata || {};
    // Use Google metadata: full_name, name, or display_name
    const baseUsername = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
    let data = await fetchProfile(uid, playerAvatar, baseUsername);
    
    // Check or Create: If no profile found, create a default one immediately
    if (!data) {
      console.log('App: No profile found, creating default profile...');
      try {
        const defaultProfile: UserProfile = {
          id: uid,
          username: 'New Player#0000',
          wins: 0,
          games_played: 0,
          currency: 500,
          coins: 500,
          gems: 500,
          xp: 0,
          level: 1,
          unlocked_sleeves: ['RED', 'BLUE'],
          unlocked_avatars: [':cool:', ':blush:', ':annoyed:'],
          unlocked_boards: ['EMERALD'],
          unlocked_phrases: [],
          avatar_url: playerAvatar,
          sfx_enabled: true,
          turbo_enabled: true,
          sleeve_effects_enabled: true,
          play_animations_enabled: true,
          turn_timer_setting: 0,
          undo_count: 0,
          finish_dist: [0, 0, 0, 0],
          total_chops: 0,
          total_cards_left_sum: 0,
          current_streak: 0,
          longest_streak: 0,
          inventory: { items: { XP_2X_10M: 1, GOLD_2X_10M: 1 }, active_boosters: {} },
          event_stats: {
            daily_games_played: 0,
            daily_wins: 0,
            weekly_games_played: 0,
            weekly_wins: 0,
            weekly_bombs_played: 0,
            weekly_chops_performed: 0,
            weekly_challenge_progress: {},
            total_hands_played: 0,
            new_player_login_days: 1,
            claimed_events: [],
            ready_to_claim: []
          }
        };
        
        // Upsert the default profile
        await supabase.from('profiles').upsert(defaultProfile);
        console.log('App: Default profile created successfully');
        data = defaultProfile;
      } catch (error) {
        console.error('App: Failed to create default profile:', error);
        // Still set a minimal profile so UI can render
        data = {
          id: uid,
          username: 'New Player#0000',
          wins: 0,
          games_played: 0,
          currency: 500,
          coins: 500,
          gems: 500,
          xp: 0,
          level: 1,
          unlocked_sleeves: ['RED', 'BLUE'],
          unlocked_avatars: [':cool:'],
          unlocked_boards: ['EMERALD'],
          unlocked_phrases: [],
          avatar_url: playerAvatar,
          turn_timer_setting: 0,
          undo_count: 0,
          finish_dist: [0, 0, 0, 0],
          total_chops: 0,
          total_cards_left_sum: 0,
          current_streak: 0,
          longest_streak: 0,
          inventory: { items: {}, active_boosters: {} },
          event_stats: {
            daily_games_played: 0,
            daily_wins: 0,
            weekly_games_played: 0,
            weekly_wins: 0,
            weekly_bombs_played: 0,
            weekly_chops_performed: 0,
            weekly_challenge_progress: {},
            total_hands_played: 0,
            new_player_login_days: 1,
            claimed_events: [],
            ready_to_claim: []
          }
        } as UserProfile;
      }
    }
    
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
      
      // State Sync: Ensure profile is set so hasProfile becomes true
      setProfile(data);
    }
    setTimeout(() => { 
      initialSyncCompleteRef.current = true;
      loadingProfileInProgressRef.current = false;
    }, 800);
  }, [session, playerAvatar, playerName]); // Only recreate if these dependencies change

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

  // Explicit Guest Action: This is the ONLY place where setIsGuest(true) should be called
  const handlePlayAsGuest = useCallback(() => {
    console.log('App: User explicitly chose to play as guest');
    setIsGuest(true);
    setLoadingStatus('Preparing guest profile...');
  }, []);

  const handleSignOut = async () => {
    console.log('App: Nuclear sign-out initiated');
    
    // Prevent multiple sign-out attempts
    if (isLoggingOutRef.current) {
      console.log('App: Sign-out already in progress, skipping');
      return;
    }
    
    isLoggingOutRef.current = true;
    
    try {
      // Step 1: Sign out from Supabase
      console.log('App: Signing out from Supabase...');
      try {
        await supabase.auth.signOut();
        console.log('App: ✅ Supabase sign-out complete');
      } catch (error) {
        console.error('App: Error signing out from Supabase:', error);
        // Continue with cleanup even if signOut fails
      }
      
      // Step 2: Sign out from RevenueCat (native only)
      if (Capacitor.isNativePlatform()) {
        try {
          console.log('App: Signing out from RevenueCat...');
          // Dynamic import to avoid web crashes
          const { Purchases } = await import('@revenuecat/purchases-capacitor');
          await Purchases.logOut();
          console.log('App: ✅ RevenueCat sign-out complete');
        } catch (error) {
          console.error('App: Error signing out from RevenueCat:', error);
          // Continue with cleanup even if RevenueCat logout fails
        }
      }
      
      // Step 3: Clear all localStorage to remove ghost sessions
      console.log('App: Clearing localStorage...');
      try {
        window.localStorage.clear();
        console.log('App: ✅ localStorage cleared');
      } catch (error) {
        console.error('App: Error clearing localStorage:', error);
      }
      
      // Step 4: Reset all React states
      console.log('App: Resetting React states...');
      setSession(null);
      setHasSession(false);
      setAuthChecked(true);
      setProfile(null);
      setIsGuest(false);
      setIsProcessingOAuth(false);
      setLoadingStatus('Ready to play');
      initialSyncCompleteRef.current = false;
      
      // Step 5: Redirect to landing page
      console.log('App: Redirecting to landing page...');
      // Use window.location.replace to prevent back button navigation
      window.location.replace('/');
      
    } catch (error) {
      console.error('App: Unexpected error during sign-out:', error);
      // Even on error, try to clear and redirect
      try {
        window.localStorage.clear();
        window.location.replace('/');
      } catch (e) {
        console.error('App: Failed to perform fallback cleanup:', e);
      }
    } finally {
      // Reset the flag after a delay to allow redirect
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    }
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

  // Determine if any modal is open
  const isModalOpen = hubState.open || gameSettingsOpen || storeOpen || gemPacksOpen || inventoryOpen || friendsOpen || migrationSuccessData?.show || showWelcomeToast || migrationToast.show;

  // Handle native Android hardware back button
  useNativeHardware({
    view,
    isModalOpen,
    onCloseModal: () => {
      if (hubState.open) setHubState({ ...hubState, open: false });
      if (gameSettingsOpen) setGameSettingsOpen(false);
      if (storeOpen) setStoreOpen(false);
      if (gemPacksOpen) setGemPacksOpen(false);
      if (inventoryOpen) setInventoryOpen(false);
      if (friendsOpen) setFriendsOpen(false);
      if (migrationSuccessData?.show) setMigrationSuccessData(null);
      if (showWelcomeToast) setShowWelcomeToast(false);
      if (migrationToast.show) setMigrationToast({ show: false, message: '', type: 'success' });
    },
    onExitRoom: handleExit,
  });

  // Handle guest account linking with migration flag
  const handleLinkAccount = async () => {
    try {
      console.log('App: OAuth Clean Slate - Clearing existing session before OAuth flow');
      
      // OAuth 'Clean Slate': Clear any existing session first
      try {
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
          console.log('App: Found existing session, signing out first...');
          await supabase.auth.signOut();
          // Wait a moment for sign-out to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (signOutError) {
        console.warn('App: Error clearing session before OAuth:', signOutError);
        // Continue with OAuth even if sign-out fails
      }
      
      // Set migration flag in localStorage so auth listener knows to migrate
      localStorage.setItem('thirteen_is_migrating', 'true');
      
      // Determine redirect URL based on platform
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative 
        ? 'com.playthirteen.app://' // Custom scheme for native apps
        : window.location.origin; // Web origin
      
      console.log('App: Initiating Google OAuth flow for account linking...', { 
        platform: isNative ? 'native' : 'web',
        redirectTo 
      });
      
      // Trigger Google OAuth with PKCE flow
      const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false, // Ensure browser redirect happens
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        }
      });
      
      if (error) {
        console.error('App: OAuth error:', error);
        localStorage.removeItem('thirteen_is_migrating');
      } else {
        console.log('App: OAuth flow initiated successfully for account linking', { data });
      }
    } catch (err: any) {
      console.error('App: Failed to initiate OAuth:', err);
      localStorage.removeItem('thirteen_is_migrating');
    }
  };
  
  // Load profile when we get a valid session but no profile yet
  useEffect(() => {
    if (session?.user?.id && session.user.id !== 'pending' && !profile && !isGuest && hasSession) {
      console.log('App: Valid session found but no profile, loading profile...');
      const userId = session.user.id;
      supabase.from('profiles').select('id').eq('id', userId).maybeSingle().then(({ data: existingProfile }) => {
        loadProfile(userId, !existingProfile);
      });
    }
  }, [session, profile, isGuest, hasSession, loadProfile]);
  
  // Conditional Rendering: Show appropriate screen based on auth state
  // 1. If processing OAuth or !authChecked, show Loading Spinner
  const hash = window.location.hash;
  const hasOAuthHash = hash.includes('access_token') || hash.includes('code=');
  const hasOAuthError = hash.includes('error');
  
  // If OAuth error, don't show loading - let it fall through to landing screen
  if ((isProcessingOAuth || hasOAuthHash) && !hasOAuthError) {
    return (
      <LoadingScreen
        status="Signing you in..."
        showGuestButton={false}
      />
    );
  }
  
  if (!authChecked && !hasOAuthError) {
    return (
      <LoadingScreen
        status={loadingStatus}
        showGuestButton={false}
      />
    );
  }
  
  // 2. If authChecked && !session && !isGuest, show Landing/Sign-In Screen
  // SIMPLIFIED: OAuth code exchange is handled by /auth/callback route
  // App.tsx only needs to check for existing sessions
  const hasValidSession = session && session.user && session.user.id && session.user.id !== 'pending';
  
  if (authChecked && !hasValidSession && !isGuest && !isProcessingOAuth) {
    console.log('App: Showing landing/sign-in screen - no session and user has not chosen guest mode');
    return <AuthScreen onPlayAsGuest={handlePlayAsGuest} />;
  }
  
  // 3. If session || isGuest, show Main Game App
  console.log('App: Rendering main app content', { hasSession: !!session, isGuest });

  return (
    <BillingProvider 
      session={session}
      profile={profile}
      onGemsUpdate={(newGems) => {
        // Update local profile state when gems are updated
        if (profile) {
          setProfile({ ...profile, gems: newGems });
        }
        // Also trigger full profile refresh to ensure everything is in sync
        if (session?.user?.id) {
          handleRefreshProfile();
        }
      }}
    >
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
    </BillingProvider>
  );
};

const App: React.FC = () => {
  const location = useLocation();
  
  // OAuth callback route - handles code exchange outside main app lifecycle
  if (location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }
  
  // If we're on a legal route, render LegalView directly
  if (location.pathname === '/terms' || location.pathname === '/privacy') {
    return <LegalView />;
  }
  
  // Otherwise, render the main app
  return <AppContent />;
};

export default App;