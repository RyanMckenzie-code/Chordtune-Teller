# Chordtune Teller

**A browser-based guitar chord detector that turns a live strum into a chord reading and a collection of alternative fingerings.**

Chordtune Teller combines digital signal processing, music theory, and an interactive web interface. A player enables the microphone, strums a chord, and sees a confirmed chord name, its chord tones, and suggested ways to play it elsewhere on the guitar neck. The fortune teller theme gives the process a visual identity: a crystal ball introduces the reading, and a horizontal spread of cards presents alternative voicings.

The application is built with HTML, CSS, and native JavaScript modules. It uses the browser's Web Audio API rather than a trained machine-learning model, an external chord-recognition service, or an audio-processing backend.

## For portfolio reviewers

The central engineering problem is **recognizing several notes sounding at once**. A guitar string produces harmonics as well as its fundamental pitch, and a strum introduces the strings at slightly different times. Simply choosing the loudest frequencies can mistake harmonics or attack noise for additional chord tones.

This project addresses that problem through a pipeline of spectral peak detection, approximate harmonic suppression, music-theory-based chord matching, and confirmation over time. A separate voicing generator then finds alternative fretboard shapes for the recognized chord. The interface connects the audible result to a visual explanation of the notes and fingerings.

| Area | What the implementation demonstrates |
| --- | --- |
| Audio processing | Microphone capture, FFT spectrum analysis, interpolated frequency estimates, RMS input measurement, and harmonic filtering. |
| Algorithm design | Chord-template scoring, ambiguity rejection, onset-aware temporal confirmation, and constrained fretboard search. |
| Music representation | MIDI note numbers, pitch classes, chord intervals, standard tuning, and fret-to-pitch conversion. |
| Interface design | Live waveform and level meter, SVG fretboards, selectable voicing cards, responsive layouts, and a consistent visual theme. |
| Software structure | Separate modules for classification, confirmation, voicing generation, and browser interaction. |
| Verification | Automated tests for temporal confirmation, including simulated attack-time misclassification. |

For a technical walkthrough, see [Architecture and algorithm notes](docs/ARCHITECTURE.md). For a short presentation script and evaluation checklist, see [Portfolio demonstration guide](docs/PORTFOLIO.md).

## What the application does

- Listens to live microphone input and displays a waveform and input level.
- Matches the audio against **156 chord templates: 12 roots across 13 chord families**.
- Supports major, minor, dominant seventh, major seventh, minor seventh, ninth, major ninth, minor ninth, add9, sus2, sus4, diminished, and half-diminished seventh chords.
- Waits for a strum attack to settle before confirming a result; extended chords require longer evidence than triads.
- Displays the confirmed chord name, theoretical chord tones, and repeatedly observed pitches.
- Provides a horizontal conveyor of alternative voicings across a **22-fret, standard-tuned guitar**. The current library produces 48 suggestions per supported chord.
- Shows open, closed, partial-barre, and full-barre categories where available. Selecting a card updates a larger fretboard and a string-by-string pitch table.

**The fingering diagrams are suggestions, not a reconstruction of the player's actual hand position.** Different shapes can produce the same chord, and microphone audio alone does not uniquely identify which strings and frets were used.

## Run locally

Requirements: Python 3 to serve the files, a browser with Web Audio and microphone support, and a microphone. There is no package installation or build step.

From the `ChordScope` folder, run:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

On macOS or Linux:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://localhost:8000**, select **Start Listening**, and allow microphone access. Strum a chord and let it ring briefly. Stop the server with Ctrl+C.

Use localhost for development or HTTPS for a hosted version; browsers restrict microphone access on insecure remote pages. Opening the HTML directly is not the supported workflow because the application uses JavaScript modules.

## Try it in two minutes

