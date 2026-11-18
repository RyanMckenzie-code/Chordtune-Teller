# Portfolio demonstration guide

[Back to the project overview](../README.md)

## A concise project description

> Chordtune Teller is a browser-based guitar chord detector and voicing explorer. It analyzes live microphone audio with the Web Audio API, estimates pitches through spectral analysis and harmonic filtering, and matches the result to music-theory-based chord templates. An onset-aware confirmation stage reduces unstable readings during strum attacks. Once a chord is confirmed, an interactive conveyor presents alternative fingerings across the neck. The project brings together audio processing, constrained search, modular JavaScript, and a fortune teller-inspired interface.

This description summarizes the implementation. It does not make claims about a measured accuracy rate, an original research contribution, or individual authorship and tool usage. Add your own development context and acknowledgments before submitting it as part of an application.

## Suggested three-minute walkthrough

| Time | Show | Explain |
| --- | --- | --- |
| 0:00-0:30 | Home screen and microphone activation | The intended user is a guitarist who wants to identify a chord and explore other ways to play it. Audio processing stays in the browser. |
| 0:30-1:15 | G major, then E major and E minor | Several notes sound together; the system must distinguish chord tones from harmonics. Confirmation over time helps stabilize the reading. |
| 1:15-2:00 | Voicing cards, including a barre and upper-neck shape | Recognition identifies a chord, while a separate search generates suggested fingerings. The software does not claim to recover the player's hand position. |
| 2:00-2:30 | `detector.mjs`, `tracker.mjs`, and `voicings.mjs` | Point out the separation between spectral classification, temporal confirmation, and music-theory constraints. |
| 2:30-3:00 | Test output and limitations | Explain what the deterministic tests establish and why real recordings are still needed to measure recognition accuracy. |

If a microphone is unavailable, stop listening and choose chords manually to demonstrate the voicing explorer. Explain that this demonstrates the interface and fretboard search, not live recognition.

## Technical decisions worth discussing

- **Interpretable rules:** Chord templates and explicit thresholds make the recognition process inspectable, without a training dataset or model-serving dependency.
- **Temporal stability:** Waiting for the attack to leave the FFT window addresses a specific failure case: a major chord briefly appearing to contain a seventh or ninth. The cost is additional delay and possible missed rapid changes.
- **Separate inference and suggestion:** Audio supplies a chord estimate; standard tuning and chord tones supply possible shapes. This avoids treating an ambiguous audio signal as proof of one exact fingering.
- **Constraint-based exploration:** Voicing search produces alternatives at different neck positions instead of relying on a single lookup diagram. Its constraints establish pitch correctness, not guaranteed ergonomic comfort.
- **Visual communication:** The crystal ball, reading panel, and card spread reinforce the project's identity while retaining readable technical controls.

## Evidence to collect before submission

The repository does not yet contain a recorded-audio benchmark. To strengthen the portfolio, collect:

- A short screen recording with the guitar audible, showing successful recognition and voicing selection.
- A small labeled audio set covering major, minor, seventh, and ninth chords, with slow and quick strums.
- Counts of correct, incorrect, and unconfirmed readings, plus time to confirmation. Record microphone, room, tuning, and evaluation conditions.
- At least one failure example and an explanation of the likely cause.
- Screenshots of desktop and narrow-screen layouts.

Report actual results rather than inferred performance. Keep evaluation recordings separate from the app's normal behavior; the application itself does not record or upload microphone audio.

## Personal context to add

A reviewer will also benefit from your own account of the project's motivation, development dates, individual or team responsibilities, outside resources and AI assistance where applicable, the hardest design decision, and what you learned. Those details are intentionally left to you because they cannot be established from the source code alone.
