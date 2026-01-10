import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';

interface DeleteAccountButtonProps {
  onAccountDeleted: () => void;
  className?: string;
}

/**
 * Comprehensive localStorage cleanup function
 * Clears all app-related localStorage keys to prevent "ghost session" issues
 */
const clearAllLocalStorage = () => {
  console.log('DeleteAccountButton: Clearing all localStorage keys...');
  
  // List of all known localStorage keys used by the app
  const keysToRemove = [
    // Session keys
    'thirteen_global_session',
    'thirteen_global_auth_checked',
    'thirteen_global_has_session',
    'thirteen_session_verified',
    'thirteen_manual_recovery',
    'has_active_session',
    'thirteen_active_session',
    'thirteen_is_migrating',
    
    // Guest data keys
    'thirteen_stats',
    'thirteen_guest_migration',
    
    // Settings keys
    'thirteen_auto_pass_enabled',
    
    // Game state keys
    'thirteen_persistent_uuid',
    'emote_usage_stats',
    
    // Ad service keys (pattern-based)
  ];
  
  // Remove specific keys
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`DeleteAccountButton: Removed localStorage key: ${key}`);
    } catch (e) {
      console.warn(`DeleteAccountButton: Failed to remove ${key}:`, e);
    }
  });
  
  // Remove all Supabase-related keys (pattern-based)
  const supabaseKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || 
    (key.startsWith('sb-') && key.includes('auth-token')) ||
    key.startsWith('sb-')
  );
  
  supabaseKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`DeleteAccountButton: Removed Supabase key: ${key}`);
    } catch (e) {
      console.warn(`DeleteAccountButton: Failed to remove ${key}:`, e);
    }
  });
  
  // Remove SessionProvider keys (pattern-based)
  const sessionProviderKeys = Object.keys(localStorage).filter(key =>
    key.includes('session') || key.includes('auth')
  );
  
  sessionProviderKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`DeleteAccountButton: Removed session key: ${key}`);
    } catch (e) {
      console.warn(`DeleteAccountButton: Failed to remove ${key}:`, e);
    }
  });
  
  // Final nuclear option: clear everything if there are still auth-related keys
  const remainingAuthKeys = Object.keys(localStorage).filter(key =>
    key.toLowerCase().includes('auth') ||
    key.toLowerCase().includes('session') ||
    key.toLowerCase().includes('token') ||
    key.toLowerCase().includes('user')
  );
  
  if (remainingAuthKeys.length > 0) {
    console.warn('DeleteAccountButton: Found remaining auth-related keys, removing:', remainingAuthKeys);
    remainingAuthKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`DeleteAccountButton: Failed to remove ${key}:`, e);
      }
    });
  }
  
  console.log('DeleteAccountButton: localStorage cleanup complete');
};

