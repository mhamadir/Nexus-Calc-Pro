/**
 * Crisp, satisfying mechanical-click synthesizer and Web Haptic feedback trigger.
 * Built with Web Audio API for zero latency and zero assets dependencies.
 */

let audioCtx: AudioContext | null = null;

export function playMechanicalClick() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    // Transient start click
    const pluck = audioCtx.createOscillator();
    const pluckGain = audioCtx.createGain();
    pluck.type = 'sine';
    pluck.frequency.setValueAtTime(2500, now);
    pluck.frequency.exponentialRampToValueAtTime(1000, now + 0.01);
    
    pluckGain.gain.setValueAtTime(0.12, now);
    pluckGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
    
    // Lower body crisp vibration
    const body = audioCtx.createOscillator();
    const bodyGain = audioCtx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(900, now);
    body.frequency.exponentialRampToValueAtTime(100, now + 0.035);
    
    bodyGain.gain.setValueAtTime(0.18, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    // Setup routing
    pluck.connect(pluckGain);
    pluckGain.connect(audioCtx.destination);
    
    body.connect(bodyGain);
    bodyGain.connect(audioCtx.destination);
    
    // Play with instant scheduling
    pluck.start(now);
    pluck.stop(now + 0.015);
    
    body.start(now);
    body.stop(now + 0.045);
  } catch (error) {
    console.warn('Web Audio API is not supported or was blocked by browser security policy:', error);
  }
}

export function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(12);
    } catch (e) {
      // Ignore vibration error under guest sandboxing
    }
  }
}

