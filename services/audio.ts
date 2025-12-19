
class AudioService {
  private context: AudioContext | null = null;
  private enabled: boolean = true;

  private initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private createGain(duration: number, startVolume: number = 0.1) {
    if (!this.context) return null;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(startVolume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    return gain;
  }

  playPlay() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.createGain(0.1, 0.05);
    if (!gain) return;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(this.context.currentTime + 0.1);
  }

  playPass() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.createGain(0.2, 0.03);
    if (!gain) return;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(this.context.currentTime + 0.2);
  }

  playTurn() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const playTone = (freq: number, startTime: number) => {
      if (!this.context) return;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.05, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    };

    const now = this.context.currentTime;
    playTone(660, now);
    playTone(880, now + 0.1);
  }

  playVictory() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.context.currentTime;

    notes.forEach((freq, i) => {
      if (!this.context) return;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.05, now + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.6);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.6);
    });
  }

  playBomb() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.createGain(0.8, 0.15);
    if (!gain) return;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.context.currentTime + 0.8);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, this.context.currentTime + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(this.context.currentTime + 0.8);
  }
}

export const audioService = new AudioService();
