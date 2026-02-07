import React from 'react';

interface SandglassProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
}

const Sandglass: React.FC<SandglassProps> = ({ timeLeft, totalTime, isActive }) => {
  const percentage = totalTime > 0 ? 1 - (timeLeft / totalTime) : 0;
  
  // Top glass range roughly: y=10 to y=75. Height ~65.
  // Sand level moves down from 10.
  // At 0%: y=10. At 100%: y=75.
  const topSandY = 10 + (65 * percentage);
  
  // Bottom glass range roughly: y=85 to y=150. Height ~65.
  // Sand level moves up from 150.
  // We specify height of the rect.
  const bottomSandHeight = 65 * percentage;
  const bottomSandY = 150 - bottomSandHeight;

  return (
    <div className="w-12 h-24 relative ml-4 hidden sm:block" aria-hidden="true">
      <svg viewBox="0 0 100 160" className="w-full h-full drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] overflow-visible">
        <defs>
            <clipPath id="topGlassClip">
                <path d="M10 10 L90 10 L55 75 L45 75 Z" />
            </clipPath>
            <clipPath id="bottomGlassClip">
                <path d="M45 85 L55 85 L90 150 L10 150 Z" />
            </clipPath>
        </defs>

        {/* Glass Frame Background */}
        <path d="M5 5 L95 5 L55 75 L55 85 L95 155 L5 155 L45 85 L45 75 Z" 
              fill="white" stroke="black" strokeWidth="6" strokeLinejoin="round" />

        {/* Top Sand */}
        <g clipPath="url(#topGlassClip)">
            <rect x="0" y={topSandY} width="100" height="100" fill="#ffeb3b" />
        </g>

        {/* Bottom Sand */}
        <g clipPath="url(#bottomGlassClip)">
            <rect x="0" y={bottomSandY} width="100" height={bottomSandHeight} fill="#ffeb3b" />
        </g>

        {/* Falling Sand Stream */}
        {isActive && percentage < 0.99 && (
            <line x1="50" y1="75" x2="50" y2="150" stroke="#ffeb3b" strokeWidth="6" strokeDasharray="4 4" className="animate-flow" />
        )}

        {/* Glass Glare */}
        <path d="M80 15 L85 15" stroke="black" strokeWidth="2" opacity="0.2" />
        <path d="M80 20 L83 20" stroke="black" strokeWidth="2" opacity="0.2" />
        
        <path d="M80 140 L85 140" stroke="black" strokeWidth="2" opacity="0.2" />
        <path d="M80 145 L83 145" stroke="black" strokeWidth="2" opacity="0.2" />

      </svg>
      <style>{`
        @keyframes flow {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -8; }
        }
        .animate-flow {
            animation: flow 0.3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Sandglass;