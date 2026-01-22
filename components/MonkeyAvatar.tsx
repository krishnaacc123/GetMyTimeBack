import React from 'react';
import { TimerMode } from '../types';

interface MonkeyAvatarProps {
  mode: TimerMode;
  isActive: boolean;
}

const MonkeyAvatar: React.FC<MonkeyAvatarProps> = ({ mode, isActive }) => {
  const isWork = mode === TimerMode.STUDY;
  
  // Since we are using native ES modules (via importmap), we cannot 'import' non-JS files.
  // We reference the image by its URL relative to the public root.
  const monkeySprite = '/utils/monkey.png';

  // Sprite Logic:
  // The sprite is a side-by-side image.
  // Left half (0% 0) = Break/Idle (Chilling)
  // Right half (100% 0) = Study (Working)
  // Background Size 200% 100% scales the image so one half fits the container width exactly.
  
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
      <div 
        className={`w-40 h-40 bg-contain bg-no-repeat transition-all duration-300 ${!isWork ? 'animate-wiggle-slow' : 'hover:scale-105 transition-transform'}`}
        style={{
          backgroundImage: `url(${monkeySprite})`, 
          backgroundSize: '200% 100%',
          backgroundPosition: isWork ? '100% 0' : '0 0',
          filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.25))'
        }}
        role="img"
        aria-label={isWork ? "Monkey working hard on laptop" : "Monkey chilling on the beach"}
      />
      
      {/* Optional Status Badge */}
      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border-2 border-black text-sm font-bold uppercase tracking-widest bg-white shadow-sm whitespace-nowrap transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
         {isWork ? 'Focusing...' : 'Relaxing...'}
      </div>
    </div>
  );
};

export default MonkeyAvatar;