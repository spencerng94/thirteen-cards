import React from 'react';
import { AdPlaceholder } from './AdPlaceholder';

interface VictoryScreenProps {
  winnerName: string;
  isMe: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({ winnerName, isMe, onPlayAgain, onGoHome }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl text-center flex flex-col gap-6 transform transition-all hover:scale-105 duration-500">
        
        <div>
            {isMe ? (
                <div className="text-7xl mb-2 animate-bounce">🏆</div>
            ) : (
                <div className="text-7xl mb-2 grayscale opacity-80">👏</div>
            )}
        </div>

        <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 mb-2 filter drop-shadow-lg">
            {isMe ? 'VICTORY!' : 'GAME OVER'}
            </h1>
            
            <p className="text-xl text-gray-200 font-light">
            <span className="font-bold text-white text-2xl">{winnerName}</span> has won the match.
            </p>
        </div>

        <AdPlaceholder />

        <div className="flex flex-col gap-3">
          <button 
            onClick={onPlayAgain}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-green-500/50 transition-all active:scale-95"
          >
            Play Again
          </button>
          
          <button 
            onClick={onGoHome}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-xl border border-white/10 transition-all active:scale-95"
          >
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
};