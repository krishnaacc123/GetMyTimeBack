
// This code runs in a separate thread (Web Worker)
// It is defined as a string here to avoid complex build configuration for specific worker files.
const workerCode = `
// Helper to draw the favicon
function drawFavicon(ctx, timeLeft, totalDuration, mode) {
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
   const color = mode === 'STUDY' ? '#ff80ab' : '#b9f6ca';
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

   // 3. Status Indicator (Simple breathing dot at the top to indicate life)
   const now = Date.now();
   // Blink every second
   if (Math.floor(now / 500) % 2 === 0) {
       ctx.beginPath();
       ctx.arc(cx, cy - r, 2, 0, 2 * Math.PI);
       ctx.fillStyle = '#ffffff';
       ctx.fill();
   }
}

self.onmessage = function(e) {
  const { command, duration, mode, totalDuration } = e.data;

  if (command === 'START') {
    const endTime = Date.now() + (duration * 1000);
    self.currentMode = mode;
    self.totalDuration = totalDuration || duration;

    // Initialize OffscreenCanvas if supported
    if (typeof OffscreenCanvas !== 'undefined' && !self.canvas) {
        self.canvas = new OffscreenCanvas(32, 32);
        self.ctx = self.canvas.getContext('2d');
    }
    
    // Clear any existing interval
    if (self.timerId) clearInterval(self.timerId);

    const tick = () => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);
      
      if (remaining <= 0) {
        self.postMessage({ type: 'COMPLETE' });
        clearInterval(self.timerId);
      } else {
        // Generate Favicon
        if (self.ctx) {
            drawFavicon(self.ctx, remaining, self.totalDuration, self.currentMode);
            self.canvas.convertToBlob({ type: 'image/png' }).then(blob => {
                self.postMessage({ type: 'TICK', timeLeft: remaining, faviconBlob: blob });
            }).catch(err => {
                // Fallback if blob generation fails
                self.postMessage({ type: 'TICK', timeLeft: remaining });
            });
        } else {
            self.postMessage({ type: 'TICK', timeLeft: remaining });
        }
      }
    };

    // Run immediately
    tick();
    self.timerId = setInterval(tick, 1000);
  } 
  else if (command === 'STOP') {
    if (self.timerId) clearInterval(self.timerId);
  }
};
`;

export const createTimerWorker = (): Worker => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};