import React from 'react';

interface InfoTooltipProps {
  text: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
  return (
    <div className="relative group inline-flex ml-2 items-center align-middle z-50">
        {/* Icon - Blue circle with 'i' */}
        <div className="w-5 h-5 rounded-full bg-retro-blue border-2 border-black flex items-center justify-center cursor-help transition-transform hover:scale-110 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none">
            <span className="font-display text-white text-sm mt-[2px]">i</span>
        </div>
        
        {/* Tooltip Popup - Retro style matching image */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3 bg-white border-2 border-black text-black text-xs font-body font-bold leading-relaxed shadow-retro hidden group-hover:block z-50 pointer-events-none text-left">
            {text}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black"></div>
        </div>
    </div>
  );
};

export default InfoTooltip;