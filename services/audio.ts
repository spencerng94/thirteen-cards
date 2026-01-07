
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

    const now = this.context.currentTime;
    
    const osc1 = this.context.createOscillator();
    const gain1 = this.createGain(0.12, 0.08);
    if (!gain1) return;
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(900, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.context.destination);
    
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

    const now = this.context.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      
      osc.type = i === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(this.context!.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 1.2);
    });

    const sub = this.context.createOscillator();
    const subGain = this.context.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(60, now + 0.8);
    sub.frequency.linearRampToValueAtTime(100, now + 2.0);
    subGain.gain.setValueAtTime(0, now + 0.8);
    subGain.gain.linearRampToValueAtTime(0.2, now + 1.0);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    sub.connect(subGain);
    subGain.connect(this.context.destination);
    sub.start(now + 0.8);
    sub.stop(now + 2.5);
  }

  playBomb() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    
    const subOsc = this.context.createOscillator();
    const subGain = this.context.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    subOsc.connect(subGain);
    subGain.connect(this.context.destination);
    subOsc.start();
    subOsc.stop(now + 0.5);

    const osc = this.context.createOscillator();
    const gain = this.createGain(1.8, 0.25);
    if (!gain) return;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 1.8);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 1.8);
  }

  playPurchase() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; 
    
    freqs.forEach((f, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.5);
      
      osc.connect(gain);
      gain.connect(this.context!.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.5);
    });
  }

  playGemPurchase() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    
    // Ascending arpeggio for excitement
    const arpeggio = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98];
    
    arpeggio.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      
      osc.type = i < 3 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      
      const volume = 0.12 - (i * 0.01);
      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(volume, now + i * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.4);
      
      osc.connect(gain);
      gain.connect(this.context!.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.4);
    });

    // Add a satisfying "pop" at the end
    const pop = this.context.createOscillator();
    const popGain = this.context.createGain();
    const popFilter = this.context.createBiquadFilter();
    
    pop.type = 'sine';
    pop.frequency.setValueAtTime(800, now + 0.4);
    pop.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    
    popFilter.type = 'lowpass';
    popFilter.frequency.setValueAtTime(2000, now + 0.4);
    popFilter.frequency.exponentialRampToValueAtTime(400, now + 0.5);
    
    popGain.gain.setValueAtTime(0, now + 0.4);
    popGain.gain.linearRampToValueAtTime(0.15, now + 0.42);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    
    pop.connect(popFilter);
    popFilter.connect(popGain);
    popGain.connect(this.context.destination);
    pop.start(now + 0.4);
    pop.stop(now + 0.5);
  }

  playEmote() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.createGain(0.2, 0.1);
    if (!gain) return;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 0.2);
  }

  playStartMatch() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;

    const base = this.context.createOscillator();
    const baseGain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    base.type = 'sine';
    base.frequency.setValueAtTime(130.81, now); // C3
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    
    baseGain.gain.setValueAtTime(0, now);
    baseGain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    baseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    base.connect(filter);
    filter.connect(baseGain);
    baseGain.connect(this.context.destination);
    base.start(now);
    base.stop(now + 2.0);

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      const startTime = now + (i * 0.1);
      const osc = this.context!.createOscillator();
      const hGain = this.context!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      hGain.gain.setValueAtTime(0, startTime);
      hGain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      hGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

      osc.connect(hGain);
      hGain.connect(this.context!.destination);
      osc.start(startTime);
      osc.stop(startTime + 1.2);
    });

    const tap = this.context.createOscillator();
    const tapGain = this.context.createGain();
    tap.type = 'triangle';
    tap.frequency.setValueAtTime(600, now);
    tap.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    tapGain.gain.setValueAtTime(0.05, now);
    tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    tap.connect(tapGain);
    tapGain.connect(this.context.destination);
    tap.start(now);
    tap.stop(now + 0.05);
  }

  playExpandHand() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.createGain(0.15, 0.06);
    if (!gain) return;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 0.15);
  }

  playCollapseHand() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.createGain(0.12, 0.05);
    if (!gain) return;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.12);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 0.12);
  }

  playSqueakyToy() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;
    
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    // Squeaky toy sound - high frequency that drops
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playAchievement() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    
    // Achievement sound - triumphant fanfare
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 1975.53];
    
    notes.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      
      osc.type = i < 4 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      
      const volume = 0.15 - (i * 0.015);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(volume, now + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.6);
      
      osc.connect(gain);
      gain.connect(this.context!.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.6);
    });

    // Add a satisfying "ding" at the end
    const ding = this.context.createOscillator();
    const dingGain = this.context.createGain();
    
    ding.type = 'sine';
    ding.frequency.setValueAtTime(800, now + 0.7);
    ding.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
    
    dingGain.gain.setValueAtTime(0, now + 0.7);
    dingGain.gain.linearRampToValueAtTime(0.2, now + 0.72);
    dingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    
    ding.connect(dingGain);
    dingGain.connect(this.context.destination);
    ding.start(now + 0.7);
    ding.stop(now + 0.8);
  }

  playTicking() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    
    // Ticking clock sound - short, sharp click
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.setValueAtTime(5, now);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playCoinClink() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    
    // Coin clinking sound - metallic chime
    const coins = [880, 1108.73, 1318.51]; // A5, C#6, E6
    
    coins.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const filter = this.context!.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      
      // Metallic filter
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, now + i * 0.05);
      filter.Q.setValueAtTime(10, now + i * 0.05);
      
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.3);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.context!.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.3);
    });
  }

  playXpRising() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const now = this.context.currentTime;
    
    // Rising whistle sound for XP
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
    
    // Whistle-like filter
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
    filter.Q.setValueAtTime(15, now);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const audioService = new AudioService();
