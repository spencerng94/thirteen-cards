
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

/* Removed redundant declare global block for aistudio as it conflicts with existing system declarations */

type Resolution = '1K' | '2K' | '4K';

export const AiForge: React.FC = () => {
  const [prompt, setPrompt] = useState('High quality premium, satisfying looking icon for the XIII gems, luxury gemstone aesthetic, crystalline reflections, gold frame, detailed 3D rendering');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    /* Fixed: Assume aistudio is globally available per instructions and use type assertion to avoid conflict */
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    setHasApiKey(hasKey);
  };

  const handleSelectKey = async () => {
    /* Fixed: Assume aistudio is globally available per instructions and use type assertion to avoid conflict */
    await (window as any).aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const handleGenerate = async () => {
    if (!hasApiKey) {
      await handleSelectKey();
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImageUrl(null);

    try {
      /* Get API key from aistudio global object or environment variable */
      // In Vite, environment variables must be prefixed with VITE_ to be exposed to client
      // However, since we're using aistudio.hasSelectedApiKey(), the key should come from the aistudio context
      const apiKey = (window as any).aistudio?.getApiKey?.() || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
      
      if (!apiKey) {
        throw new Error("API key not found. Please configure your API key.");
      }
      
      /* Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key */
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: resolution
          }
        },
      });

      let foundImageUrl = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          foundImageUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }

      if (foundImageUrl) {
        setGeneratedImageUrl(foundImageUrl);
      } else {
        throw new Error("No image was generated in the response.");
      }
    } catch (err: any) {
      console.error(err);
      /* If the request fails with an error containing "Requested entity was not found.", reset key selection state */
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key error. Please re-select your key.");
        setHasApiKey(false);
      } else {
        setError(err.message || "Failed to generate image.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 bg-white/[0.02] p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] italic">AI FORGE MANIFEST</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your elite asset..."
            className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white font-medium text-sm focus:border-yellow-500/50 outline-none min-h-[100px] resize-none transition-all placeholder:text-white/10"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex flex-col gap-2 flex-1 w-full">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Resolution Quality</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-black/60 rounded-2xl border border-white/5 shadow-inner">
              {(['1K', '2K', '4K'] as Resolution[]).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${resolution === res ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`
              h-16 px-12 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] transition-all active:scale-95 shadow-2xl relative overflow-hidden group w-full sm:w-auto
              ${isGenerating ? 'bg-white/5 text-white/20 grayscale pointer-events-none' : 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 text-white'}
            `}
          >
            {isGenerating ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>FORGING...</span>
              </div>
            ) : (
              <span className="relative z-10 flex items-center justify-center gap-2">
                INITIATE FORGE <span className="text-lg">🔥</span>
              </span>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>

        {!hasApiKey && (
          <div className="mt-2 text-center">
            <p className="text-[8px] font-bold text-rose-500 uppercase tracking-widest mb-2">API Key Required for 1K/2K/4K Nano Banana Pro Generation</p>
            <button onClick={handleSelectKey} className="text-[10px] font-black text-yellow-500 hover:text-yellow-400 underline underline-offset-4 tracking-widest transition-colors uppercase">
              Configure AI Key
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center min-h-[300px] bg-black/40 rounded-[3rem] border border-white/5 shadow-inner relative overflow-hidden">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-24 h-24 rounded-full border-t-2 border-r-2 border-yellow-500 animate-spin"></div>
            <div className="text-center">
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.6em]">WEAVING CELESTIAL PIXELS</p>
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.4em] mt-2">Nano Banana Pro series models take 15-30s</p>
            </div>
          </div>
        ) : generatedImageUrl ? (
          <div className="p-4 w-full h-full flex flex-col items-center gap-6 animate-in zoom-in-95 duration-700">
            <div className="relative group">
              <img src={generatedImageUrl} alt="Generated asset" className="max-w-full max-h-[400px] rounded-3xl shadow-2xl border border-white/10" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl backdrop-blur-sm">
                <a 
                  href={generatedImageUrl} 
                  download="thirteen-forge-asset.png" 
                  className="px-8 py-3 bg-yellow-500 text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all"
                >
                  SAVE TO LOCAL DRIVE
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Asset Refined and Ready for Deployment</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 text-center px-12">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/30">
               <span className="text-3xl">⚠️</span>
            </div>
            <p className="text-rose-400 font-black uppercase tracking-widest text-sm italic">{error}</p>
            <button onClick={handleGenerate} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-[0.2em] transition-colors underline decoration-white/20 underline-offset-4">Retry Forge</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 opacity-30">
             <div className="w-32 h-32 rounded-[2.5rem] border-2 border-dashed border-white/20 flex items-center justify-center">
                <span className="text-6xl italic font-serif">?</span>
             </div>
             <div className="text-center">
               <p className="text-[10px] font-black uppercase tracking-[0.8em]">Arena Forge Standby</p>
               <p className="text-[8px] font-bold uppercase tracking-[0.4em] mt-3">Manifest custom elite assets via AI</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-8 py-4 bg-white/[0.02] border border-white/5 rounded-2xl">
         <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Model: nano-banana-pro-image</span>
            <div className="w-[1px] h-4 bg-white/10"></div>
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Format: PNG-24</span>
         </div>
         <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[9px] font-black text-yellow-500/60 hover:text-yellow-500 transition-colors uppercase tracking-widest">Billing & Limits Codex</a>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
      `}} />
    </div>
  );
};
