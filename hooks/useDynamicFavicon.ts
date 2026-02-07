import { useEffect, useRef, useCallback } from 'react';
import { TimerMode } from '../types';

export const useDynamicFavicon = (
  mode: TimerMode,
  timeLeft: number,
  totalDuration: number,
  isActive: boolean
) => {
  const faviconRef = useRef<HTMLLinkElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalHref = useRef<string>('');
  
  // Keep latest params in ref for animation loop
  const paramsRef = useRef({ mode, timeLeft, totalDuration, isActive });

  useEffect(() => {
    paramsRef.current = { mode, timeLeft, totalDuration, isActive };
  }, [mode, timeLeft, totalDuration, isActive]);

  useEffect(() => {
    // 1. Find or create link element
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    faviconRef.current = link;

    // 2. Store original favicon
    if (!originalHref.current) {
        originalHref.current = link.href;
    }

    // 3. Setup Canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 32;
      canvasRef.current.height = 32;
    }
  }, []);

  // Define the draw function
  const draw = useCallback(() => {
      const { mode, timeLeft, totalDuration, isActive } = paramsRef.current;
      const canvas = canvasRef.current;
      const link = faviconRef.current;

      if (!canvas || !link) return;

      // Restore default if IDLE
      if (mode === TimerMode.IDLE) {
         if (originalHref.current && link.href !== originalHref.current) {
             link.href = originalHref.current;
         }
         return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = 32;
      const h = 32;
      const cx = w / 2;
      const cy = h / 2;
      const r = 14;

      ctx.clearRect(0, 0, w, h);

      // --- Draw Favicon ---

      // 1. Background Circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();

      // 2. Progress Sector (Pie Chart)
      // Determine color based on mode
      const color = mode === TimerMode.STUDY ? '#ff80ab' : '#b9f6ca';
      
      // Calculate percentage
      const pct = totalDuration > 0 ? timeLeft / totalDuration : 0;
      const safePct = Math.max(0, Math.min(1, pct));
      
      // Draw remaining time as a filled sector
      // Start at -90deg (Top), draw clockwise proportional to time left
      const startAngle = -0.5 * Math.PI;
      const endAngle = startAngle + (2 * Math.PI * safePct);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r - 2, startAngle, endAngle, false); 
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // 3. Status Indicator
      if (isActive) {
          // Animation: Rotating white dot on the rim
          const now = Date.now();
          // Full rotation every 2 seconds
          const angle = (now % 2000) / 2000 * 2 * Math.PI; 
          
          const dotX = cx + Math.cos(angle) * r;
          const dotY = cy + Math.sin(angle) * r;

          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          
          // Small border for the dot
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
      } else {
          // Paused: Pause symbol (||)
          ctx.fillStyle = '#ffffff';
          const barW = 3;
          const barH = 10;
          const gap = 3;
          ctx.fillRect(cx - barW - gap/2, cy - barH/2, barW, barH);
          ctx.fillRect(cx + gap/2, cy - barH/2, barW, barH);
      }

      // 4. Update Link
      link.href = canvas.toDataURL('image/png');
  }, []);

  // Animation Loop Effect (Smooth 60fps when active)
  useEffect(() => {
    let animationFrameId: number;
    let isAnimating = false;

    const loop = () => {
        draw();
        if (paramsRef.current.isActive) {
            animationFrameId = requestAnimationFrame(loop);
            isAnimating = true;
        }
    };

    if (mode !== TimerMode.IDLE && isActive) {
        loop();
    } else {
        // One-off draw for paused/idle state changes
        draw();
    }

    return () => {
        if (isAnimating) cancelAnimationFrame(animationFrameId);
    };
  }, [mode, isActive, draw]);

  // Fallback Effect: Force redraw on timeLeft change
  // This ensures that if the tab is backgrounded and rAF is throttled,
  // we still update the pie chart when the Worker ticks (updating timeLeft).
  useEffect(() => {
      if (mode !== TimerMode.IDLE) {
          draw();
      }
  }, [timeLeft, mode, draw]);
};
