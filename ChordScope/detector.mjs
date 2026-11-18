export const names = [
  "C",
  "C♯",
  "D",
  "E♭",
  "E",
  "F",
  "F♯",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
];
export const tuning = [40, 45, 50, 55, 59, 64];
// Convert a MIDI note number into its pitch name and octave.
export const pitch = (n) => names[n % 12] + (Math.floor(n / 12) - 1);
const major = [
  "x32010",
  "x46664",
  "xx0232",
  "xx1343",
  "022100",
  "133211",
  "244322",
  "320003",
  "466544",
  "x02220",
  "x13331",
  "x24442",
];
const minor = [
  "x35543",
  "x46654",
  "xx0231",
  "xx1342",
  "022000",
  "133111",
  "244222",
  "355333",
  "466444",
  "x02210",
  "x13321",
  "x24432",
];
// Movable shapes start on C. Muted strings stay muted when a shape is transposed.
const families = [
  ["Major", [0, 4, 7]],
  ["Minor", [0, 3, 7]],
  [
    "7",
    [0, 4, 7, 10],
    "x35353",
    {
      2: "xx0212",
      4: "020100",
      7: "320001",
      9: "x02020",
      11: "x21202",
      0: "x32310",
    },
  ],
  [
    "maj7",
    [0, 4, 7, 11],
    "x35453",
    { 0: "x32000", 2: "xx0222", 4: "021100", 5: "xx3210", 9: "x02120" },
  ],
  ["m7", [0, 3, 7, 10], "x35343", { 2: "xx0211", 4: "022030", 9: "x02010" }],
  ["9", [0, 4, 7, 10, 2], "x32333", { 4: "020102" }],
  ["maj9", [0, 4, 7, 11, 2], "x32433"],
  ["m9", [0, 3, 7, 10, 2], "x31333", { 4: "020032" }],
  ["add9", [0, 4, 7, 2], "x32033", { 2: "xx0252", 9: "x02420" }],
  ["sus2", [0, 2, 7], "x35533", { 2: "xx0230", 9: "x02200" }],
  ["sus4", [0, 5, 7], "x35563", { 2: "xx0233", 4: "022200", 9: "x02230" }],
  ["dim", [0, 3, 6], "x3454x"],
  ["m7♭5", [0, 3, 6, 10], "x3434x"],
];
// Spell each degree by its musical letter (for example, F7 contains E-flat).
function spellDegree(root, interval, index) {
  const letters = "CDEFGAB",
    natural = [0, 2, 4, 5, 7, 9, 11];
  const step =
    index === 0
      ? 0
      : interval === 2
        ? 1
        : interval === 5
          ? 3
          : index === 1
            ? 2
            : index === 2
              ? 4
              : 6;
  const letter = (letters.indexOf(names[root][0]) + step) % 7;
  const accidental = ((root + interval - natural[letter] + 18) % 12) - 6;
  return (
    letters[letter] + (accidental < 0 ? "♭" : "♯").repeat(Math.abs(accidental))
  );
}
// Build chord templates and suggested fingerings for every root and family.
export const chords = families.flatMap(([family, intervals, base, open], f) =>
  names.map((name, r) => {
    const local = f < 2 ? [major, minor][f][r] : open?.[r];
    const shape = [...(local || base)].map((x) =>
      x === "x" ? "x" : String(Number(x) + (local ? 0 : r)),
    );
    return {
      name: name + (f < 2 ? " " : "") + family,
      family,
      shape,
      tones: intervals.map((v) => (r + v) % 12),
      toneNames: intervals.map((v, j) => spellDegree(r, v, j)),
      optionalFifth:
        intervals.length >= 4 && intervals.includes(7) && family !== "add9",
    };
  }),
);
// Match spectral peaks to a chord, returning null for silence or ambiguity.
export function classify(db, rate, size, rms) {
  if (rms < 0.0025) return null;
  const peaks = [];
  let top = -Infinity;
  // Interpolate FFT maxima to locate pitches between adjacent frequency bins.
  for (
    let k = Math.max(2, Math.floor((76 * size) / rate));
    k < Math.min(db.length - 1, (4000 * size) / rate);
    k++
  ) {
    const a = db[k - 1],
      b = db[k],
      c = db[k + 1];
    if (b < -80 || b <= a || b < c) continue;
    const shift = (0.5 * (a - c)) / (a - 2 * b + c);
    if (!Number.isFinite(shift)) continue;
    const hz = ((k + shift) * rate) / size;
    peaks.push({ hz, amp: 10 ** (b / 20) });
    top = Math.max(top, b);
  }
  const notes = [],
    chroma = Array(12).fill(0);
  // Walk low to high, subtracting a decaying harmonic envelope from upper peaks.
  // An octave must retain independent energy after that subtraction to count.
  for (const p of peaks) {
    const n = Math.round(69 + 12 * Math.log2(p.hz / 440));
    if (
      n < 40 ||
      n > 88 ||
      p.amp < 10 ** ((top - 28) / 20) ||
      Math.abs(1200 * Math.log2(p.hz / (440 * 2 ** ((n - 69) / 12)))) > 36
    )
      continue;
    let residual = p.amp;
    for (const q of notes) {
      const h = Math.round(p.hz / q.hz);
      if (
        h >= 2 &&
        h <= 10 &&
        Math.abs(1200 * Math.log2(p.hz / (q.hz * h))) < 40
      )
        residual -= (q.energy * 1.25) / h;
    }
    if (residual < 10 ** ((top - 21) / 20)) continue;
    notes.push({ n, hz: p.hz, energy: residual });
    chroma[n % 12] += Math.sqrt(residual);
  }
  const total = chroma.reduce((a, b) => a + b, 0);
  if (!total) return null;
  // Require independent evidence for the third, seventh and any extension.
  // The perfect fifth is often omitted in extended guitar voicings.
  const bass = notes[0].n % 12;
  const scores = [];
  for (const [i, c] of chords.entries()) {
    const energy = c.tones.map((t) => chroma[t] / total);
    if (energy.some((v, j) => v < 0.075 && !(c.optionalFifth && j === 2)))
      continue;
    const coverage = energy.reduce((a, b) => a + b, 0);
    if (coverage < 0.89) continue;
    // Sus2 and sus4 can have identical pitch classes. Prefer the bass-root reading.
    const score = coverage + (bass === c.tones[0] ? 0.046 : 0);
    scores.push({ i, score });
  }
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  if (!best || (scores[1] && best.score - scores[1].score < 0.024)) return null;
  const strong = notes.filter(
    (p) =>
      p.energy > 10 ** ((top - 13) / 20) &&
      chords[best.i].tones.includes(p.n % 12),
  );
  return { i: best.i, pitches: strong.map((p) => p.n) };
}
