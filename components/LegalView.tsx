import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../constants/legalText';

// Helper function to convert markdown-like text to JSX
const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const ListTag = listType === 'ul' ? 'ul' : 'ol';
      elements.push(
        <ListTag key={`list-${elements.length}`} className="list-disc list-inside text-gray-300 text-sm space-y-2 ml-4 mb-4">
          {currentList.map((item, idx) => (
            <li key={idx} className="leading-relaxed">{item.replace(/^[-*]\s+/, '')}</li>
          ))}
        </ListTag>
      );
      currentList = [];
      inList = false;
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={idx} className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 uppercase tracking-tight mb-6 mt-8">
          {trimmed.substring(2)}
        </h1>
      );
      return;
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={idx} className="text-2xl font-black text-yellow-500 uppercase tracking-wider mb-4 mt-6 flex items-center gap-3">
          <span className="w-1 h-6 bg-yellow-500/50"></span>
          {trimmed.substring(3)}
        </h2>
      );
      return;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={idx} className="text-xl font-bold text-white mb-3 mt-4">
          {trimmed.substring(4)}
        </h3>
      );
      return;
    }

    // Bold text (markdown style)
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      flushList();
      const content = trimmed.slice(2, -2);
      elements.push(
        <p key={idx} className="text-yellow-200 font-bold text-sm mb-3">
          {content}
        </p>
      );
      return;
    }

    // List item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        flushList();
        inList = true;
        listType = 'ul';
      }
      currentList.push(trimmed);
      return;
    }

    // Regular paragraph
    flushList();
    
    // Check for inline bold
    const processedLine = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
    
    elements.push(
      <p 
        key={idx} 
        className="text-gray-300 text-sm leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: processedLine }}
      />
    );
  });

  flushList();
  return elements;
};

export const LegalView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTerms = location.pathname === '/terms';
  const content = isTerms ? TERMS_OF_SERVICE : PRIVACY_POLICY;
  const title = isTerms ? 'TERMS OF SERVICE' : 'PRIVACY POLICY';

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1a1a0a_0%,_#000000_100%)]"></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with Back Button */}
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-yellow-500/20 p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-yellow-400 transition-all duration-300 active:scale-95"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-4 h-4 group-hover:-translate-x-1 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Home</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">LEGAL DOCUMENT</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
          <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
            {/* Title Section */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.02]">
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 uppercase tracking-tight mb-2">
                {title}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">
                  {isTerms ? 'LEGAL AGREEMENT' : 'PRIVACY INFORMATION'}
                </span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 md:p-10 space-y-6 bg-transparent overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-yellow-500/20 scrollbar-track-transparent">
              <div className="prose prose-invert prose-sm max-w-none">
                {renderMarkdown(content)}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="group relative overflow-hidden px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 active:scale-95 border border-yellow-400/30 shadow-[0_15px_40px_rgba(234,179,8,0.2)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                  <span className="relative z-10 text-black flex items-center justify-center gap-3 drop-shadow-md font-bold">
                    Return to Game
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
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
