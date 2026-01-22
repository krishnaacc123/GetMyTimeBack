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
  const baseStyle = "font-display text-xl px-6 py-3 border-4 border-black shadow-retro active:translate-x-[2px] active:translate-y-[2px] active:shadow-retro-hover transition-all duration-100 uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-retro-blue focus:ring-offset-2";
  
  let colorStyle = "";
  switch (variant) {
    case 'primary':
      colorStyle = "bg-retro-yellow text-black hover:bg-yellow-300";
      break;
    case 'secondary':
      colorStyle = "bg-white text-black hover:bg-gray-100";
      break;
    case 'danger':
      colorStyle = "bg-retro-pink text-white hover:bg-pink-400";
      break;
    case 'success':
      colorStyle = "bg-retro-green text-black hover:bg-green-300";
      break;
  }

  return (
    <button className={`${baseStyle} ${colorStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default RetroButton;