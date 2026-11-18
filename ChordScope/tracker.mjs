import { chords } from "./detector.mjs";

// Confirm chords after the strum attack has left the FFT analysis window.
export function createChordTracker() {
  let previousRms = 0;
  let lastAttack = -Infinity;
  let settleUntil = 0;
  let pending = [];

  // Forget the previous microphone session and all unconfirmed pitch evidence.
  function reset() {
    previousRms = 0;
    lastAttack = -Infinity;
    settleUntil = 0;
    pending = [];
  }

  // Reset on fresh attacks and require consecutive, settled chord evidence.
  function update(hit, rms, now, windowMs) {
    const attack =
      rms >= 0.004 &&
      (previousRms < 0.0025 ||
        (rms > previousRms * 1.8 && rms - previousRms > 0.006));
    previousRms = rms;
    if (attack && now - lastAttack >= 180) {
      lastAttack = now;
      // Include a short string-to-string strum allowance beyond the FFT window.
      settleUntil = now + windowMs + 50;
      pending = [];
    }
    if (now < settleUntil || rms < 0.0025 || !hit) {
      pending = [];
      return null;
    }
    if (pending.length && pending[0].i !== hit.i) pending = [];
    pending.push(hit);
    // Sevenths and extensions need more persistence than a three-note chord.
    const required = chords[hit.i].tones.length > 3 ? 5 : 3;
    if (pending.length > required) pending.shift();
    if (pending.length < required) return null;
    const pitches = hit.pitches.filter(
      (n) =>
        pending.filter((frame) => frame.pitches.includes(n)).length >=
        required - 1,
    );
    return { i: hit.i, pitches };
  }

  return { update, reset };
}
