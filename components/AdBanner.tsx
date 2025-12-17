import React, { useEffect } from 'react';

export const AdBanner: React.FC = () => {
  useEffect(() => {
    try {
      // @ts-ignore
      const adsbygoogle = window.adsbygoogle || [];
      // @ts-ignore
      if (window.adsbygoogle && window.adsbygoogle.loaded) {
          // If script already loaded, assume it handles auto-push or manually push if needed.
          // However, standard implementation is just push {}
          adsbygoogle.push({});
      } else {
          adsbygoogle.push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className="w-full min-h-[100px] flex justify-center my-2 overflow-hidden bg-black/20 rounded-xl border border-white/5">
        <ins className="adsbygoogle"
             style={{ display: 'block', width: '100%' }}
             data-ad-client="ca-pub-2492802068591531"
             data-ad-slot="5190017348"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
    </div>
  );
};