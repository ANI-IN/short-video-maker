import type { StyleDef } from '../lib/types';
import { kinetic } from './KineticTypography';
import { glitch } from './GlitchVHS';
import { neon } from './NeonGlow';
import { comic } from './ComicBook';
import { paperCutout } from './PaperCutout';
import { flatIcons } from './FlatIcons';
import { isometric } from './Isometric';
import { gradientBlob } from './GradientBlob';
import { neumorphism } from './Neumorphism';
import { particles } from './ParticleDots';
import { pixelArt } from './PixelArt';
import { emojiPop } from './EmojiPop';
import { oldFilm } from './OldFilm';
import { characterStory } from './CharacterStory';
import { documentaryHistory } from './DocumentaryHistory';
import { edtech } from './EdTech';

export const STYLES: Record<string, StyleDef> = {
  'kinetic-typography': kinetic,
  'glitch-vhs': glitch,
  'neon-glow': neon,
  'comic-book': comic,
  'paper-cutout': paperCutout,
  'flat-icons': flatIcons,
  'isometric': isometric,
  'gradient-blob': gradientBlob,
  'neumorphism': neumorphism,
  'particle-dots': particles,
  'pixel-art': pixelArt,
  'emoji-pop': emojiPop,
  'old-film': oldFilm,
  'character-story': characterStory,
  'documentary-history': documentaryHistory,
  'edtech': edtech,
};
