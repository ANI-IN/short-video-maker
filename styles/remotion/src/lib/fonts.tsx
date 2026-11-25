import React, { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

const FILES: [string, string, number][] = [
  ['Noto Sans Devanagari', 'fonts/NotoSansDevanagari-400.ttf', 400],
  ['Noto Sans Devanagari', 'fonts/NotoSansDevanagari-700.ttf', 700],
  ['Kalam', 'fonts/Kalam-400-latin.woff2', 400],
  ['Kalam', 'fonts/Kalam-700-latin.woff2', 700],
  ['Patrick Hand', 'fonts/PatrickHand-400-latin.woff2', 400],
  ['Space Grotesk', 'fonts/SpaceGrotesk-500-latin.woff2', 500],
  ['JetBrains Mono', 'fonts/JetBrainsMono-400-latin.woff2', 400],
  ['Instrument Serif', 'fonts/InstrumentSerif-400-normal-latin.woff2', 400],
  ['Inter', 'fonts/Inter-400-latin.woff2', 400],
];
let loading: Promise<void> | null = null;
export const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    loading = loading || Promise.all(FILES.map(([fam, file, weight]) =>
      new FontFace(fam, `url(${staticFile(file)})`, { weight: String(weight) }).load().then((f) => { (document.fonts as any).add(f); }).catch(() => undefined),
    )).then(() => undefined);
    loading.then(() => continueRender(handle));
  }, [handle]);
};
// Every stack ends with the Devanagari font so Hindi always renders.
const DEV = "'Noto Sans Devanagari'";
export const F = {
  heavy: `'Avenir Next', 'Arial Black', ${DEV}, sans-serif`,
  impact: `Impact, 'Arial Black', ${DEV}, sans-serif`,
  sans: `'Space Grotesk', 'Avenir Next', ${DEV}, sans-serif`,
  inter: `Inter, 'Helvetica Neue', ${DEV}, sans-serif`,
  mono: `'JetBrains Mono', Menlo, ${DEV}, monospace`,
  hand: `Kalam, 'Patrick Hand', ${DEV}, cursive`,
  comic: `'Comic Sans MS', 'Chalkboard SE', ${DEV}, cursive`,
  serif: `'Instrument Serif', Didot, Georgia, ${DEV}, serif`,
  typewriter: `'American Typewriter', 'Courier New', ${DEV}, serif`,
};
