import { chords, tuning } from "./detector.mjs";

// Find compact, complete voicings on adjacent strings across a 22-fret neck, including movable barre shapes.
export function findVoicings(chord) {
  const found = new Map();
  const add = (shape) => {
    const sounding = shape.flatMap((f, s) =>
      f === "x" ? [] : [(tuning[s] + Number(f)) % 12],
    );
    if (
      !chord.tones.every((t) => sounding.includes(t)) ||
      sounding.some((t) => !chord.tones.includes(t))
    )
      return;
    const pressed = shape.filter((f) => f !== "x" && Number(f) > 0).map(Number);
    if (pressed.length && Math.max(...pressed) - Math.min(...pressed) > 3)
      return;
    const position = pressed.length ? Math.min(...pressed) : 0;
    if (pressed.some((f) => f > 22)) return;
    // A barre can cross higher fretted notes, but never an open or muted string.
    const atBase = shape.flatMap((f, s) => (Number(f) === position ? [s] : []));
    const start = atBase[0],
      end = atBase.at(-1);
    const barre =
      position > 0 &&
      end > start &&
      shape
        .slice(start, end + 1)
        .every((f) => f !== "x" && Number(f) >= position)
        ? { fret: position, start, end }
        : null;
    const key = shape.join(",");
    found.set(key, {
      shape: shape.map(String),
      position,
      barre,
      kind: shape.includes("0")
        ? "Open voicing"
        : barre
          ? barre.end - barre.start >= 4
            ? "Full barre"
            : "Partial barre"
          : "Closed voicing",
      score:
        position +
        new Set(pressed).size * 2 +
        shape.filter((f) => f === "x").length,
    });
  };
  add(chord.shape);
  // Transpose established shapes from the same family, treating open notes as
  // fretted notes so E-, A-, and D-style shapes become movable barre voicings.
  for (const template of chords.filter((c) => c.family === chord.family)) {
    const shift = (chord.tones[0] - template.tones[0] + 12) % 12;
    for (const octave of [0, 12]) {
      add(
        template.shape.map((f) =>
          f === "x" ? "x" : String(Number(f) + shift + octave),
        ),
      );
    }
  }
  for (let position = 1; position <= 22; position++) {
    for (let low = 0; low <= 3; low++) {
      for (let high = low + 2; high < 6; high++) {
        const shape = Array(6).fill("x");
        // Explore only chord tones in a four-fret window, including open strings.
        const visit = (s) => {
          if (s > high) {
            add([...shape]);
            return;
          }
          for (const fret of [
            0,
            ...Array.from({ length: 4 }, (_, i) => position + i),
          ]) {
            if (fret > 22) continue;
            if (!chord.tones.includes((tuning[s] + fret) % 12)) continue;
            shape[s] = String(fret);
            visit(s + 1);
          }
          shape[s] = "x";
        };
        visit(low);
      }
    }
  }
  const sorted = [...found.values()].sort((a, b) => a.score - b.score);
  const selected = [];
  // Reserve cards for both barre and non-barre shapes at every neck position.
  for (let position = 0; position <= 22; position++) {
    for (const bar of [true, false]) {
      const candidate = sorted.find(
        (v) => v.position === position && Boolean(v.barre) === bar,
      );
      if (candidate) selected.push(candidate);
    }
  }
  for (const candidate of sorted) {
    if (selected.length >= 48) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  return selected.sort((a, b) => a.position - b.position || a.score - b.score);
}
