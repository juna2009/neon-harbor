import { RADIO_STATIONS } from './config.js';
import { createMusic } from './music.js';
import { createSfx } from './sfx.js';
export function createAudio() {
  let ctx = null;
  let muted = false;
  let volume = 0.8;
  let master = null;
  let sirenNodes = null;
  let engineNodes = null;
  let fireNodes = null; // VEHICLE-DAMAGE-P1: loop crackle api (Heavily)
  let stationIndex = 0;
  let music = null;
  let sfx = null;
  function ensureMusic() {
    const c = ensure();
    if (!c || !master) return null;
    if (!music) music = createMusic(c, master);
    return music;
  }
  function ensureSfx() {
    if (!sfx) sfx = createSfx();
    return sfx;
  }
  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
    return ctx;
  }
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    const s = ensureSfx();
    if (s) s.unlock();
  }
  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master && ctx) master.gain.value = muted ? 0 : volume;
    return volume;
  }
  function tone(freq, duration, type, vol, slideTo, when) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const t0 = when || c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
      gain.gain.setValueAtTime(vol || 0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
    }
  }
  function noise(duration, vol, lowpass, when) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const t0 = when || c.currentTime;
      const len = Math.floor(c.sampleRate * duration);
      const buffer = c.createBuffer(1, len, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const gain = c.createGain();
      gain.gain.value = vol || 0.2;
      let node = src;
      if (lowpass) {
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowpass;
        src.connect(filter);
        node = filter;
      }
      node.connect(gain).connect(master);
      src.start(t0);
    } catch {
    }
  }
  function startRadio(index) {
    if (typeof index === 'number') stationIndex = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    const m = ensureMusic();
    if (m) m.startLoop(stationIndex);
  }
  function stopRadio() {
    if (music) music.stopLoop();
  }
  function setStation(index) {
    stationIndex = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    const m = ensureMusic();
    return m ? m.setLoop(stationIndex) : RADIO_STATIONS[stationIndex].name;
  }
  function nextStation() {
    return setStation(stationIndex + 1);
  }
  return {
    unlock,
    setVolume,
    getVolume() { return volume; },
    toggleMute() {
      muted = !muted;
      if (master && ctx) master.gain.value = muted ? 0 : volume;
      if (muted) this.stopSiren();
      const s = ensureSfx();
      if (s && s.isMuted() !== muted) s.toggleMute();
      return muted;
    },
    isMuted() {
      return muted;
    },
    startRadio,
    stopRadio,
    setStation,
    nextStation,
    stationName() { return RADIO_STATIONS[stationIndex].name; },
    stationIndex() { return stationIndex; },
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
      const m = ensureMusic();
      if (m) m.jingle('cash');
    },
    repair() {
      tone(1244, 0.07, 'square', 0.08);
      setTimeout(() => tone(1568, 0.07, 'square', 0.08), 90);
      setTimeout(() => tone(2093, 0.18, 'triangle', 0.12), 180);
    },
    tirePop() {
      noise(0.2, 0.3, 500);
      tone(90, 0.18, 'sawtooth', 0.12, 40);
    },
    missionJingle() {
      const m = ensureMusic();
      if (m) m.jingle('mission');
    },
    wanted() {
      const m = ensureMusic();
      if (m) m.jingle('wanted');
    },
    busted() {
      const m = ensureMusic();
      if (m) m.jingle('busted');
    },
    wasted() {
      const m = ensureMusic();
      if (m) m.jingle('wasted');
    },
    blackout() {
      const m = ensureMusic();
      if (m) m.jingle('blackout');
    },
    bigExplosion() {
      ensureSfx().bigExplosion();
    },
    waterSpray() {
      ensureSfx().waterSpray();
    },
    carHorn() {
      ensureSfx().carHorn();
    },
    bridgeAlarm() { ensureSfx().bridgeAlarm(); },
    bridgeJump() { ensureSfx().bridgeJump(); },
    crash() {
      noise(0.25, 0.25, 900);
    },
    thunder() {
      noise(1.4, 0.35, 160);
      tone(70, 1.1, 'sine', 0.16, 38);
    },
    engine(speed01, dmg01) { // VEHICLE-DAMAGE-P1: dmg01 0 Normal / 0,5 Damaged / 1 Heavily
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
          osc.connect(gain).connect(master);
          osc.start();
          engineNodes = { osc, gain };
        }
        const d = dmg01 || 0;
        const t = c.currentTime;
        const wob = d >= 1 ? 1 + 0.08 * Math.sin(t * 31) : 1; // tersendat: wobble frekuensi ±8%
        const sput = d >= 1 ? (t % 0.13 < 0.07 ? 1 : 0.35) : 1; // gate persegi 7-8 Hz
        engineNodes.osc.frequency.value = (55 + speed01 * 140) * (1 - 0.15 * d) * wob;
        engineNodes.gain.gain.value = (0.03 + speed01 * 0.04) * (1 - 0.2 * d) * sput;
      } catch {
      }
    },
    fireLoop(on) { // VEHICLE-DAMAGE-P1: crackle api — noise loop lowpass 800 Hz, lewat master (ikut volume/mute)
      if (!on) {
        if (fireNodes) { try { fireNodes.src.stop(); } catch { } fireNodes = null; }
        return;
      }
      if (muted || fireNodes) return;
      const c = ensure();
      if (!c) return;
      try {
        const len = c.sampleRate;
        const buffer = c.createBuffer(1, len, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        const gain = c.createGain();
        gain.gain.value = 0.05;
        src.connect(filter).connect(gain).connect(master);
        src.start();
        fireNodes = { src, gain };
      } catch {
      }
    },
    engineOff() {
      if (engineNodes) {
        try {
          engineNodes.gain.gain.value = 0;
        } catch {
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
        osc.connect(gain).connect(master);
        osc.start();
        lfo.start();
        sirenNodes = { osc, lfo, gain };
      } catch {
      }
    },
    stopSiren() {
      if (!sirenNodes) return;
      try {
        sirenNodes.osc.stop();
        sirenNodes.lfo.stop();
      } catch {
      }
      sirenNodes = null;
    },
  };
}
