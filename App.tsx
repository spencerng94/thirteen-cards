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
import { SupportView } from './components/SupportView';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { useNativeHardware } from './hooks/useNativeHardware';
import { AdMob } from '@capacitor-community/admob';
import { ADMOB_APP_ID, ADMOB_IOS_APP_ID } from './constants/AdConfig';
import { useAdMobInitialization } from './hooks/useAdMobInitialization';

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
import { recordGameResult, fetchProfile, fetchGuestProfile, transferGuestData, calculateLevel, AVATAR_NAMES, updateProfileAvatar, updateProfileEquipped, updateActiveBoard, updateProfileSettings, globalAuthState, getGuestProgress, migrateGuestData, clearGuestProgress, persistSupabaseAuthTokenBruteforce } from './services/supabase';
import { formatUsername } from './utils/username';
import { supabase, supabaseUrl, supabaseAnonKey } from './src/lib/supabase';
import { useSession } from './components/SessionProvider';
import { logErrorToSupabase } from './services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { WelcomeToast } from './components/WelcomeToast';
import { Toast } from './components/Toast';
import { AccountMigrationSuccessModal } from './components/AccountMigrationSuccessModal';
import { adService } from './services/adService';
import { LoadingScreen } from './components/LoadingScreen';
import { BillingProvider } from './components/BillingProvider';
import { EULAAcceptanceModal } from './components/EULAAcceptanceModal';

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
  // Use SessionProvider for auth state - Rely 100% on Provider
  const { session, user, loading: sessionLoading, isProcessing: isProcessingAuth, isInitialized, isRedirecting, setIsRedirecting, forceSession } = useSession();
  
  // Memoize sessionUserId to prevent unnecessary re-renders
  const sessionUserId = useMemo(() => session?.user?.id, [session?.user?.id]);
  
  // Memoize initialization check - only log once per session change
  const initializationLogged = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (sessionUserId !== initializationLogged.current) {
      initializationLogged.current = sessionUserId;
    }
  }, [sessionUserId]);
  
  // Check Supabase environment variables early
  const envCheck = useMemo(() => checkSupabaseEnv(), []);
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
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);

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
  const [showEULAModal, setShowEULAModal] = useState(false);
  
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
  // App-Level Data Cache: Ensure initial data fetches only run once per session
  const initialDataFetchedRef = useRef(false);
  // Data Lock: Prevent triple-fetch ghosting - if initial data is loaded, don't fetch again
  const isInitialDataLoaded = useRef(false);
  // Fetch Lock: Prevent multiple fetches during initialization
  const hasInitialLoadRun = useRef(false);
  // Network Lock: Prevent multiple simultaneous network requests
  const isInitialLoading = useRef(false);
  // Circuit Breaker: Persistent fetch ref to prevent re-render loops
  const fetchInProgress = useRef(false);
  // Track which userId we've already loaded to prevent re-fetching
  const loadedUserIdRef = useRef<string | null>(null);
  // Ref Guard: Prevent multiple initialization fetches
  const isInitialFetchRef = useRef(false);
  // Hard Lock: Prevent infinite re-render loops during initialization
  const isInitializing = useRef(false);
  const [profileFetchError, setProfileFetchError] = useState<{ message: string; isNetworkError: boolean } | null>(null);
  const [isSyncingData, setIsSyncingData] = useState(false);

  // Reset ref guard when sessionUserId changes (e.g., user logs out and logs back in)
  // This allows a new user to fetch their profile
  // IMPORTANT: Only reset when sessionUserId actually changes, NOT on minor session updates
  // This prevents "Render Storm" from clearing profile on every auth event
  const previousSessionUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (sessionUserId !== previousSessionUserIdRef.current) {
      // Only reset fetch locks if sessionUserId actually changed (not just session object reference)
      // Do NOT clear profile here - profile should persist across minor session updates
      if (previousSessionUserIdRef.current !== undefined) {
        // Reset all locks including hard lock
        isInitializing.current = false;
        isInitialFetchRef.current = false;
        loadedUserIdRef.current = null;
        hasInitialLoadRun.current = false;
        isInitialDataLoaded.current = false;
        fetchInProgress.current = false;
        isInitialLoading.current = false;
        // NOTE: We do NOT call setProfile(null) here - profile should persist
        // Only clear profile on explicit sign-out (handleSignOut) or when sessionUserId becomes null/undefined
      }
      previousSessionUserIdRef.current = sessionUserId;
    }
  }, [sessionUserId]);

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

  // Use profile UUID for signed-in users, fall back to persistent ID for guests
  const myPlayerId = useMemo(() => {
    // Prefer profile ID if available (for signed-in users)
    if (profile?.id) {
      return profile.id;
    }
    // Fall back to session user ID if profile not loaded yet
    if (sessionUserId) {
      return sessionUserId;
    }
    // Use persistent ID for guest users
    return myPersistentId;
  }, [profile?.id, sessionUserId, myPersistentId]);

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
      }
    };
    setupStatusBar();
  }, []);

  // Global error logging: Intercept unhandled promise rejections (e.g., failed Supabase fetches)
  // This captures errors that don't get caught by ErrorBoundary (like async errors in event handlers)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection detected:', event.reason);
      
      // Create an Error object from the rejection reason if it's not already an Error
      let error: Error;
      if (event.reason instanceof Error) {
        error = event.reason;
      } else {
        // Convert non-Error rejection reasons to Error objects
        error = new Error(String(event.reason || 'Unhandled promise rejection'));
        // Try to preserve stack trace if available
        if (event.reason && typeof event.reason === 'object' && 'stack' in event.reason) {
          error.stack = String(event.reason.stack);
        }
      }
      
      // Log to Supabase (fire-and-forget)
      logErrorToSupabase(error, null).catch((logError) => {
        // Silently catch any errors from logging
        console.warn('Failed to log unhandled rejection to Supabase (non-blocking):', logError);
      });
      
      // Note: We don't call event.preventDefault() to allow default browser behavior
      // But we do log it for monitoring purposes
    };

    // Add the event listener
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup: Remove the listener when component unmounts
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
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

  // Initialize AdMob with iOS ATT support
  // This hook handles platform detection and ATT permission request automatically
  useAdMobInitialization();

  // Initialize ad service and pre-load ads on app start
  // CRITICAL: This is completely non-blocking - app renders regardless of AdMob status
  useEffect(() => {
    // Use setTimeout to ensure this doesn't block initial render
    setTimeout(() => {
      const initializeAds = async () => {
        try {
          // Initialize ad service (handles both web and native)
          // Note: AdMob SDK initialization is handled by useAdMobInitialization hook above
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
              socket.emit(SocketEvents.RECONNECT, { roomId, playerId: savedId || myPlayerId });
           }
        } else {
           socket.emit(SocketEvents.REQUEST_SYNC, { playerId: myPlayerId });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [gameMode, myPlayerId, view]);

  // SIMPLIFIED AUTH: SessionProvider handles all auth state
  // App.tsx just checks has_active_session flag and uses session from provider

  // Fix render loop: Wrap loadProfile in useCallback to prevent recreation on every render
  // MUST BE DEFINED BEFORE useEffect that uses it
  // Network Hardening: No AbortController - this request must finish
  const loadProfile = useCallback(async (uid: string, isNewUser: boolean = false, forceRetry: boolean = false) => {
    // Circuit Breaker: If a fetch is already in progress for this user, skip
    if (fetchInProgress.current && loadedUserIdRef.current === uid && !forceRetry) {
      return;
    }
    
    // Network Lock: If a fetch is already in progress, skip
    if (isInitialLoading.current && !forceRetry) {
      return;
    }
    
    // Data Lock: If initial data is already loaded for this user and this isn't a forced retry, skip
    if (isInitialDataLoaded.current && loadedUserIdRef.current === uid && !forceRetry) {
      return;
    }
    
    fetchInProgress.current = true; // Set circuit breaker
    isInitialLoading.current = true; // Set network lock
    loadedUserIdRef.current = uid; // Track which user we're loading
    loadingProfileInProgressRef.current = true;
    initialSyncCompleteRef.current = false;
    setProfileFetchError(null); // Clear any previous errors
    setIsSyncingData(true); // Show syncing state
    
    const meta = session?.user?.user_metadata || {};
    // Use Google metadata: full_name, name, or display_name
    const baseUsername = meta.full_name || meta.name || meta.display_name || AVATAR_NAMES[playerAvatar]?.toUpperCase() || 'AGENT';
    let data: UserProfile | null = null;
    let actualIsNewUser = isNewUser; // Track if this is actually a new user (404)
    
    try {
      data = await fetchProfile(uid, playerAvatar, baseUsername);
      
      // REMOVE ABORTCONTROLLER: Handle null return from fetchProfile (could be AbortError)
      // If fetchProfile returns null due to AbortError, don't create a new profile - just retry later
      if (data === null) {
        // This could be an AbortError (handled gracefully in fetchProfile) or actual 404
        // FORCE STATE PERSISTENCE: If profile already exists in state, preserve it (likely AbortError)
        if (profile && profile.id === uid) {
          // Profile already exists - this was likely an AbortError, preserve state
          console.warn(`App: fetchProfile returned null for existing profile (likely AbortError), preserving state for UUID: ${uid}`);
          isInitialLoading.current = false;
          fetchInProgress.current = false;
          loadingProfileInProgressRef.current = false;
          setIsSyncingData(false);
          return; // Don't create new profile, preserve existing one - will retry on next render
        }
        // If no profile exists, we can't distinguish between AbortError and 404
        // To be safe, treat as AbortError and retry later rather than creating a new profile
        // This prevents creating duplicate profiles when the abort happens on an existing user
        console.warn(`App: fetchProfile returned null (likely AbortError), will retry on next render for UUID: ${uid}`);
        isInitialLoading.current = false;
        fetchInProgress.current = false;
        loadingProfileInProgressRef.current = false;
        setIsSyncingData(false);
        return; // Don't create new profile - retry on next stable render
      }
      
      // Success - profile loaded
      if (data) {
        setProfile(data);
        setProfileFetchError(null);
        setIsSyncingData(false);
        isInitialDataLoaded.current = true;
        isInitialLoading.current = false; // Release network lock
        fetchInProgress.current = false; // Release circuit breaker
        isInitialFetchRef.current = true; // Set ref guard after successful fetch
        loadingProfileInProgressRef.current = false;
        return; // Exit early on success
      }
    } catch (error: any) {
      // Check if it's a 404 (profile not found) - explicitly set isNewUser to true
      if ((error as any).isNotFound || error?.message === 'PROFILE_NOT_FOUND_404') {
        actualIsNewUser = true; // Explicitly mark as new user
        // Don't release locks yet - we'll create the profile below
      } else {
        // Release locks on other errors
        isInitialLoading.current = false;
        fetchInProgress.current = false;
      }
      
      // REMOVE ABORTCONTROLLER: Handle AbortError gracefully - don't block profile load
      // In production, Ghost Session causes abort signals before database responds
      // We want to retry on next stable render, not throw errors that block the app
      if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message === 'PROFILE_FETCH_ABORTED' || (error as any).isAbortError) {
        // FORCE STATE PERSISTENCE: Don't clear profile state on AbortError - preserve what we have
        console.warn(`App: Profile fetch was aborted for UUID: ${uid} (will retry on next stable render, preserving state)`);
        // Set ref guard after fetch completes (even if aborted)
        isInitialFetchRef.current = true;
        // Keep loading state active - don't set profile to undefined, don't clear existing profile
        // Don't reset fetch lock - let it retry naturally when component stabilizes
        loadingProfileInProgressRef.current = false;
        isInitialLoading.current = false;
        fetchInProgress.current = false;
        // Don't clear loadedUserIdRef - keep it so we know we tried for this user
        // Return early to prevent error propagation - will retry on next render when session is stable
        return;
      }
      
      // Check if it's a network error (should show retry button)
      if ((error as any).isNetworkError) {
        console.error(`App: Network error fetching profile for UUID: ${uid}:`, error);
        setIsSyncingData(false);
        setProfileFetchError({
          message: error.message || 'Network error fetching profile',
          isNetworkError: true
        });
        loadingProfileInProgressRef.current = false;
        isInitialLoading.current = false;
        fetchInProgress.current = false;
        return; // Don't try to create profile on network error
      }
      
      // If it's a 404, create new profile (actualIsNewUser was set to true above)
      if (actualIsNewUser) {
        // Continue to profile creation logic below - don't return yet
      } else {
        // For other errors (not 404, not AbortError, not network), release locks and show error
        isInitialLoading.current = false;
        fetchInProgress.current = false;
      }
      
      // IMPORTANT: Log error prominently so it's visible
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌❌❌ App: ERROR FETCHING PROFILE ❌❌❌');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      if (error?.supabaseError) {
        console.error('Supabase Error Code:', error.supabaseError.code);
        console.error('Supabase Error Message:', error.supabaseError.message);
        console.error('Supabase Error Details:', error.supabaseError.details);
        console.error('Supabase Error Hint:', error.supabaseError.hint);
      }
      console.error('═══════════════════════════════════════════════════════');
      
      // If it's a database error saving new user, show a helpful message
      if (error?.message?.includes('Database error saving new user')) {
        console.error('🔴 DATABASE ERROR SAVING NEW USER PROFILE');
        console.error('This is likely due to missing RLS policies.');
        console.error('SOLUTION: Run the SQL migration: fix_profile_rls_policies.sql');
        console.error('Or manually create this policy:');
        console.error('  CREATE POLICY "Users can insert their own profile"');
        console.error('  ON profiles FOR INSERT');
        console.error('  WITH CHECK (auth.uid() = id);');
        // Set error but don't throw - let user see the error
        setIsSyncingData(false);
        setProfileFetchError({
          message: error.message,
          isNetworkError: false
        });
        loadingProfileInProgressRef.current = false;
        isInitialLoading.current = false; // Release network lock
        fetchInProgress.current = false; // Release circuit breaker
        isInitialFetchRef.current = true; // Set ref guard after failed fetch
        return;
      } else {
        // For other errors, set error state
        setIsSyncingData(false);
        setProfileFetchError({
          message: error.message || 'Unknown error fetching profile',
          isNetworkError: false
        });
        loadingProfileInProgressRef.current = false;
        isInitialLoading.current = false; // Release network lock
        fetchInProgress.current = false; // Release circuit breaker
        isInitialFetchRef.current = true; // Set ref guard after failed fetch
        return;
      }
    }
    
    // Only create default profile if we got a 404 error (not AbortError) - actualIsNewUser is set by catch block
    // REMOVE ABORTCONTROLLER: Don't create profile if fetchProfile returned null (could be AbortError)
    // We only create profile if actualIsNewUser is true (set in catch block on 404)
    if (actualIsNewUser) {
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
          eula_accepted: false, // New users must accept EULA before playing
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
      
      // Show welcome toast for new users (use actualIsNewUser if it was set, otherwise use isNewUser param)
      // Format username with discriminator for display: "Name#1234"
      if ((actualIsNewUser || isNewUser) && data.username) {
        const formattedUsername = data.discriminator 
          ? formatUsername(data.username, data.discriminator)
          : data.username; // Fallback to username if discriminator missing
        setWelcomeUsername(formattedUsername);
        setShowWelcomeToast(true);
      }
      
      if (data.avatar_url) {
        setPlayerAvatar(data.avatar_url);
      } else {
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
      // Use functional update to prevent triggering re-renders that cause re-initialization
      setProfile(prevProfile => {
        // Only update if data is different to prevent unnecessary re-renders
        if (prevProfile?.id === data.id && JSON.stringify(prevProfile) === JSON.stringify(data)) {
          return prevProfile;
        }
        return data;
      });
      isInitialDataLoaded.current = true; // Mark as loaded
      
      // STATE VERIFICATION: Toggle loading state OFF immediately when profile is set
      // This ensures 'Verifying session' loading screen disappears immediately
      initialSyncCompleteRef.current = true;
      loadingProfileInProgressRef.current = false;
      setIsSyncingData(false); // Clear syncing state immediately
      isInitialLoading.current = false; // Release network lock immediately
      fetchInProgress.current = false; // Release circuit breaker immediately
      
      // EULA Check: Show EULA modal if user hasn't accepted it yet
      // Only check for authenticated users (not guests)
      if (!isGuest && session?.user?.id && (data.eula_accepted === false || data.eula_accepted === undefined)) {
        setShowEULAModal(true);
      }
    }
  }, [sessionUserId, playerAvatar, playerName, isGuest]); // Use memoized sessionUserId instead of full session object

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
      if (data.sleeve_effects_enabled !== undefined) setSleeveEffectsEnabled(data.sleeve_effects_enabled);
      if (data.play_animations_enabled !== undefined) setPlayAnimationsEnabled(data.play_animations_enabled);
      if (data.auto_pass_enabled !== undefined) {
        setAutoPassEnabled(data.auto_pass_enabled);
        localStorage.setItem('thirteen_auto_pass_enabled', data.auto_pass_enabled ? 'true' : 'false');
      }
      if (data.turn_timer_setting !== undefined) setTurnTimerSetting(data.turn_timer_setting);
      initialSyncCompleteRef.current = true;
    }
  }, [isGuest, session, playerName]);


  useEffect(() => {
    const userId = session?.user?.id || (isGuest ? 'guest' : null);
    if (!userId || !profile || !initialSyncCompleteRef.current || isLoggingOutRef.current) return;
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
      // Prevent setting profile to null on minor updates - only update if profile exists
      setProfile(prev => {
        if (!prev) {
          console.warn('App: Attempted to update profile settings but profile is null, skipping update');
          return prev;
        }
        return { ...prev, ...updates };
      });
    }
  }, [playerAvatar, cardCoverStyle, backgroundTheme, soundEnabled, spQuickFinish, sleeveEffectsEnabled, playAnimationsEnabled, autoPassEnabled, turnTimerSetting, session, profile, isGuest]);

  // Explicit Guest Action: This is the ONLY place where setIsGuest(true) should be called
  const handlePlayAsGuest = useCallback(() => {
    setIsGuest(true);
    setLoadingStatus('Preparing guest profile...');
  }, []);

  const handleSignOut = async () => {
    
    // Prevent multiple sign-out attempts
    if (isLoggingOutRef.current) {
      return;
    }
    
    isLoggingOutRef.current = true;
    
    try {
      // Step 1: Sign out from Supabase
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('App: Error signing out from Supabase:', error);
        // Continue with cleanup even if signOut fails
      }
      
      // Step 2: Sign out from RevenueCat (native only)
      if (Capacitor.isNativePlatform()) {
        try {
          // Dynamic import to avoid web crashes
          const { Purchases } = await import('@revenuecat/purchases-capacitor');
          await Purchases.logOut();
        } catch (error) {
          console.error('App: Error signing out from RevenueCat:', error);
          // Continue with cleanup even if RevenueCat logout fails
        }
      }
      
      // Step 3: Clear all localStorage to remove ghost sessions
      try {
        window.localStorage.clear();
      } catch (error) {
        console.error('App: Error clearing localStorage:', error);
      }
      
      // Step 4: Clear has_active_session flag
      localStorage.removeItem('has_active_session');
      
      // Step 5: Reset all React states
      setProfile(null);
      setIsGuest(false);
      setLoadingStatus('Ready to play');
      initialSyncCompleteRef.current = false;
      
      // Step 5: Redirect to landing page
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
  const handleOpenLocal = () => {
    // Navigate to Lobby with local mode indicator
    setView('LOBBY');
    // The Lobby component will handle local discovery
  };

  const handleRefreshProfile = useCallback(() => {
    // GHOST SESSION: Guard against empty user.id - ensure user.id exists before using it
    if (session?.user?.id && session.user.id !== '' && session.user.id !== 'pending') {
      // Force retry by passing forceRetry=true and resetting the data lock
      isInitialDataLoaded.current = false;
      loadProfile(session.user.id, false, true);
    } else if (isGuest) {
      const data = fetchGuestProfile();
      setProfile(data);
    }
  }, [session?.user?.id, loadProfile, isGuest]);
  
  const handleRetryProfileFetch = useCallback(() => {
    // GHOST SESSION: Guard against empty user.id - ensure it exists and is not empty
    if (sessionUserId && sessionUserId !== '' && sessionUserId !== 'pending') {
      // Force retry by resetting all locks including ref guard
      isInitialDataLoaded.current = false;
      hasInitialLoadRun.current = false;
      isInitialLoading.current = false;
      fetchInProgress.current = false;
      isInitialFetchRef.current = false; // Reset ref guard to allow retry
      loadedUserIdRef.current = null; // Clear loaded user to allow retry
      setProfileFetchError(null);
      setIsSyncingData(false);
      loadProfile(sessionUserId, false, true);
    }
  }, [sessionUserId, loadProfile]);
  
  // App State Stability: Memoize onGemsUpdate to prevent BillingProvider remount
  const handleGemsUpdate = useCallback((newGems: number) => {
    // Update local profile state when gems are updated
    if (profile) {
      setProfile({ ...profile, gems: newGems });
    }
    // GHOST SESSION: Guard against empty user.id - ensure it exists and is not empty
    // Also trigger full profile refresh to ensure everything is in sync
    if (session?.user?.id && session.user.id !== '' && session.user.id !== 'pending') {
      handleRefreshProfile();
    }
  }, [profile, session?.user?.id, handleRefreshProfile]);

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
         localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: state.roomId, playerId: myPlayerId, timestamp: Date.now() }));
      }
      if (state.status === GameStatus.PLAYING) {
        setView('GAME_TABLE');
      } else if (state.status === GameStatus.FINISHED) {
        // Check if we were just playing or already on game table
        // Also prevent duplicate processing if we already processed this finished state
        const alreadyProcessed = prevStatus === GameStatus.FINISHED;
        const shouldShowVictory = (prevStatus === GameStatus.PLAYING || view === 'GAME_TABLE' || prevStatus === null || prevStatus === undefined) && !alreadyProcessed;
        
        if (shouldShowVictory) {
          const myRank = state.players.find(p => p.id === myPlayerId)?.finishedRank || 4;
          // Extract speed bonuses
          const mySpeedBonus = state.speedBonuses?.[myPlayerId] || { gold: 0, xp: 0 };
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
        // Don't reset view if already in LOBBY to prevent remounts
        if (view !== 'LOBBY') {
          setView('LOBBY');
        }
      }
    };
    const onPlayerHand = (cards: Card[]) => setMpMyHand(cards);
    socket.on(SocketEvents.GAME_STATE, onGameState);
    socket.on(SocketEvents.PLAYER_HAND, onPlayerHand);
    socket.on(SocketEvents.ERROR, (m) => { if (m === 'Session Expired') localStorage.removeItem(SESSION_KEY); setError(m); setTimeout(() => setError(null), 3000); });
    return () => {
      socket.off(SocketEvents.GAME_STATE); socket.off(SocketEvents.PLAYER_HAND); socket.off(SocketEvents.ERROR);
    };
  }, [view, gameMode, triggerMatchEndTransition, myPlayerId, mpGameState?.status, mpMyHand.length, isGuest, session?.user?.id, profile]);

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
  const isModalOpen = hubState.open || gameSettingsOpen || storeOpen || gemPacksOpen || inventoryOpen || friendsOpen || migrationSuccessData?.show || showWelcomeToast || migrationToast.show || showEULAModal;

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
      
      // OAuth 'Clean Slate': Clear any existing session first
      try {
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
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
      
      // Manual Implicit Flow: Construct OAuth URL directly for account linking
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('App: Missing Supabase configuration for account linking');
        localStorage.removeItem('thirteen_is_migrating');
        return;
      }
      
      // Build implicit flow OAuth URL
      // Note: access_type='offline' is NOT allowed with response_type='token' (implicit flow)
      // Implicit flow only works with response_type='token' and no access_type parameter
      const oauthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
      oauthUrl.searchParams.set('provider', 'google');
      oauthUrl.searchParams.set('redirect_to', redirectUrl);
      oauthUrl.searchParams.set('response_type', 'token'); // Implicit flow
      oauthUrl.searchParams.set('client_id', supabaseAnonKey);
      oauthUrl.searchParams.set('prompt', 'consent'); // Optional: force consent screen
      
      
      // Redirect immediately
      window.location.href = oauthUrl.toString();
    } catch (err: any) {
      console.error('App: Failed to initiate OAuth:', err);
      localStorage.removeItem('thirteen_is_migrating');
    }
  };
  
  // Load profile when we get a valid session but no profile yet
  // PROFILE FETCH FIX: Wait for actual UUID from session, don't clear profile if already loading
  useEffect(() => {
    // THE USER ID CHECK: Wait for actual UUID from session - ensure userId is a valid UUID format
    // Basic format check: UUID should be a string with length ~36 and contain hyphens
    const isValidUUID = (id: string | undefined | null): boolean => {
      if (!id || typeof id !== 'string' || id === '' || id === 'pending' || id === 'guest') return false;
      // Basic UUID format check (e.g., "550e8400-e29b-41d4-a716-446655440000")
      return id.length >= 36 && id.includes('-') && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) !== null;
    };
    
    // THE USER ID CHECK: Ensure we wait for actual UUID from session (not empty, not pending)
    if (!sessionUserId || !isValidUUID(sessionUserId) || isGuest || !session) {
      return;
    }
    
    // FORCE STATE PERSISTENCE: Don't clear profile state if it's already loading
    // If profile is already loaded for this user, don't fetch again
    if (profile && profile.id === sessionUserId) {
      return;
    }
    
    // FORCE STATE PERSISTENCE: If a fetch is already in progress, don't clear profile state
    // Even if component re-renders, don't clear the profile state if it's already loading
    if (isInitializing.current || isInitialLoading.current || fetchInProgress.current) {
      return;
    }
    
    // HARD LOCK: Set the lock immediately to prevent any other renders from triggering this
    isInitializing.current = true;
    
    const userId = sessionUserId; // Use the validated UUID
    
    // REMOVE ABORTCONTROLLER: No AbortController - fetchProfile must complete even if component re-renders
    // In production, Ghost Session causes session fluctuations which trigger abort signals
    // We want the database request to complete regardless of re-renders
    loadProfile(userId, false)
      .then(() => {
        // Success - profile loaded
      })
      .catch((err) => {
        // Error handling - log but don't throw
        // Don't clear profile state on error - preserve what we have
        console.error('❌ Failed to load profile for UUID:', userId, err);
      })
      .finally(() => {
        // UNLOCK: Always release the hard lock in finally block
        isInitializing.current = false;
        isInitialFetchRef.current = true; // Mark as completed
      });
  }, [sessionUserId, isGuest, loadProfile, session]); // REMOVED profile from deps to prevent re-fetch loops
  
  // Profile Fetch Fallback: If user ID is missing but session exists, attempt to repair
  // MUST be called before any conditional returns (Rules of Hooks)
  const repairAttemptedRef = useRef(false);
  const sessionUserIdRef = useRef<string | undefined>(session?.user?.id);
  
  // Persistent Session Check: Ensure isGuest is strictly false if session exists
  useEffect(() => {
    if (session && session.user) {
      // If session exists, we are NOT a guest
      if (isGuest) {
        setIsGuest(false);
      }
    }
  }, [session, isGuest]);
  
  useEffect(() => {
    const currentUserId = session?.user?.id;
    const hasSession = !!session;
    const hasSessionUser = !!session?.user;
    const userIdMissing = hasSession && hasSessionUser && (!currentUserId || currentUserId === '');
    
    // Only attempt repair once per session, and only if user ID changed from missing to still missing
    if (userIdMissing && !repairAttemptedRef.current && sessionUserIdRef.current === currentUserId) {
      console.warn('App: ⚠️ Session exists but user ID is missing, attempting repair with getUser()');
      repairAttemptedRef.current = true;
      
      supabase.auth.getUser()
        .then(({ data: userData, error: userError }) => {
          if (!userError && userData?.user) {
            // SessionProvider will pick up the repaired user via onAuthStateChange
          } else {
            console.warn('App: getUser() failed, but session exists so showing game anyway:', userError);
          }
        })
        .catch(err => {
          console.warn('App: Exception calling getUser(), but session exists so showing game anyway:', err);
        });
    }
    
    // Update ref when user ID changes
    if (currentUserId !== sessionUserIdRef.current) {
      sessionUserIdRef.current = currentUserId;
      // Reset repair attempt if we get a valid ID
      if (currentUserId && currentUserId !== '') {
        repairAttemptedRef.current = false;
      }
    }
  }, [session?.user?.id]); // Only watch user ID, not computed values
  
  // FIX STUCK SIGN-IN: Add timeout fallback to clear isRedirecting if stuck
  const redirectStuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // If isRedirecting is true for more than 20 seconds, clear it to prevent stuck state
    if (isRedirecting) {
      redirectStuckTimeoutRef.current = setTimeout(() => {
        console.warn('App: isRedirecting stuck for 20+ seconds, clearing to prevent infinite loading');
        setIsRedirecting(false);
      }, 20000); // 20 second timeout
      
      return () => {
        if (redirectStuckTimeoutRef.current) {
          clearTimeout(redirectStuckTimeoutRef.current);
          redirectStuckTimeoutRef.current = null;
        }
      };
    } else {
      // Clear timeout if isRedirecting becomes false
      if (redirectStuckTimeoutRef.current) {
        clearTimeout(redirectStuckTimeoutRef.current);
        redirectStuckTimeoutRef.current = null;
      }
    }
  }, [isRedirecting, setIsRedirecting]);

  // Redefine the 'Ready' State: Derived boolean ensures proper loading gate
  // If a session exists, we must wait for the profile to load before hiding the loading screen.
  // If no session exists, we proceed to the landing page normally.
  const isAppReady = isInitialized && (session ? !!profile : true);
  
  // Splash Screen Logic: Hide native splash screen only after app is ready
  // This ensures seamless transition from native splash to app content (no white flash)
  // Includes 5-second timeout fallback to prevent users from being stuck
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return; // Skip on web
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let hasHidden = false;

    const hideSplash = async () => {
      if (hasHidden) return;
      hasHidden = true;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      try {
        await SplashScreen.hide();
      } catch (error) {
        // Non-blocking: Log error but don't prevent app from loading
        console.warn('Failed to hide splash screen:', error);
      }
    };

    // Hide immediately when app is ready
    if (isAppReady) {
      hideSplash();
    }

    // Fallback: Force hide after 5 seconds regardless of app readiness
    // This prevents users from being stuck if a resource fails to load
    timeoutId = setTimeout(() => {
      console.warn('Splash screen timeout: Forcing hide after 5 seconds (app may still be loading)');
      hideSplash();
    }, 5000);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAppReady]);
  
  // Refactor the Loading Gate: Use isAppReady instead of just !isInitialized
  // Prevent Partial Renders: Don't mount any components until isAppReady is true
  if (!isAppReady) {
    const message = isRedirecting ? "Connecting to provider..." : "Verifying session...";
    return (
      <div className="relative">
        <LoadingScreen
          status={message}
          showGuestButton={!isRedirecting} // Show guest button if not redirecting (allows user to escape stuck state)
          onEnterGuest={handlePlayAsGuest}
        />
      </div>
    );
  }
  
  // Step B: Now that we are CERTAIN app is ready, check for the session (source of truth)
  // App.tsx Logic Change: Trust the Session, not the User ID
  // If hasSession is true, we MUST show the game, even if the ID extraction is lagging
  const hasSession = !!session;
  const hasSessionUser = !!session?.user;
  const hasValidSession = hasSession && hasSessionUser; // Trust session object, not just user ID
  
  // Prevent Partial Renders: Only render AuthScreen if no session and not a guest
  if (!hasValidSession && !isGuest) {
    // Step C: Only if app is ready AND there is no user, show Landing
    
    // Check if we just came back from auth/callback (browser might be blocking cookies)
    const cameFromAuthCallback = typeof document !== 'undefined' && document.referrer.includes('auth/callback');
    
    return (
      <div className="relative">
        <AuthScreen onPlayAsGuest={handlePlayAsGuest} />
        {cameFromAuthCallback && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={forceSession}
                className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors shadow-lg"
              >
                Complete Sign In
              </button>
              <p className="text-amber-300/70 text-xs text-center max-w-xs">
                If sign-in seems stuck, click to manually complete the process
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // 3. If session || isGuest, show Main Game App (only rendered when isAppReady is true)

  return (
    <BillingProvider 
      session={session}
      profile={profile}
      onGemsUpdate={handleGemsUpdate}
    >
    <div className="min-h-[100dvh] bg-black bg-fixed bg-cover text-white font-sans selection:bg-yellow-500 selection:text-black pt-[env(safe-area-inset-top)]">
      {isTransitioning && <GameEndTransition />}
      {view === 'WELCOME' && (
        <WelcomeScreen 
          onStart={handleStart} onSignOut={handleSignOut} profile={profile} onRefreshProfile={handleRefreshProfile}
          onRetryProfileFetch={handleRetryProfileFetch}
          profileFetchError={profileFetchError}
          isSyncingData={isSyncingData}
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
          onOpenLocal={handleOpenLocal}
          onLinkAccount={handleLinkAccount}
          isModalOpen={isModalOpen}
        />
      )}
      {view === 'LOBBY' && <Lobby key="main-lobby-instance" playerName={playerName} gameState={mpGameState} error={error} playerAvatar={playerAvatar} initialRoomCode={urlRoomCode} backgroundTheme={backgroundTheme} onBack={handleExit} onSignOut={handleSignOut} myId={myPlayerId} turnTimerSetting={turnTimerSetting} selected_sleeve_id={profile?.active_sleeve || profile?.equipped_sleeve} />}
      {view === 'GAME_TABLE' && (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-yellow-400 text-lg">Loading game...</div></div>}>
          <GameTable gameState={gameMode === 'MULTI_PLAYER' ? mpGameState! : spGameState!} myId={gameMode === 'MULTI_PLAYER' ? myPlayerId : 'me'} myHand={gameMode === 'MULTI_PLAYER' ? mpMyHand : spMyHand} onPlayCards={(cards) => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.PLAY_CARDS, { roomId: mpGameState!.roomId, cards, playerId: myPlayerId }) : handleLocalPlay('me', cards)} onPassTurn={() => gameMode === 'MULTI_PLAYER' ? socket.emit(SocketEvents.PASS_TURN, { roomId: mpGameState!.roomId, playerId: myPlayerId }) : handleLocalPass('me')} cardCoverStyle={cardCoverStyle} backgroundTheme={backgroundTheme} profile={profile} playAnimationsEnabled={playAnimationsEnabled} autoPassEnabled={autoPassEnabled} onOpenSettings={() => setGameSettingsOpen(true)} socialFilter={socialFilter} sessionMuted={sessionMuted} setSessionMuted={setSessionMuted} />
        </Suspense>
      )}
      {view === 'VICTORY' && (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-yellow-400 text-lg">Loading results...</div></div>}>
          <VictoryScreen players={gameMode === 'MULTI_PLAYER' ? mpGameState!.players : spGameState!.players} myId={gameMode === 'MULTI_PLAYER' ? myPlayerId : 'me'} onPlayAgain={() => { setView(gameMode === 'MULTI_PLAYER' ? 'LOBBY' : 'WELCOME'); if (gameMode === 'SINGLE_PLAYER') handleStart(playerName, 'SINGLE_PLAYER'); }} onGoHome={handleExit} profile={profile} xpGained={lastMatchRewards?.xp || 0} coinsGained={lastMatchRewards?.coins || 0} xpBonusApplied={lastMatchRewards?.bonus} totalXpAfter={lastMatchRewards?.totalXpAfter} speedBonus={lastMatchRewards?.speedBonus} />
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
      {showEULAModal && (
        <EULAAcceptanceModal
          onAccept={() => {
            setShowEULAModal(false);
            // Refresh profile to get updated eula_accepted status
            if (profile?.id && session?.user?.id) {
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
  
  // If we're on a legal or support route, render the appropriate view directly
  if (location.pathname === '/terms' || location.pathname === '/privacy') {
    return <LegalView />;
  }
  
  if (location.pathname === '/support') {
    return <SupportView />;
  }
  
  // Otherwise, render the main app
  return <AppContent />;
};

export default App;