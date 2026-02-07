
let audioContext: AudioContext | null = null;
let silenceSource: AudioBufferSourceNode | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      audioContext = new AudioContext();
    }
  }
  return audioContext;
};

export const playAlarm = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Ensure context is running (user interaction usually ensures this)
    if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error("Failed to resume audio context", e));
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Use a Sine wave for a clean "pop"
    osc.type = 'sine';
    
    // Frequency sweep: High to Low creates the "pop" or "bubble" character
    // 800Hz dropping to 400Hz mimics a small bubble pop or message 'tick'
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    
    // Envelope: Fast attack, fast decay
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01); // Quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); // Short decay

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    
    // Garbage collection handles the disconnected nodes
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

/**
 * Starts a silent audio loop. 
 * This forces the browser to keep the tab active (prevent throttling) 
 * because it perceives the tab as playing audio.
 */
export const startBackgroundSilence = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        // If already playing, do nothing
        if (silenceSource) return;

        // Create a 1-second buffer. 
        // By default createBuffer initializes with silence (zeros).
        const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(ctx.destination);
        source.start();
        
        silenceSource = source;
    } catch (e) {
        console.error("Failed to start background silence", e);
    }
};

export const stopBackgroundSilence = () => {
    if (silenceSource) {
        try {
            silenceSource.stop();
            silenceSource.disconnect();
        } catch (e) {
            // Ignore errors if already stopped
        }
        silenceSource = null;
    }
};
