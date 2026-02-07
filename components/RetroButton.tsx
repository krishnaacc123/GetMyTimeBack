import React from 'react';

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

const RetroButton: React.FC<RetroButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  // Added focus:outline-none focus:ring-4 focus:ring-retro-blue focus:ring-offset-2 for accessibility
  const baseStyle = "font-display text-xl px-6 py-3 border-4 border-black shadow-retro transition-all duration-100 uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-retro-blue focus:ring-offset-2";
  
  // Interaction styles: only apply hover/active if NOT disabled
  const interactionStyle = props.disabled 
    ? "opacity-50 cursor-not-allowed active:translate-x-0 active:translate-y-0 active:shadow-retro" 
    : "active:translate-x-[2px] active:translate-y-[2px] active:shadow-retro-hover";

  let colorStyle = "";
  switch (variant) {
    case 'primary':
      colorStyle = props.disabled ? "bg-retro-yellow text-black" : "bg-retro-yellow text-black hover:bg-yellow-300";
      break;
    case 'secondary':
      colorStyle = props.disabled ? "bg-white text-black" : "bg-white text-black hover:bg-gray-100";
      break;
    case 'danger':
      colorStyle = props.disabled ? "bg-retro-pink text-white" : "bg-retro-pink text-white hover:bg-pink-400";
      break;
    case 'success':
      colorStyle = props.disabled ? "bg-retro-green text-black" : "bg-retro-green text-black hover:bg-green-300";
      break;
  }

  return (
    <button className={`${baseStyle} ${interactionStyle} ${colorStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default RetroButton;