export const DeleteAccountButton: React.FC<DeleteAccountButtonProps> = ({ 
  onAccountDeleted, 
  className = '' 
}) => {
  const [showFirstConfirm, setShowFirstConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteClick = () => {
    if (!showFirstConfirm) {
      setShowFirstConfirm(true);
      setError(null);
      return;
    }
    
    if (!showSecondConfirm) {
      setShowSecondConfirm(true);
      return;
    }
    
    // Final confirmation - proceed with deletion
    handleFinalDelete();
  };

  const handleFinalDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      // Call the SQL function to delete the account
      const { data, error: rpcError } = await supabase.rpc('delete_user_account');
      
      if (rpcError) {
        console.error('DeleteAccountButton: RPC error:', rpcError);
        
        // Check if it's a network/offline error
        const isNetworkError = 
          rpcError.code === 'PGRST116' || 
          rpcError.message?.toLowerCase().includes('network') ||
          rpcError.message?.toLowerCase().includes('fetch') ||
          rpcError.message?.toLowerCase().includes('connection') ||
          rpcError.message?.toLowerCase().includes('offline');
        
        if (isNetworkError) {
          setError('Network error: Please check your internet connection and try again. Your account has NOT been deleted.');
          setIsDeleting(false);
          return;
        }
        
        setError(rpcError.message || 'Failed to delete account. Please try again.');
        setIsDeleting(false);
        return;
      }
      
      if (!data || !data.success) {
        const errorMsg = data?.error || 'Failed to delete account. Please try again.';
        console.error('DeleteAccountButton: Deletion failed:', errorMsg);
        
        // Check if deletion partially succeeded (critical state)
        if (data?.profile_deleted && !data?.auth_user_deleted) {
          const criticalError = 'ERROR: Account deletion partially completed. Please contact support immediately.';
          console.error('DeleteAccountButton: CRITICAL - Partial deletion detected', data);
          setError(criticalError);
          setIsDeleting(false);
          // TODO: Log this critical error to monitoring service
          return;
        }
        
        setError(errorMsg);
        setIsDeleting(false);
        return;
      }
      
      console.log('DeleteAccountButton: Account deleted successfully');
      
      // Sign out from Supabase first (may clear some localStorage automatically)
      // This should be a no-op since user is deleted, but do it anyway for cleanup
      try {
        await supabase.auth.signOut();
        console.log('DeleteAccountButton: Signed out from Supabase');
      } catch (signOutError) {
        // This is expected if the user is already deleted, so we don't treat it as an error
        console.log('DeleteAccountButton: Sign out completed (user may already be deleted)');
      }
      
      // Clear all localStorage keys AFTER signing out
      // This ensures complete cleanup and prevents any "ghost session" issues
      clearAllLocalStorage();
      
      // Call the callback to handle navigation/cleanup
      onAccountDeleted();
      
    } catch (err: any) {
      console.error('DeleteAccountButton: Unexpected error:', err);
      
      // Check for network errors in catch block
      const isNetworkError = 
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('fetch') ||
        err.message?.toLowerCase().includes('connection') ||
        err.message?.toLowerCase().includes('offline') ||
        err.code === 'NETWORK_ERROR' ||
        err.name === 'NetworkError';
      
      if (isNetworkError) {
        setError('Network error: Please check your internet connection and try again. Your account has NOT been deleted.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
      
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowFirstConfirm(false);
    setShowSecondConfirm(false);
    setError(null);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {!showFirstConfirm ? (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="group relative overflow-hidden rounded-2xl border transition-all duration-500 active:scale-95 shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-red-600/40 shadow-red-950/50 w-full"
          title="Delete Account"
        >
          {/* Multi-stop High-Luster Metallic Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a0000] via-[#2d0a0a] to-[#1a0000] group-hover:scale-110 transition-transform duration-1000"></div>
          
          {/* Luxury Highlight Layer */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#2d0a0a] via-[#4a0404] to-[#2d0a0a] opacity-90 transition-opacity duration-500 group-hover:opacity-100"></div>
          
          {/* Animated Shimmer Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[deleteShimmer_4s_infinite] pointer-events-none opacity-30"></div>
          
          {/* Glossy Bevel Top Light */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center justify-center px-4 py-3 min-h-[50px] sm:min-h-[60px]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] font-serif text-white drop-shadow-md whitespace-nowrap">
                Delete Account
              </span>
              {/* Trash Icon */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-red-400 group-hover:scale-110 transition-all duration-500 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <span className="text-[7px] font-black opacity-60 tracking-[0.3em] uppercase font-serif mt-1 text-white whitespace-nowrap">
              Permanent Action
            </span>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes deleteShimmer {
              0% { background-position: -100% 0; }
              100% { background-position: 100% 0; }
            }
          `}} />
        </button>
      ) : (
        <div className="space-y-3">
          {/* First Confirmation Dialog */}
          {!showSecondConfirm ? (
            <div className="bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-xl border-2 border-red-500/40 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <h3 className="text-base sm:text-lg font-black text-red-300 uppercase tracking-wider">
                  Are you sure?
                </h3>
              </div>
              
              <p className="text-xs sm:text-sm text-red-200/80 leading-relaxed">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteClick}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-br from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 border-2 border-red-400/50 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Yes, Continue
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all duration-300 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Second Confirmation Dialog */
            <div className="bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/40 backdrop-blur-xl border-2 border-red-600/50 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <h3 className="text-base sm:text-lg font-black text-red-200 uppercase tracking-wider">
                  Final Warning
                </h3>
              </div>
              
              <p className="text-xs sm:text-sm text-red-100/90 leading-relaxed font-semibold">
                This action is <span className="text-red-300 font-black">PERMANENT</span>. All your data, progress, and account information will be permanently deleted and cannot be recovered.
              </p>
              
              {error && (
                <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3">
                  <p className="text-xs text-red-200">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleFinalDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-br from-red-700 via-red-600 to-red-700 hover:from-red-600 hover:via-red-500 hover:to-red-600 border-2 border-red-500/60 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Forever'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
