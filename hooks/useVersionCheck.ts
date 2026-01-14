import { useState, useEffect, useRef } from 'react';
import { CURRENT_VERSION, compareVersions } from '../utils/version';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const VERSION_JSON_URL = '/version.json';

interface VersionResponse {
  version: string;
}

/**
 * Hook to check for app version updates
 * Fetches version.json every 5 minutes and compares with CURRENT_VERSION
 * Returns true if a newer version is available
 */
export const useVersionCheck = (): boolean => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const checkVersion = async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      // Fetch version.json with cache-busting query parameter
      const response = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        console.warn('Version check: Failed to fetch version.json', response.status);
        isCheckingRef.current = false;
        return;
      }

      const data: VersionResponse = await response.json();

      if (!data.version) {
        console.warn('Version check: No version field in response');
        isCheckingRef.current = false;
        return;
      }

      // Compare versions - if remote version is different (newer), update is available
      const remoteVersion = data.version.trim();
      const currentVersion = CURRENT_VERSION.trim();

      if (remoteVersion !== currentVersion) {
        // Check if remote is actually newer
        const isNewer = compareVersions(remoteVersion, currentVersion);
        if (isNewer) {
          setIsUpdateAvailable(true);
        } else {
          // Remote version is older or same, no update needed
          setIsUpdateAvailable(false);
        }
      } else {
        // Versions match, no update needed
        setIsUpdateAvailable(false);
      }
    } catch (error) {
      // Silently fail - don't spam console with errors
      console.debug('Version check: Error checking version', error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkVersion();

    // Set up interval to check every 5 minutes
    intervalRef.current = setInterval(() => {
      checkVersion();
    }, CHECK_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return isUpdateAvailable;
};
