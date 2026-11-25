// Character generator: description -> an ORIGINAL cutout design on the shared rig.
// Explicit fields win; otherwise the description's keywords pick skin, headwear, prop, build and accessories.
// Clothing palettes are assigned per story so every character gets a distinct colour identity.
export type Design = {
  id: string; name: string;
  skin: string; skinShade: string; hair: string;
  top: string; bottom: string; sash: string; trim: string;
  headwear: 'crown' | 'peacock-crown' | 'turban' | 'hair-bun' | 'helmet' | 'long-hair' | 'veil' | 'bald' | 'none' | 'short-hair' | 'cap';
  prop: 'bow' | 'flute' | 'mace' | 'sword' | 'chakra' | 'dice' | 'scroll' | 'lotus' | 'staff' | 'none';
  build: number; height: number; female: boolean; beard: 'none' | 'black' | 'white'; mustache: boolean;
  blindfold: boolean; eyesClosed: boolean; tilak: boolean; jewelry: boolean; armor: boolean; old: boolean; voice?: string;
  modern: boolean; glasses: boolean;   // modern-day people (fans, filmmakers, clerks): no sash/tilak, short hair or cap
};
export type CharacterSpec = Partial<Design> & { id: string; name?: string; description?: string; role?: string; skinTone?: string };

const SKIN: Record<string, [string, string]> = {
  blue: ['#3f78d1', '#2d5aa3'], 'dark-blue': ['#2f4f9e', '#22397a'], dusky: ['#8a5a3c', '#6c442c'], brown: ['#b0754d', '#8c5a39'],
  wheat: ['#d9a374', '#b9845a'], fair: ['#f0c7a0', '#d4a47c'], green: ['#5aa36b', '#447d52'], grey: ['#9aa3ad', '#7b838c'],
};
const PALETTES: [string, string, string, string][] = [   // top, bottom, sash, trim
  ['#f2b632', '#e0662f', '#d6336c', '#ffe066'],   // saffron / orange
  ['#ffffff', '#c92a2a', '#f08c00', '#ffd43b'],   // white / red
  ['#2b8a3e', '#f5f0e6', '#e8590c', '#ffd43b'],   // green / cream
  ['#5f3dc4', '#e64980', '#fab005', '#ffe066'],   // purple / pink
  ['#1971c2', '#f8f9fa', '#e03131', '#ffd43b'],   // blue / white
  ['#862e2e', '#343a40', '#c0a062', '#e9c46a'],   // maroon / charcoal (villain)
  ['#495057', '#868e96', '#adb5bd', '#ced4da'],   // grey (sage / elder)
  ['#e8590c', '#fff3bf', '#0b7285', '#ffd43b'],   // amber / teal
];
const has = (d: string, ...w: string[]) => w.some((x) => d.includes(x));
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function designCharacter(spec: CharacterSpec, index: number): Design {
  const d = `${spec.description || ''} ${spec.role || ''}`.toLowerCase();
  const female = spec.female ?? has(d, 'woman', 'queen', 'princess', 'mother', 'female', 'she ', 'goddess', 'wife');
  const old = spec.old ?? has(d, 'old', 'elder', 'grandsire', 'aged', 'sage', 'teacher', 'guru', 'white beard');
  const skinKey = spec.skinTone || (has(d, 'blue') ? 'blue' : has(d, 'dark', 'dusky') ? 'dusky' : has(d, 'fair', 'pale') ? 'fair' : old ? 'wheat' : ['brown', 'wheat', 'dusky'][hash(spec.id) % 3]);
  const [skin, skinShade] = SKIN[skinKey] || [skinKey, skinKey];
  const villain = has(d, 'villain', 'scheming', 'cunning', 'evil', 'jealous', 'arrogant');
  const pal = PALETTES[villain ? 5 : old && has(d, 'sage', 'guru', 'teacher', 'grandsire') ? 6 : (index + (hash(spec.id) % 2)) % 5 + (index > 4 ? 3 : 0)];
  const modern = spec.modern ?? has(d, 'modern', 'fan', 'director', 'actor', 'clerk', 'shirt', 'hoodie', 'jeans', 'cap', 'glasses', 'executive', 'reporter', 'student', 'office', 'cinema', 'manager');
  const headwear = spec.headwear || (modern ? (has(d, 'cap') ? 'cap' : female ? 'long-hair' : 'short-hair') : has(d, 'peacock') ? 'peacock-crown' : has(d, 'crown', 'king', 'prince', 'emperor', 'royal') ? 'crown'
    : has(d, 'helmet', 'warrior general') ? 'helmet' : has(d, 'turban', 'minister', 'charioteer', 'advisor') ? 'turban'
      : has(d, 'veil') ? 'veil' : female ? 'long-hair' : has(d, 'sage', 'hermit', 'ascetic') ? 'hair-bun' : 'hair-bun');
  const prop = spec.prop || (has(d, 'flute') ? 'flute' : has(d, 'bow', 'archer') ? 'bow' : has(d, 'mace', 'club') ? 'mace' : has(d, 'sword') ? 'sword'
    : has(d, 'chakra', 'discus') ? 'chakra' : has(d, 'dice', 'gambl') ? 'dice' : has(d, 'scroll', 'book') ? 'scroll' : has(d, 'lotus') ? 'lotus'
      : has(d, 'staff', 'stick', 'cane') ? 'staff' : 'none');
  return {
    id: spec.id, name: spec.name || spec.id,
    skin, skinShade, hair: spec.hair || (old ? '#e9ecef' : '#1c1917'),
    top: spec.top || pal[0], bottom: spec.bottom || pal[1], sash: spec.sash || pal[2], trim: spec.trim || pal[3],
    headwear: headwear as Design['headwear'], prop: prop as Design['prop'],
    build: spec.build ?? (has(d, 'strong', 'mighty', 'huge', 'giant', 'bhima', 'muscular') ? 1.22 : has(d, 'slim', 'young', 'boy') ? 0.92 : 1),
    height: spec.height ?? (has(d, 'tall', 'giant', 'towering') ? 1.07 : has(d, 'short', 'child', 'boy') ? 0.9 : female ? 0.95 : 1),
    female, old,
    beard: spec.beard || (has(d, 'white beard') || (old && !female) ? 'white' : has(d, 'beard') ? 'black' : 'none'),
    mustache: spec.mustache ?? (!female && has(d, 'mustache', 'moustache', 'warrior', 'king', 'archer', 'scheming')),
    blindfold: spec.blindfold ?? has(d, 'blindfold'), eyesClosed: spec.eyesClosed ?? (has(d, 'blind') && !has(d, 'blindfold')),
    modern, glasses: spec.glasses ?? has(d, 'glasses', 'spectacles'),
    tilak: spec.tilak ?? (!female && !modern), jewelry: spec.jewelry ?? has(d, 'king', 'queen', 'prince', 'royal', 'crown', 'god', 'lord', 'peacock'),
    armor: spec.armor ?? has(d, 'warrior', 'armor', 'armour', 'archer', 'general', 'soldier'), voice: spec.voice,
  };
}
