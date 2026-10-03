/**
 * Web Audio API based Sound Synthesizer for In-App Calls & Ringers
 * Generates crystal-clear ringtones, call progress beeps, and chimes
 * without relying on external MP3 files that may fail or get blocked by CORS.
 */

class CallAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: any = null;
  private outgoingInterval: any = null;
  private isRingtonePlaying = false;
  private isOutgoingPlaying = false;

  private getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays incoming phone ringtone melody in loop (Mozambique TeleMoto+ Ringtone)
   */
  startIncomingRingtone(): void {
    if (this.isRingtonePlaying) return;
    this.isRingtonePlaying = true;

    const playMelody = () => {
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        // Upbeat pleasant ringtone pattern (440Hz -> 554Hz -> 659Hz -> 880Hz)
        const notes = [
          { freq: 523.25, time: 0, dur: 0.12 },    // C5
          { freq: 659.25, time: 0.15, dur: 0.12 }, // E5
          { freq: 783.99, time: 0.3, dur: 0.15 },  // G5
          { freq: 1046.5, time: 0.48, dur: 0.25 }, // C6
          { freq: 783.99, time: 0.78, dur: 0.12 }, // G5
          { freq: 1046.5, time: 0.95, dur: 0.4 },  // C6
        ];

        notes.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, now + n.time);

          gain.gain.setValueAtTime(0.001, now + n.time);
          gain.gain.exponentialRampToValueAtTime(0.28, now + n.time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + n.time);
          osc.stop(now + n.time + n.dur);
        });
      } catch (err) {
        console.warn('Could not play incoming ringtone:', err);
      }
    };

    playMelody();
    this.ringtoneInterval = setInterval(playMelody, 2400);
  }

  stopIncomingRingtone(): void {
    this.isRingtonePlaying = false;
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  /**
   * Plays outgoing ringback tone ("tuuuut... tuuuut...")
   */
  startOutgoingRingback(): void {
    if (this.isOutgoingPlaying) return;
    this.isOutgoingPlaying = true;

    const playBeep = () => {
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Standard ringback tone dual frequency (425Hz European/Mozambican standard)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
        gain.gain.setValueAtTime(0.18, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.35);
      } catch (err) {
        console.warn('Could not play outgoing ringback:', err);
      }
    };

    playBeep();
    this.outgoingInterval = setInterval(playBeep, 3500);
  }

  stopOutgoingRingback(): void {
    this.isOutgoingPlaying = false;
    if (this.outgoingInterval) {
      clearInterval(this.outgoingInterval);
      this.outgoingInterval = null;
    }
  }

  /**
   * Plays call connected sound chime
   */
  playConnectedChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      [587.33, 880.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0.001, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.25);
      });
    } catch (err) {
      console.warn('Could not play connected chime:', err);
    }
  }

  /**
   * Plays call ended sound (three short low beeps)
   */
  playCallEndedTone(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      [0, 0.18, 0.36].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now + t);

        gain.gain.setValueAtTime(0.001, now + t);
        gain.gain.exponentialRampToValueAtTime(0.15, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + t);
        osc.stop(now + t + 0.14);
      });
    } catch (err) {
      console.warn('Could not play call ended tone:', err);
    }
  }

  stopAll(): void {
    this.stopIncomingRingtone();
    this.stopOutgoingRingback();
  }
}

export const callAudioSynthesizer = new CallAudioSynthesizer();
