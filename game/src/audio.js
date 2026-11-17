// Neon Harbor — all sound is synthesised with WebAudio, no audio files.
// The context is created on the first user gesture; every call is guarded
// so a headless screenshot run (no gesture, no audio) stays silent and
// error-free. M toggles mute.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let sirenNodes = null;
  let engineNodes = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function tone(freq, duration, type, volume, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + duration);
      gain.gain.setValueAtTime(volume || 0.12, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + duration + 0.02);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  function noise(duration, volume, lowpass) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * duration);
      const buffer = c.createBuffer(1, len, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const gain = c.createGain();
      gain.gain.value = volume || 0.2;
      let node = src;
      if (lowpass) {
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowpass;
        src.connect(filter);
        node = filter;
      }
      node.connect(gain).connect(c.destination);
      src.start();
    } catch {
      // Ignore audio failures.
    }
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (muted) this.stopSiren();
      return muted;
    },
    isMuted() {
      return muted;
    },
    gunshot() {
      noise(0.14, 0.3, 2400);
      tone(180, 0.08, 'square', 0.1, 60);
    },
    enemyShot() {
      noise(0.1, 0.14, 1800);
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.14);
      setTimeout(() => tone(990, 0.12, 'sine', 0.14), 80);
    },
    cash() {
      tone(880, 0.08, 'triangle', 0.14);
      setTimeout(() => tone(1174, 0.08, 'triangle', 0.14), 70);
      setTimeout(() => tone(1568, 0.16, 'triangle', 0.14), 140);
    },
    missionJingle() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.15), i * 110));
    },
    busted() {
      tone(220, 0.5, 'sawtooth', 0.12, 110);
    },
    crash() {
      noise(0.25, 0.25, 900);
    },
    engine(speed01) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      try {
        if (!engineNodes) {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = 60;
          gain.gain.value = 0.0;
          osc.connect(gain).connect(c.destination);
          osc.start();
          engineNodes = { osc, gain };
        }
        engineNodes.osc.frequency.value = 55 + speed01 * 140;
        engineNodes.gain.gain.value = 0.03 + speed01 * 0.04;
      } catch {
        // Ignore audio failures.
      }
    },
    engineOff() {
      if (engineNodes) {
        try {
          engineNodes.gain.gain.value = 0;
        } catch {
          // Ignore.
        }
      }
    },
    startSiren() {
      if (muted || sirenNodes) return;
      const c = ensure();
      if (!c) return;
      try {
        const osc = c.createOscillator();
        const gain = c.createGain();
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 750;
        lfo.type = 'sine';
        lfo.frequency.value = 0.7;
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.value = 0.045;
        osc.connect(gain).connect(c.destination);
        osc.start();
        lfo.start();
        sirenNodes = { osc, lfo, gain };
      } catch {
        // Ignore audio failures.
      }
    },
    stopSiren() {
      if (!sirenNodes) return;
      try {
        sirenNodes.osc.stop();
        sirenNodes.lfo.stop();
      } catch {
        // Already stopped.
      }
      sirenNodes = null;
    },
  };
}
