// Neon Harbor — WebAudio — no files — radio — sfx.
import { RADIO_STATIONS } from './config.js';

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createAudio() {
  let ctx = null;
  let muted = false;
  let volume = 0.8;
  let master = null;
  let sirenNodes = null;
  let engineNodes = null;
  let radioTimer = null;
  let radioStep = 0;
  let radioNextTime = 0;
  let stationIndex = 0;

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

  function scheduleRadioStep(step, time) {
    const station = RADIO_STATIONS[stationIndex];
    const scale = station.scale;
    const tag = station.tag;
    const bassNotes = [0, 0, 3, 5];
    const bar = Math.floor(step / 16) % 4;
    const bassEvery = tag === 'lofi' ? 8 : 4;
    if (step % bassEvery === 0) {
      const root = station.root + scale[bassNotes[bar] % scale.length];
      tone(midiToFreq(root), tag === 'lofi' ? 0.5 : 0.22, 'sawtooth', tag === 'lofi' ? 0.07 : 0.10, null, time);
      tone(midiToFreq(root + 12), 0.22, 'square', 0.04, null, time);
    }
    const arpOn = tag === 'chill' ? step % 4 === 0
      : tag === 'lofi' ? step % 4 === 2
      : tag === 'drive' ? true
      : step % 2 === 0;
    if (arpOn) {
      const arpDegree = (step * 3 + bar) % scale.length;
      const arp = station.root + 24 + scale[arpDegree];
      tone(midiToFreq(arp), 0.12, 'triangle', tag === 'lofi' ? 0.035 : 0.05, null, time);
    }
    const hatOn = tag === 'drive' ? true : tag === 'lofi' ? step % 4 === 3 : step % 2 === 1;
    if (hatOn) noise(0.03, tag === 'lofi' ? 0.03 : 0.05, 6000, time);
    if (step % 16 === 0) {
      const chord = [0, 2, 4].map((d) => station.root + 12 + scale[d % scale.length]);
      for (const n of chord) tone(midiToFreq(n), 1.4, 'sine', 0.03, null, time);
    }
  }

  function radioTick() {
    const c = ensure();
    if (!c || muted) return;
    const station = RADIO_STATIONS[stationIndex];
    const stepDur = 60 / station.bpm / 4;
    while (radioNextTime < c.currentTime + 0.25) {
      scheduleRadioStep(radioStep % 64, radioNextTime);
      radioNextTime += stepDur;
      radioStep += 1;
    }
  }

  function startRadio(index) {
    if (typeof index === 'number') stationIndex = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    const c = ensure();
    if (!c) return;
    unlock();
    if (radioTimer) return;
    radioNextTime = c.currentTime + 0.05;
    radioTimer = setInterval(radioTick, 90);
  }

  function stopRadio() {
    if (radioTimer) {
      clearInterval(radioTimer);
      radioTimer = null;
    }
  }

  function setStation(index) {
    stationIndex = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    radioStep = 0;
    return RADIO_STATIONS[stationIndex].name;
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
      tone(880, 0.08, 'triangle', 0.14);
      setTimeout(() => tone(1174, 0.08, 'triangle', 0.14), 70);
      setTimeout(() => tone(1568, 0.16, 'triangle', 0.14), 140);
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
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.15), i * 110));
    },
    busted() {
      tone(220, 0.5, 'sawtooth', 0.12, 110);
    },
    crash() {
      noise(0.25, 0.25, 900);
    },
    thunder() {
      noise(1.4, 0.35, 160);
      tone(70, 1.1, 'sine', 0.16, 38);
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
          osc.connect(gain).connect(master);
          osc.start();
          engineNodes = { osc, gain };
        }
        engineNodes.osc.frequency.value = 55 + speed01 * 140;
        engineNodes.gain.gain.value = 0.03 + speed01 * 0.04;
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
