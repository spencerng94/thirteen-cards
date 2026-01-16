import React, { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface AppInfo {
  version: string;
  build: string;
  platform: string;
}

export function AppVersionInfo() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Fetch from native plugin
          const info = await App.getInfo();
          setAppInfo({
            version: info.version,
            build: info.build,
            platform: Capacitor.getPlatform(),
          });
        } else {
          // Web platform - show fallback
          setAppInfo({
            version: 'Web Build',
            build: 'N/A',
            platform: 'web',
          });
        }
      } catch (error) {
        console.error('Error fetching app info:', error);
        // Fallback to web build if there's an error
        setAppInfo({
          version: 'Web Build',
          build: 'N/A',
          platform: 'web',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <span className="w-3 h-3 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin"></span>
          <span className="text-[9px] font-medium uppercase tracking-widest">Loading version info...</span>
        </div>
      </div>
    );
  }

  if (!appInfo) {
    return null;
  }

  return (
    <div className="pt-4 border-t border-white/5">
      <div className="flex flex-col items-center justify-center gap-1 text-gray-400">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest">Version</span>
          <span className="text-[9px] font-mono text-yellow-500/80">{appInfo.version}</span>
        </div>
        {appInfo.platform !== 'web' && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest">Build</span>
            <span className="text-[9px] font-mono text-yellow-500/80">{appInfo.build}</span>
          </div>
        )}
        <div className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">
          {appInfo.platform === 'web' ? 'Web Platform' : `${appInfo.platform.charAt(0).toUpperCase() + appInfo.platform.slice(1)} Platform`}
        </div>
      </div>
    </div>
  );
}
