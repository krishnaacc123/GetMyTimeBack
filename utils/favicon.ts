
import { TimerMode } from '../types';

export const drawFaviconFallback = (timeLeft: number, totalDuration: number, mode: TimerMode): string | null => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    const w = 32;
    const h = 32;
    const cx = w / 2;
    const cy = h / 2;
    const r = 14;

    ctx.clearRect(0, 0, w, h);

    // 1. Background Circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    // 2. Progress Sector (Pie Chart)
    const color = mode === TimerMode.STUDY ? '#ff80ab' : '#b9f6ca';
    // Calculate percentage
    const pct = totalDuration > 0 ? timeLeft / totalDuration : 0;
    const safePct = Math.max(0, Math.min(1, pct));
    
    // Draw remaining time as a filled sector
    // Start at -90deg (Top), draw clockwise
    const startAngle = -0.5 * Math.PI;
    const endAngle = startAngle + (2 * Math.PI * safePct);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r - 2, startAngle, endAngle, false); 
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // 3. Status Indicator
    const now = Date.now();
    // Blink every second (approximate since this is called on tick)
    if (Math.floor(now / 500) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy - r, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    return canvas.toDataURL('image/png');
};