1. Play an open G major chord and let it ring. Look for the chord name and G, B, and D chord tones.
2. Select a card in **A spread of possibilities**. Notice that the main fretboard and pitch table update while the recognized chord stays the same.
3. Scroll farther along the conveyor to compare open, barre, and upper-neck shapes.
4. Play E major, then E minor. The third changes from G-sharp to G; the interface should reflect the new chord after confirmation.
5. Compare C major (`x32010`) with Cmaj7 (`x32000`). The B-string note changes from C to B, supplying the major seventh.
6. Mute the strings. The last confirmed chord remains visible by design. Select **Stop Listening** to reset the live reading.

A chord can also be selected manually when the microphone is stopped, so the fingering explorer can be reviewed without audio input.

## How a strum becomes a reading

```text
Microphone
    -> Web Audio analyser: waveform + frequency spectrum
    -> Spectral peaks and approximate harmonic suppression
    -> Note estimates grouped into 12 pitch classes
    -> Chord-template matching and ambiguity rejection
    -> Attack settling and consecutive-frame confirmation
    -> Chord reading + alternative voicings + SVG diagrams
```

The analyser uses an 8,192-sample FFT and is read every 50 milliseconds. At a 48 kHz sample rate, each FFT window spans approximately 171 milliseconds, so consecutive analyses overlap. On a detected fresh strum, confirmation waits one analysis-window duration plus 50 milliseconds. It then requires three consecutive matches for a triad or five for a chord with more than three pitch classes.

Under those timing assumptions, initial confirmation is approximately 350 milliseconds for a triad and 450 milliseconds for an extended chord. These are timing estimates from the implementation, not measured end-to-end latency guarantees. Ambiguous audio, a new attack, or browser scheduling can delay a result.

## Project structure

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure, audio controls, reading, and fingering explorer. |
| `style.css` | Fortune teller visual theme, typography, responsive layout, and voicing cards. |
| `app.mjs` | Microphone lifecycle, analyser polling, waveform drawing, UI updates, and SVG rendering. |
| `detector.mjs` | Chord definitions, note spelling, spectral analysis, and per-frame classification. |
| `tracker.mjs` | Strum-onset handling and temporal confirmation. |
| `voicings.mjs` | Transposed shapes, fretboard search, validation, and barre labeling. |
| `tracker.test.mjs` | Automated regression tests for confirmation behavior. |
| `crystal-ball.svg` | Reusable crystal ball illustration. |
| `docs/` | Detailed architecture and portfolio demonstration notes. |

The `ChordScope` directory name is retained from the project's earlier name; the application is branded **Chordtune Teller**.

## Verification and current limits

Run the automated tests from `ChordScope` with Node.js installed:

```sh
node --test tracker.test.mjs
```

The six tests cover transient E7/E9 labels before E major, sustained E7 and E9 confirmation, new-strum resets, ambiguity and silence, and repeated pitch evidence. They use **synthetic classification sequences**, not recorded guitar audio. They validate the tracker, not the full microphone-to-chord pipeline. No measured recognition accuracy or real-world latency benchmark is claimed.

Current limitations:

- The detector is intended for an isolated guitar chord, not a complete song, multiple instruments, or continuous transcription.
- Noise, distortion, weak notes, rapid changes, and overlapping sustain can cause incorrect or delayed readings. Harmonic suppression is an approximation, particularly for octave-related notes.
- Recognition is limited to the defined templates. Some pitch collections have multiple valid chord names; the bass-root preference does not resolve every musical ambiguity.
- The voicing generator assumes standard E-A-D-G-B-E tuning. It checks chord-tone membership and a compact fretted span, but it does not model hand anatomy or guarantee comfortable fingerings. Barre labels describe a possible geometric barre rather than verified finger assignments.
- Detected pitches can omit notes. Theoretical chord tones and suggested fingering pitches are separate from what the microphone reliably resolved.

Audio analysis runs locally in the browser. The code does not upload microphone samples or save recordings. Python only serves the static files.

## Next steps

The most useful next evaluation is a labeled collection of real guitar recordings covering multiple players, microphones, strum speeds, and chord families. That would make it possible to report per-family accuracy, confusion between triads and extensions, and confirmation latency. Other possible improvements include ergonomic voicing ranking, alternate tunings, and a clearer representation of ambiguous chord names. These are future directions, not implemented features.
