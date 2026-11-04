/**
 * Áudio: síntese via Web Audio API (frequências reais da urna).
 * Namespace: window.Urna.audio
 */
(function (Urna) {
  'use strict';

  let audioCtx = null;
  let muted = false;

  function getAudioContext() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, start, dur, vol, type = 'sine') {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  }

  function playBeep() {
    if (muted) return;
    try {
      tone(1050, getAudioContext().currentTime, 0.12, 0.15);
    } catch (e) { console.warn('Audio blocked', e); }
  }

  function playFimChime() {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      const t = ctx.currentTime;
      tone(1250, t, 0.15, 0.2);            // beep 1
      tone(1250, t + 0.2, 0.15, 0.2);      // beep 2
      // long held note (signature urna end sound)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(1250, t + 0.4);
      gain.gain.setValueAtTime(0.25, t + 0.4);
      gain.gain.setValueAtTime(0.25, t + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + 0.4);
      osc.stop(t + 2.1);
    } catch (e) { console.warn('Chime error', e); }
  }

  function setMuted(value) { muted = value; }
  function isMuted() { return muted; }

  Urna.audio = { playBeep, playFimChime, setMuted, isMuted, unlock: getAudioContext };
})(window.Urna = window.Urna || {});