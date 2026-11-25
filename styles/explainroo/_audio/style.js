// Internal: an empty scene. Used to make the audio master (voice + ducked music) and Whisper word timings
// for Remotion-engine styles, and for footage scenes inside explainroo styles (Remotion draws those).
export function scene(s) {
  s.camera([]);
  s.quiet();
}
