# Architecture and algorithm notes

[Back to the project overview](../README.md)

Chordtune Teller is a static client-side application. Its core distinction is between **what one audio frame suggests**, **what remains stable over time**, and **how the resulting chord can be played**. Those responsibilities live in separate modules.

## 1. Capture and display: `app.mjs`

The listening button requests `getUserMedia` audio and connects the resulting stream to a Web Audio `AnalyserNode`. Echo cancellation, noise suppression, and automatic gain control are requested off to preserve musical input, although actual device behavior depends on the browser and hardware.

The analyser uses an FFT size of 8,192 and a smoothing time constant of zero. Every 50 ms, the application reads the time-domain waveform and frequency-domain decibel values. RMS amplitude, the square root of the mean squared sample values, supplies a level estimate for silence screening and attack detection.

The application draws the waveform, updates the level bars, calls `classify`, and passes the candidate to the tracker. Only confirmed results change the displayed chord. Selecting an alternative voicing changes the reference diagram and table without changing the audio classification. A newly confirmed chord rebuilds the voicing conveyor.

Stopping listening clears the polling interval, stops media tracks, closes the audio context, resets the tracker, and resets the live reading. The application also handles denied permission, missing microphones, and disconnection. A `pagehide` handler releases audio resources when the page is left.

## 2. Frame classification: `detector.mjs`

### Representation

Standard tuning is stored as MIDI note numbers `[40, 45, 50, 55, 59, 64]`. A MIDI note identifies pitch and octave; a pitch class groups octave equivalents, using `note % 12`.

Chord templates contain a root-relative interval set, display name, chord-tone names, and a suggested six-string shape. Thirteen families combined with twelve roots produce 156 templates. A shape is an array ordered from low E to high E; `x` means muted, `0` means open, and other entries are fret numbers. Array entries support multi-digit frets.

### Peak detection and note estimation

`classify(db, rate, size, rms)` returns either `null` or `{ i, pitches }`, where `i` is the chord index and `pitches` is a list of sufficiently strong MIDI-note estimates.

1. Reject input with RMS below `0.0025`.
2. Search local spectral maxima between approximately 76 Hz and 4,000 Hz, discarding peaks below -80 dB.
3. Interpolate each maximum with its neighboring bins to estimate a frequency between bin centers.
4. Convert frequency to the nearest MIDI note using `69 + 12 * log2(frequency / 440)`.
5. Keep notes in MIDI range 40-88 that satisfy relative amplitude and tuning-distance checks.

### Approximate harmonic suppression

Peaks are processed from low to high frequency. Before accepting a higher peak as an independent note, the detector subtracts an estimated contribution from harmonics of previously accepted notes. The envelope decays with harmonic number. This reduces the chance that one vibrating string is mistaken for several separate notes.

This is a heuristic, not source separation. Real string spectra vary with picking position, instrument, microphone, and time. An upper note that coincides with a lower note's harmonic can be suppressed even when it was played independently.

### Chord scoring

Surviving note energy is accumulated into twelve pitch classes. Each template is checked for required chord tones and total coverage of the observed energy. For selected extended families, the perfect fifth is optional, reflecting common guitar voicings.

Candidates require at least 89% coverage. A small bass-root bonus helps choose between pitch-class-equivalent readings such as some suspended chords. If the best two scores are too close, classification returns `null` rather than forcing a label. Strong pitches belonging to the winning chord are passed to temporal confirmation.

Scores are heuristic matching values, not calibrated probabilities. The application does not report an accuracy percentage or infer musical key and progression context.

## 3. Temporal confirmation: `tracker.mjs`

A strum is not simultaneous: strings enter at different times, and the attack can temporarily contain broadband noise and strong harmonics. An FFT also includes samples from a period of time, so overlapping frames may repeat the same transient evidence.

`createChordTracker()` returns `update(hit, rms, now, windowMs)` and `reset()`. It tracks pending evidence independently of the interface.

- A fresh attack is indicated by an RMS rise from near silence, or a sufficiently large relative and absolute level increase. Accepted attack events are separated by at least 180 ms.
- A detected attack clears pending evidence and starts a settling interval equal to the FFT duration plus 50 ms.
- During settling, silence, or an ambiguous frame, no new result is confirmed and pending evidence is cleared.
- A changed candidate starts a new consecutive run.
- A chord with three pitch classes requires three consecutive matches; a chord with more than three requires five.
- A displayed pitch must appear in the current frame and at least `required - 1` frames in the confirmation window.

The UI retains the last confirmed chord through silence or ambiguity. It is a stable reading, not an indication that the chord is still sounding. Very fast playing may not leave enough settled evidence to confirm every chord. The extra delay for extended chords is an explicit stability-versus-responsiveness tradeoff.

## 4. Alternative fingerings: `voicings.mjs`

`findVoicings(chord)` returns shapes with their fret position, geometric barre information, category, and ranking score.

The generator combines two approaches:

1. Transpose existing shapes from the same chord family, including octave-displaced versions. Transposing open-string shapes produces movable fretted shapes.
2. Search contiguous groups of three to six strings within four-fret windows across a 22-fret neck. Each string can use an open note or a fretted chord tone within the window.

Candidates must contain every theoretical chord tone, contain no outside tones, stay within fret 22, and have no more than three frets between the lowest and highest pressed fret. Shapes are deduplicated. Unlike recognition, this generator does not omit the fifth of an extended chord.

A possible barre is identified when multiple strings share the lowest pressed fret and intervening strings are fretted at that fret or higher. A span of at least five strings is labeled a full barre; shorter spans are labeled partial barres. This is a geometric suggestion, not a hand-position solver. It does not explicitly account for finger count, wrist position, string muting technique, or stretch between open and high fretted notes.

Selection reserves barre and non-barre candidates at different positions before filling the remaining slots toward 48 suggestions. Lower positions, fewer distinct pressed frets, and fewer muted strings receive a lower heuristic score. The final conveyor is ordered along the neck, rather than by estimated ease alone.

## 5. Presentation: HTML, CSS, and SVG

`index.html` provides a listening area, confirmed chord reading, detailed reference, alternative-voicing conveyor, and detected-pitch display. `style.css` supplies the navy and mint palette, gold accents, serif typography, star-like backdrop, arched panels, and tarot-inspired cards.

The main fretboard and card diagrams are generated as SVG. Selecting a card updates the main diagram and a table that derives each string's pitch from tuning plus fret number. The interface supports horizontal touch scrolling, arrow controls, keyboard-focusable controls, selected-state attributes, and responsive layouts. These features have not been presented as a formal accessibility audit.

## Verification boundaries

`tracker.test.mjs` tests confirmation logic with deterministic timestamps and synthetic candidate sequences. It does not exercise actual FFT analysis, browser microphone permissions, rendering, or real guitar recordings. The project has also been checked programmatically for generated voicing tone membership, fret bounds, and upper-neck coverage; those checks do not establish physical playability.

A complete evaluation should separate frame-classifier quality, temporal confirmation behavior, voicing correctness, usability, and audio-device compatibility. A high test pass rate in one layer is not evidence of measured real-world recognition accuracy.
