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

    // A snappy card flick sound using two oscillators
    const now = this.context.currentTime;
    
    // Body of the flick
    const osc1 = this.context.createOscillator();
    const gain1 = this.createGain(0.12, 0.08);
    if (!gain1) return;
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(900, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.context.destination);
    
    // Snap/High frequency component
    const osc2 = this.context.createOscillator();
    const gain2 = this.createGain(0.05, 0.04);
    if (!gain2) return;
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2000, now);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.05);
    osc2.connect(gain2);
    gain2.connect(this.context.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.12);
    osc2.stop(now + 0.05);
  }

  playPass() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.createGain(0.25, 0.04);
    if (!gain) return;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 0.25);
  }

  playTurn() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const playTone = (freq: number, startTime: number, vol: number = 0.05) => {
      if (!this.context) return;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    };

    const now = this.context.currentTime;
    playTone(660, now, 0.04);
    playTone(880, now + 0.1, 0.04);
  }

  playVictory() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    // Celebratory C Major Arpeggio with richer harmonics
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; 
    const now = this.context.currentTime;

    notes.forEach((freq, i) => {
      if (!this.context) return;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.06, now + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.8);
    });
  }

  playBomb() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.createGain(1.0, 0.18);
    if (!gain) return;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 1.0);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 1.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 1.0);
  }
}

export const audioService = new AudioService();
