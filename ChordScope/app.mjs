import { classify, chords, pitch, tuning } from "./detector.mjs";
import { findVoicings } from "./voicings.mjs";
import { createChordTracker } from "./tracker.mjs";

const chordTracker = createChordTracker();

let referenceChord = -1;

// Find an element using a CSS selector.
const $ = (s) => document.querySelector(s),
  choice = $("#choice"),
  button = $("#listen"),
  canvas = $("#wave");
// Populate the chord selector, grouped by chord family.
for (const family of new Set(chords.map((c) => c.family))) {
  const group = document.createElement("optgroup");
  group.label = family;
  chords.forEach((c, i) => {
    if (c.family === family) group.append(new Option(c.name, i));
  });
  choice.append(group);
}
// Draw the selected chord fingering and update the per-string pitch table.
function reference(i, shape = chords[i].shape) {
  choice.value = i;
  const frets = [...shape],
    rows = [],
    strings = ["Low E", "A", "D", "G", "B", "High E"];
  const first = Math.max(
    1,
    Math.max(...frets.filter((x) => x !== "x").map(Number)) - 3,
  );
  let svg = "";
  for (let f = 0; f <= 4; f++) {
    const x = 70 + f * 78;
    svg +=
      '<path d="M' +
      x +
      ' 20v125" stroke="' +
      (f === 0 && first === 1 ? "#d9edff" : "#89769e") +
      '" stroke-width="' +
      (f === 0 && first === 1 ? 4 : 2) +
      '"/>';
    if (f < 4)
      svg += '<text x="' + (x + 39) + '" y="170">' + (first + f) + "</text>";
  }
  frets.forEach((v, s) => {
    const y = 145 - s * 25,
      n = v === "x" ? "—" : pitch(tuning[s] + Number(v));
    svg +=
      '<path d="M70 ' +
      y +
      'h312" stroke="#a393bd" stroke-width="' +
      (2.4 - s * 0.25) +
      '"/><text x="17" y="' +
      (y + 4) +
      '">' +
      (6 - s) +
      "</text>";
    if (v === "x" || v === "0")
      svg +=
        '<text x="49" y="' +
        (y + 4) +
        '" fill="#b49aff">' +
        v.toUpperCase() +
        "</text>";
    else {
      const x = 109 + (Number(v) - first) * 78;
      svg +=
        '<circle cx="' +
        x +
        '" cy="' +
        y +
        '" r="11" fill="#80ffd4"/><text x="' +
        x +
        '" y="' +
        (y + 4) +
        '" fill="#08281f">' +
        v +
        "</text>";
    }
    rows.push(
      "<tr><td>" +
        (6 - s) +
        " · " +
        strings[s] +
        "</td><td>" +
        v.toUpperCase() +
        "</td><td>" +
        n +
        "</td></tr>",
    );
  });
  $("#board").innerHTML =
    '<g fill="#b6a9d1" text-anchor="middle" font-family="monospace" font-size="12">' +
    svg +
    "</g>";
  $("tbody").innerHTML = rows.join("");
  if (i !== referenceChord) {
    referenceChord = i;
    renderVoicings(i);
  }
  for (const card of $("#voicings").children) {
    card.setAttribute(
      "aria-pressed",
      String(card.dataset.shape === frets.join(",")),
    );
  }
}
// Build a horizontal conveyor of alternative fingerings for the current chord.
function renderVoicings(i) {
  const belt = $("#voicings");
  belt.replaceChildren();
  $("#voicing-caption").textContent =
    chords[i].name +
    " ? Explore open, closed, and barre voicings across the neck.";
  for (const { shape, position, kind, barre } of findVoicings(chords[i])) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "voicing-card";
    card.dataset.shape = shape.join(",");
    card.setAttribute("aria-pressed", "false");
    card.setAttribute(
      "aria-label",
      chords[i].name + ", frets " + shape.join(" "),
    );
    const label = document.createElement("strong");
    label.textContent = kind;
    const location = document.createElement("small");
    location.textContent =
      "Fret " + position + (position >= 12 ? " ? Upper neck" : "");
    const frets = document.createElement("span");
    frets.className = "voicing-frets";
    frets.textContent = shape.join("  ");
    const hint = document.createElement("small");
    hint.textContent = "E A D G B E";
    const diagram = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    diagram.setAttribute("viewBox", "0 0 140 100");
    diagram.setAttribute("aria-hidden", "true");
    const first = Math.max(1, position);
    let lines = "";
    for (let f = 0; f <= 4; f++) lines += `<path d="M20 ${20 + f * 17}h100"/>`;
    shape.forEach((f, string) => {
      const x = 20 + string * 20;
      lines += `<path d="M${x} 20v68"/>`;
      if (f === "x" || f === "0")
        lines += `<text x="${x}" y="12">${f.toUpperCase()}</text>`;
      else
        lines += `<circle cx="${x}" cy="${28.5 + (Number(f) - first) * 17}" r="6"/>`;
    });
    if (barre) {
      lines += `<path class="barre-mark" d="M${20 + barre.start * 20} ${28.5 + (barre.fret - first) * 17}H${20 + barre.end * 20}"/>`;
    }
    diagram.innerHTML = lines;
    card.append(label, location, diagram, frets, hint);
    // Show this alternative in the full-size fretboard and pitch table.
    card.onclick = () => reference(i, shape);
    belt.append(card);
  }
  belt.scrollLeft = 0;
}
// Move the conveyor by one visible group; touch and keyboard scrolling also work.
for (const control of document.querySelectorAll("[data-slide]")) {
  control.onclick = () =>
    $("#voicings").scrollBy({
      left: Number(control.dataset.slide) * $("#voicings").clientWidth * 0.8,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
}
reference(7);
// Update the fingering reference when a chord is selected.
choice.onchange = () => reference(+choice.value);
const bars = Array.from({ length: 16 }, () =>
  $("#bars").appendChild(document.createElement("b")),
);
// Render the waveform and illuminate the input-level meter.
function draw(data, rms = 0) {
  const w = (canvas.width = Math.round(canvas.clientWidth)),
    h = (canvas.height = Math.round(canvas.clientHeight)),
    ctx = canvas.getContext("2d");
  // Leave the center clear for the readout; both sides show the current input trace.
  ctx.strokeStyle = "#b49aff";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const signal = data ? data[Math.floor((x / w) * data.length)] : 0,
      y = h * 0.52 + Math.max(-1, Math.min(1, signal * 4)) * h * 0.37;
    if (x === 0 || (x > w * 0.19 && x < w * 0.81)) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  bars.forEach(
    (b, i) =>
      (b.style.background = i < Math.min(16, rms * 125) ? "#80ffd4" : ""),
  );
}
// Redraw the idle waveform when the canvas changes size.
new ResizeObserver(() => draw()).observe(canvas);
let ctx,
  stream,
  timer,
  shown = -1;
// Update the confirmed chord, chord tones, and detected pitches.
function result(i, p = []) {
  if (i !== shown && i >= 0) reference(i);
  shown = i;
  $("#chord").textContent = i < 0 ? "No chord detected" : chords[i].name;
  $("#tones").textContent =
    i < 0
      ? stream
        ? "Strum a chord and let it ring."
        : "Start listening, then strum a chord."
      : "Chord tones · " + chords[i].toneNames.join(" – ");
  $("#pitches").textContent = p.length
    ? p.map(pitch).join(" · ")
    : stream
      ? "Awaiting reliable pitches"
      : "Waiting for audio";
}
// Release microphone resources and reset the listening interface.
function stop() {
  clearInterval(timer);
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  if (ctx) ctx.close().catch(() => {});
  ctx = null;
  chordTracker.reset();
  choice.disabled = false;
  result(-1);
  draw();
  $(".status").classList.remove("active");
  $("#status").textContent = "Mic offline";
  button.querySelector("span").textContent = "Start Listening";
}
// Toggle listening and configure microphone capture and chord detection.
button.onclick = async () => {
  if (stream) {
    stop();
    return;
  }
  button.disabled = true;
  $("#error").textContent = "";
  $("#status").textContent = "Requesting mic…";
  try {
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error(
        "Microphone access requires a supported browser and a secure page.",
      );
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    const source = ctx.createMediaStreamSource(stream),
      an = ctx.createAnalyser();
    an.fftSize = 8192;
    an.smoothingTimeConstant = 0;
    source.connect(an);
    const db = new Float32Array(an.frequencyBinCount),
      wave = new Float32Array(an.fftSize);
    // Reset the interface and report an unexpected microphone disconnection.
    stream.getAudioTracks()[0].onended = () => {
      stop();
      $("#error").textContent =
        "Microphone disconnected. Reconnect it and start listening again.";
    };
    choice.disabled = true;
    $("#status").textContent = "Listening...";
    $(".status").classList.add("active");
    button.querySelector("span").textContent = "Stop Listening";
    result(-1);
    // Analyze each audio frame and confirm chords across recent frames.
    timer = setInterval(() => {
      an.getFloatTimeDomainData(wave);
      an.getFloatFrequencyData(db);
      let sum = 0;
      for (const v of wave) sum += v * v;
      const rms = Math.sqrt(sum / wave.length);
      draw(wave, rms);
      const hit = classify(db, ctx.sampleRate, an.fftSize, rms);
      const confirmed = chordTracker.update(
        hit,
        rms,
        performance.now(),
        (an.fftSize / ctx.sampleRate) * 1000,
      );
      if (confirmed) result(confirmed.i, confirmed.pitches);
      // Silence and ambiguous frames leave the last confirmed chord on screen.
    }, 50);
  } catch (e) {
    stop();
    $("#error").textContent =
      e.name === "NotAllowedError"
        ? "Microphone access was blocked. Allow microphone access in your browser’s site settings, then try again."
        : e.name === "NotFoundError"
          ? "No microphone found. Connect a microphone and try again."
          : "Microphone unavailable. " + e.message;
  } finally {
    button.disabled = false;
  }
};
window.addEventListener("pagehide", stop);
