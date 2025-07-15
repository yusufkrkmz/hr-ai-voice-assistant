import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

export type ButtonState = 'idle' | 'recording' | 'thinking' | 'speaking';

interface MicrophoneButtonProps {
  state: ButtonState;
  onClick: () => void;
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ state, onClick }) => {
  const getButtonContent = () => {
    switch (state) {
      case 'recording':
        return <Mic className="w-12 h-12 text-red-500" />;
      case 'thinking':
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
      case 'speaking':
        return <Mic className="w-12 h-12 text-green-500" />;
      default:
        return <Mic className="w-12 h-12 text-gray-600" />;
    }
  };

  const getButtonClasses = () => {
    const baseClasses = "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer backdrop-blur-lg border border-white/20 shadow-2xl";
    
    switch (state) {
      case 'recording':
        return `${baseClasses} bg-red-500/20 animate-pulse shadow-red-500/50`;
      case 'thinking':
        return `${baseClasses} bg-blue-500/20 animate-pulse shadow-blue-500/50`;
      case 'speaking':
        return `${baseClasses} bg-green-500/20 animate-bounce shadow-green-500/50`;
      default:
        return `${baseClasses} bg-white/10 hover:bg-white/20 hover:scale-110 shadow-black/20`;
    }
  };

  return (
    <div className="relative">
      {/* Outer glow ring for recording state */}
      {state === 'recording' && (
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-red-500/30 animate-ping"></div>
      )}
      
      {/* Speaking waveform animation */}
      {state === 'speaking' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-green-500/60 mx-0.5 rounded-full animate-pulse"
              style={{
                height: `${20 + Math.sin(Date.now() / 200 + i) * 10}px`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '1s'
              }}
            ></div>
          ))}
        </div>
      )}
      
      <button
        onClick={onClick}
        className={getButtonClasses()}
        disabled={state === 'thinking'}
      >
        {getButtonContent()}
      </button>
    </div>
  );
};

export default MicrophoneButton;