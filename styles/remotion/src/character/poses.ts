// Pose library for the 2D cutout rig. Angles in degrees, defined for a character facing RIGHT (forward = +x);
// facing left is a mirror. Arms: sh = shoulder (0 = hanging down, 90 = straight forward, 180 = straight up,
// negative = behind), el = elbow bend (0 = straight, positive bends the forearm forward/up).
// Legs: hip (0 = down, positive = forward), knee (positive bends the shin backward).
// torso = lean forward from the hips, head = nod forward (+) / tilt back (-), drop = how far the hips sink (px, rig units).
export type Pose = {
  torso: number; head: number; drop: number;
  lsh: number; lel: number; rsh: number; rel: number;   // l = far/back arm, r = near/front arm
  lhip: number; lknee: number; rhip: number; rknee: number;
  brow?: number;   // eyebrow angle: + worried/sad, - angry/determined
  mouth?: 'closed' | 'smile' | 'frown' | 'open';
};

const P = (o: Partial<Pose>): Pose => ({ torso: 0, head: 0, drop: 0, lsh: 8, lel: 10, rsh: -6, rel: 12, lhip: 2, lknee: 0, rhip: -2, rknee: 0, brow: 0, mouth: 'closed', ...o });

export const POSES: Record<string, Pose> = {
  standing:   P({}),
  idle:       P({ lsh: 12, lel: 25, rsh: 4, rel: 30, head: 3 }),
  pointing:   P({ rsh: 88, rel: 4, lsh: 6, lel: 20, torso: 4, head: -4, brow: -6 }),
  gesturing:  P({ rsh: 55, rel: 60, lsh: 25, lel: 50, head: -2 }),            // talking with the hands
  explaining: P({ rsh: 70, rel: 75, lsh: 40, lel: 70, torso: 3 }),
  blessing:   P({ rsh: 75, rel: 95, lsh: 10, lel: 30, head: 4, mouth: 'smile' }), // raised open palm
  namaste:    P({ rsh: 45, rel: 115, lsh: 45, lel: 115, head: 8, torso: 4 }),
  bowing:     P({ torso: 38, head: 20, rsh: 35, rel: 100, lsh: 35, lel: 100, rhip: -6, lhip: -6 }),
  walking:    P({ lsh: -20, lel: 18, rsh: 20, rel: 22, lhip: 22, lknee: 8, rhip: -18, rknee: 22 }),
  holding:    P({ rsh: 30, rel: 80, lsh: 8, lel: 15 }),                       // holding the prop up in front
  'weapon-raised': P({ rsh: 160, rel: 20, lsh: 30, lel: 40, torso: -4, head: -6, brow: -10, mouth: 'open' }),
  'drawing-bow': P({ lsh: 90, lel: 0, rsh: 90, rel: 150, torso: -4, head: -2, brow: -8, lhip: 14, rhip: -16 }),
  'fighting-stance': P({ drop: 24, torso: 10, lsh: 60, lel: 80, rsh: 40, rel: 95, lhip: 28, lknee: 30, rhip: -24, rknee: 18, brow: -10 }),
  sitting:    P({ drop: 112, lhip: 88, lknee: 88, rhip: 92, rknee: 92, lsh: 18, lel: 55, rsh: 22, rel: 60 }),
  'sitting-talk': P({ drop: 112, lhip: 88, lknee: 88, rhip: 92, rknee: 92, lsh: 18, lel: 55, rsh: 60, rel: 70 }),
  kneeling:   P({ drop: 100, lhip: 85, lknee: 85, rhip: 0, rknee: 95, torso: 12, head: 18, lsh: 10, lel: 20, rsh: 10, rel: 20, brow: 10, mouth: 'frown' }),
  despair:    P({ torso: 16, head: 26, lsh: 4, lel: 8, rsh: 2, rel: 8, brow: 14, mouth: 'frown' }),
  'arms-raised': P({ lsh: 160, lel: 20, rsh: 165, rel: 15, head: -10, mouth: 'open' }),
  throwing:   P({ rsh: 120, rel: 10, lsh: 20, lel: 30, torso: 8, head: -4, mouth: 'open' }),
  shocked:    P({ torso: -8, head: -10, lsh: 70, lel: 110, rsh: 70, rel: 110, brow: 12, mouth: 'open' }),
  laughing:   P({ torso: -6, head: -14, lsh: 30, lel: 90, rsh: 30, rel: 90, mouth: 'open' }),
  thinking:   P({ rsh: 40, rel: 140, lsh: 30, lel: 100, head: 6, brow: 6 }),
  'flute':    P({ rsh: 62, rel: 118, lsh: 70, lel: 110, head: 6, mouth: 'closed' }),
};

export const POSE_NAMES = Object.keys(POSES);

const KEYS: (keyof Pose)[] = ['torso', 'head', 'drop', 'lsh', 'lel', 'rsh', 'rel', 'lhip', 'lknee', 'rhip', 'rknee', 'brow'];
export const mix = (a: Pose, b: Pose, t: number): Pose => {
  const o: any = { ...b };
  KEYS.forEach((k) => { o[k] = (a[k] as number ?? 0) + (((b[k] as number) ?? 0) - ((a[k] as number) ?? 0)) * t; });
  o.mouth = t < 0.5 ? a.mouth : b.mouth;
  return o;
};
