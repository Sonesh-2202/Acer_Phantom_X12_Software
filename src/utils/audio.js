/**
 * Tactical Web Audio API Synthesizer
 * Zero audio assets required. Crisp, micro-damped mechanical acoustic feedback.
 */

class TacticalAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.08) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  click() {
    this.playTone(1800, 'sine', 0.035, 0.05);
  }

  slider() {
    this.playTone(2800, 'triangle', 0.02, 0.025);
  }

  toggle() {
    this.playTone(880, 'sine', 0.05, 0.07);
  }

  ack() {
    if (!this.enabled) return;
    this.playTone(1200, 'sine', 0.06, 0.07);
    setTimeout(() => this.playTone(1800, 'sine', 0.09, 0.07), 75);
  }

  boot() {
    if (!this.enabled) return;
    [440, 660, 880, 1320].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.07, 0.05), idx * 65);
    });
  }
}

export const sound = new TacticalAudioEngine();
