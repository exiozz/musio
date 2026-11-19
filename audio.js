// Moteur audio : chaque titre est généré en direct avec la Web Audio API.
window.Engine = (() => {
  let ctx = null, master, comp, analyser, noiseBuf, bus = null;
  let track = null, seq = null, playing = false, startAt = 0, offset = 0;
  let step = 0, nextTime = 0, timer = null, volume = 0.8;
  const freqData = new Uint8Array(128);

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = volume;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.8;
    master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function unlock() {
    if (!init()) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  }

  // ---------- séquence ----------
  function rng(seed) { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const PRESETS = {
    'Électro': { kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 6, 10, 14], hat16: true, bass: 'saw', bassSteps: [2, 6, 10, 14], lead: 'square', arp: 0.55, pad: true, prog: [0, 8, 3, 10], swing: 0 },
    'Lo-fi': { kick: [0, 7, 10], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], bass: 'sine', bassSteps: [0, 10], keys: true, arp: 0.18, lead: 'triangle', prog: [2, 7, 0, 9], seventh: true, swing: 0.2, soft: true },
    'Rap': { kick: [0, 3, 10], snare: [8], hats: [0, 2, 4, 6, 8, 10, 12, 14], hat16: true, roll: true, bass: '808', bassSteps: [0, 3, 10], lead: 'sine', arp: 0.22, prog: [0, 8, 3, 7], swing: 0 },
    'Indie': { kick: [0, 8, 10], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], bass: 'triangle', bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], lead: 'triangle', arp: 0.7, prog: [0, 5, 9, 7], major: true, swing: 0 },
    'Chill': { kick: [0, 10], snare: [4, 12], hats: [2, 6, 10, 14], bass: 'sine', bassSteps: [0, 6, 8], pad: true, lead: 'sine', arp: 0.3, prog: [0, 8, 3, 10], swing: 0.08, soft: true },
    'Jazz': { kick: [0, 10], snare: [], ride: true, hats: [0, 3, 4, 7, 8, 11, 12, 15], bass: 'triangle', bassSteps: [0, 4, 8, 12], walk: true, keys: true, stabs: [2, 10], arp: 0.12, lead: 'triangle', prog: [2, 7, 0, 9], seventh: true, swing: 0.28, soft: true },
  };
  function buildSeq(t) {
    const r = rng(t.id), pr = PRESETS[t.genre] || PRESETS['Électro'];
    const scale = pr.major ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
    const lead = [];
    for (let i = 0; i < 32; i++) lead.push(r() < pr.arp ? scale[Math.floor(r() * scale.length)] + (r() < 0.3 ? 12 : 0) : null);
    return { pr, lead, root: t.root };
  }

  // ---------- instruments ----------
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, d, sus, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + rel);
  }
  function kick(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, 0.002, v, 0.12, v * 0.3, 0.25);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.45);
  }
  function noise(t, v, type, f, len) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f;
    env(g, t, 0.001, v, len * 0.4, v * 0.2, len);
    s.connect(fl); fl.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + len * 1.6 + 0.05);
  }
  function snare(t, v) {
    noise(t, v * 0.5, 'highpass', 1400, 0.16);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 190; env(g, t, 0.001, v * 0.35, 0.05, 0.01, 0.05);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.15);
  }
  function tone(t, midi, dur, wave, v, cutoff, attack) {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = wave === 'saw' ? 'sawtooth' : wave; o.frequency.value = mtof(midi);
    fl.type = 'lowpass'; fl.frequency.value = cutoff || 2400;
    env(g, t, attack || 0.008, v, dur * 0.5, v * 0.45, dur * 0.6);
    o.connect(fl); fl.connect(g); g.connect(bus); o.start(t); o.stop(t + dur * 1.2 + 0.1);
  }
  function bass808(t, midi, dur, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(mtof(midi + 12), t); o.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.06);
    env(g, t, 0.004, v, 0.1, v * 0.7, dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.2);
  }
  function chord(t, notes, dur, wave, v, cutoff, attack) { notes.forEach((n, i) => tone(t, n, dur, wave, v / notes.length, cutoff, attack || 0.01 + i * 0.004)); }

  function playStep(i, t) {
    const { pr, lead, root } = seq, s = i % 16, bar = Math.floor(i / 16);
    const sd = 60 / track.bpm / 4;
    const swing = (s % 2 === 1) ? pr.swing * sd : 0; t += swing;
    const deg = pr.prog[bar % 4];
    const third = pr.major ? 4 : 3;
    const chordNotes = [root + deg + 12, root + deg + 12 + (pr.major || deg === 7 || deg === 5 ? 4 : third), root + deg + 19];
    if (pr.seventh) chordNotes.push(root + deg + 22 + (deg === 0 ? 1 : 0));
    const intro = bar < 2, brk = bar % 16 === 15;
    const soft = pr.soft ? 0.7 : 1;
    if (!brk && !intro && pr.kick.includes(s)) kick(t, 0.9 * soft);
    if (!brk && pr.snare.includes(s) && bar >= 1) snare(t, 0.7 * soft);
    if (pr.hats.includes(s)) noise(t, (pr.ride ? 0.16 : 0.22) * soft, 'highpass', pr.ride ? 6000 : 8000, pr.ride ? 0.18 : 0.04);
    else if (pr.hat16 && !intro) noise(t, 0.08, 'highpass', 9000, 0.03);
    if (pr.roll && s >= 12 && bar % 2 === 1) noise(t + sd / 2, 0.08, 'highpass', 9000, 0.02);
    if (!intro && pr.bassSteps.includes(s)) {
      let n = root + deg - 12;
      if (pr.walk) n += [0, 4, 7, 9][s / 4];
      if (pr.bass === '808') bass808(t, n, sd * 5, 0.55);
      else tone(t, n, sd * (pr.bass === 'sine' ? 3 : 1.6), pr.bass, pr.bass === 'saw' ? 0.22 : 0.38, pr.bass === 'saw' ? 520 : 1200);
    }
    if (s === 0 && pr.pad) chord(t, chordNotes, sd * 15, 'sawtooth', 0.16, 1100, 0.25);
    if (pr.keys && (s === 0 || s === 8) && !pr.stabs) chord(t, chordNotes, sd * 7, 'triangle', 0.22, 1800, 0.01);
    if (pr.stabs && pr.stabs.includes(s)) chord(t, chordNotes, sd * 2.5, 'triangle', 0.2, 2200, 0.005);
    const ln = lead[(i % 32)];
    if (ln !== null && bar >= 2 && !brk) tone(t, root + deg + 24 + ln, sd * 1.4, pr.lead, pr.lead === 'square' ? 0.07 : 0.11, pr.lead === 'square' ? 2600 : 4000);
  }

  function schedule() {
    const sd = 60 / track.bpm / 4;
    while (nextTime < ctx.currentTime + 0.14) { playStep(step, nextTime); step++; nextTime += sd; }
  }

  // ---------- fichiers audio importés ----------
  let el = null, elSrcNode = null;
  const isFile = t => t && t.file;
  function mediaEl() {
    if (el) return el;
    el = new Audio(); el.preload = 'auto'; el.crossOrigin = 'anonymous'; el.setAttribute('playsinline', '');
    try { elSrcNode = ctx.createMediaElementSource(el); elSrcNode.connect(master); } catch (e) { elSrcNode = null; }
    return el;
  }
  function srcFor(t) { return t.src || (window.AUDIO_SRC && window.AUDIO_SRC[t.id]); }
  function filePrep() {
    const a = mediaEl(), src = srcFor(track);
    if (!src) return null;
    if (a.dataset.id !== track.id) { a.dataset.id = track.id; a.src = src; }
    return a;
  }

  function pos() { if (isFile(track)) return el && el.dataset.id === track.id ? el.currentTime : offset; return playing && ctx ? Math.max(0, offset + (ctx.currentTime - startAt)) : offset; }
  function play() {
    if (!track || !init()) return;
    if (isFile(track)) {
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      const a = filePrep(); if (!a) { window.dispatchEvent(new CustomEvent('engine-missing', { detail: track })); return; }
      if (Math.abs(a.currentTime - offset) > 0.3) { try { a.currentTime = offset; } catch (e) {} }
      if (!elSrcNode) a.volume = volume;
      playing = true; const pr = a.play(); if (pr && pr.catch) pr.catch(() => { playing = false; window.dispatchEvent(new CustomEvent('engine-state')); });
      return;
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (playing) return;
    playing = true;
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    startAt = ctx.currentTime + 0.04;
    const sd = 60 / track.bpm / 4;
    step = Math.ceil(offset / sd - 1e-6);
    nextTime = startAt + (step * sd - offset);
    schedule();
    timer = setInterval(schedule, 25);
  }
  function pause() {
    if (!playing) return;
    if (isFile(track)) { offset = pos(); playing = false; if (el) el.pause(); return; }
    offset = pos(); playing = false; clearInterval(timer);
    const b = bus; const now = ctx.currentTime;
    b.gain.setTargetAtTime(0, now, 0.03);
    setTimeout(() => { try { b.disconnect(); } catch (e) {} }, 400);
  }
  function seek(t) {
    if (isFile(track)) { offset = Math.max(0, Math.min(t, (track.dur || 0) - 0.3)); if (el && el.dataset.id === track.id) { try { el.currentTime = offset; } catch (e) {} } return; }
    const was = playing; if (was) pause(); offset = Math.max(0, Math.min(t, (track ? track.dur : 0) - 0.3)); if (was) play();
  }
  function load(t, at) { if (playing) pause(); track = t; offset = at || 0; if (isFile(t)) { seq = null; if (el && el.dataset.id !== t.id) { el.removeAttribute('src'); el.dataset.id = ''; } return; } seq = buildSeq(t); }
  function setVolume(v) { volume = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); if (el && !elSrcNode) el.volume = v; }
  function levels() {
    if (!ctx || !playing) return null;
    analyser.getByteFrequencyData(freqData); return freqData;
  }
  return { init, unlock, load, play, pause, seek, pos, setVolume, levels, isPlaying: () => playing, current: () => track, ready: () => !!ctx };
})();
