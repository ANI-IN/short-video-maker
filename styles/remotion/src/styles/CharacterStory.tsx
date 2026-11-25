// 24. character-story: 2D cutout puppet storytelling. Named characters (original designs from the character generator)
// act out each scene on layered illustrated sets: poses tween on cue, walks, a speaking character lip-flaps on the
// Whisper word timing and gestures, the camera pushes/pans with parallax, first appearances get a name tag.
import React from 'react';
import { AbsoluteFill, Easing, interpolate } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { useT, tokens, rand, clamp, tv } from '../lib/util';
import { Character } from '../character/Rig';
import { ToonCharacter, TOON_HEAD_Y } from '../character/Toon';
import { LIT_PROPS } from '../character/Lit';
import { designCharacter, type CharacterSpec } from '../character/design';
import { POSES, mix, type Pose } from '../character/poses';
import { backdrop, SetPiece, FLOOR } from '../character/Backgrounds';

type Action = { at: number; pose: string };
type Cast = { id: string; x?: number; depth?: number; facing?: 'left' | 'right'; pose?: string; actions?: Action[];
  walk?: { from: number; to: number; at?: number; dur?: number }; intro?: boolean; lie?: boolean };
type Shot = { t0: number; frame: 'wide' | 'medium' | 'close' | 'insert' | 'reverse'; who?: string; set?: number };
type Stage = { background?: string; camera?: string; set?: { kind: string; x: number; depth?: number; [k: string]: any }[]; cast?: Cast[]; speaker?: string; focus?: string;
  look?: 'toon' | 'cutout'; act?: boolean; shots?: 'auto' | { at: number; frame: Shot['frame']; who?: string; set?: number }[]; marquee?: string; marquee2?: string; screen?: string };

// Film coverage instead of one long move: the scene is cut into 1.6-3.4 s shots on phrase boundaries (Whisper timing),
// cycling wide -> medium -> close-up -> insert (a prop) -> reverse angle, hard cuts. Reference analysis: median shot 1.9 s.
function autoShots(scene: any, st: Stage): Shot[] {
  const dur = scene.dur, ws = scene.words || [];
  const b: number[] = [0];
  ws.forEach((w: any, i: number) => {
    const nx = ws[i + 1]; if (!nx) return;
    if ((/[.,!?;:—]$/.test(w.w) || nx.s - w.e > 0.25) && nx.s - b[b.length - 1] >= 1.6 && dur - nx.s >= 1.2) b.push(Math.max(0, nx.s - 0.04));
  });
  const all = [...b, dur], cuts: number[] = [];
  for (let i = 0; i < all.length - 1; i++) {
    cuts.push(all[i]); const L = all[i + 1] - all[i];
    if (L > 3.4) { const n = Math.ceil(L / 2.8); for (let k = 1; k < n; k++) cuts.push(all[i] + (L * k) / n); }
  }
  const cast = st.cast || [], sets = st.set || [];
  const order: Shot['frame'][] = ['wide', 'medium', 'close', 'insert', 'reverse', 'close', 'medium'];
  return cuts.map((t0, i) => {
    let f = i === 0 ? 'wide' : order[i % order.length];
    if (f === 'insert' && !sets.length) f = 'medium';
    if ((f === 'medium' || f === 'close') && !cast.length) f = sets.length ? 'insert' : 'wide';
    return { t0, frame: f, who: cast.length ? cast[Math.floor(i / 2) % cast.length].id : undefined, set: sets.length ? i % sets.length : 0 };
  });
}

const ease = Easing.inOut(Easing.cubic);
const TW = 0.45;   // pose tween time (s)

function poseName(c: Cast, sc: any, t: number): string {
  let n = c.pose || 'standing';
  (c.actions || []).forEach((a) => { if (t >= tv(sc, clamp(a.at, 0, 1))) n = a.pose; });
  return n;
}
function poseAt(c: Cast, sc: any, t: number): Pose {
  const keys: { t: number; p: Pose }[] = [{ t: -1, p: POSES[c.pose || 'standing'] || POSES.standing }];
  (c.actions || []).forEach((a) => keys.push({ t: tv(sc, clamp(a.at, 0, 1)), p: POSES[a.pose] || POSES.standing }));
  keys.sort((a, b) => a.t - b.t);
  let cur = keys[0].p;
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i].t) break;
    cur = mix(cur, keys[i].p, ease(clamp((t - keys[i].t) / TW)));
  }
  return cur;
}


// Auto-acting (documentary look): characters are never frozen while the narrator talks. With no scripted actions each
// cast member cycles through a small pool of poses (its own "acts" list, else a talk-show pool), 1.5-2.6 s per beat,
// each beat tweened in 0.45 s - like an animator's acting pass. Deterministic per character id.
const ACT_POOL = ['gesturing', 'explaining', 'idle', 'pointing', 'thinking', 'gesturing', 'standing', 'explaining'];
function autoAct(c: Cast & { acts?: string[] }, seed: number, t: number): Pose {
  const pool = c.acts && c.acts.length ? c.acts : ACT_POOL;
  let t0 = 0, k = 0; const beats: { t: number; n: string }[] = [];
  while (t0 < t + 3 && k < 200) { beats.push({ t: t0, n: pool[Math.floor(rand(seed * 13 + k * 7) * pool.length)] }); t0 += 1.5 + rand(seed + k * 3) * 1.1; k++; }
  let cur = POSES[c.pose || beats[0].n] || POSES.standing;
  for (let i = 1; i < beats.length; i++) { if (t < beats[i].t) break; cur = mix(cur, POSES[beats[i].n] || POSES.standing, ease(clamp((t - beats[i].t) / TW))); }
  return cur;
}

function walkCycle(p: Pose, ph: number, amt: number): Pose {
  const s = Math.sin(ph), c = Math.cos(ph);
  return { ...p, lhip: p.lhip + 24 * s * amt, rhip: p.rhip - 24 * s * amt, lknee: p.lknee + Math.max(0, -c) * 30 * amt, rknee: p.rknee + Math.max(0, c) * 30 * amt,
    lsh: p.lsh - 18 * s * amt, rsh: p.rsh + 18 * s * amt, drop: p.drop + Math.abs(s) * 6 * amt };
}

const Banner: React.FC<{ text: string; t: number }> = ({ text, t }) => {
  const p = clamp(t / 0.5);
  return (
    <div style={{ position: 'absolute', top: 230, left: 80, right: 160, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${(1 - p) * -20}px)` }}>
      <div style={{ background: '#f6ead0', border: '5px solid #1d1b18', borderRadius: 14, padding: '14px 30px', boxShadow: '8px 8px 0 #1d1b18',
        fontFamily: F.serif, fontSize: 64, lineHeight: 1.05, color: '#2b2118', textAlign: 'center' }}>
        {tokens(text).map((w, i) => <span key={i} style={{ color: w.k ? '#b02a2a' : '#2b2118', fontStyle: w.k ? 'italic' : 'normal' }}>{w.t} </span>)}
      </div>
    </div>
  );
};

const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { t } = useT();
  const sc: any = scene;
  const st: Stage = sc.stage || {};
  const specs: CharacterSpec[] = sc.characters || [];
  const designs = Object.fromEntries(specs.map((s, i) => [s.id, designCharacter(s, i)]));
  const bg = backdrop(st.background || 'court', t, st);
  const shots: Shot[] | null = st.shots === 'auto' ? autoShots(scene, st)
    : Array.isArray(st.shots) ? st.shots.map((x) => ({ ...x, t0: x.at <= 1 ? x.at * scene.dur : x.at })) : null;
  const toon = st.look === 'toon' || (st.look !== 'cutout' && st.shots === 'auto');   // film-coverage scenes get the upgraded look by default
  const HEAD = toon ? TOON_HEAD_Y : 470, CHEST = toon ? 320 : 340, TOP = toon ? 580 : 700;
  // per-prop geometry: legacy props + lit props (half width, lowest text line, insert centre)
  const PWX: Record<string, number> = { scoreboard: 300, sign: 160, tower: 160, 'ticket-counter': 270, script: 180, clapper: 180, 'film-camera': 160,
    ...Object.fromEntries(Object.entries(LIT_PROPS).map(([k, v]) => [k, v.w])) };
  let shotT = '', shotIdx = -1, dof = 0, drift = 0, push = 0;
  if (shots && shots.length) {
    shotIdx = shots.reduce((k, sh, i) => (t >= sh.t0 ? i : k), 0);
    const cur = shots[shotIdx], nxt = shots[shotIdx + 1];
    const prog = clamp((t - cur.t0) / Math.max(0.5, (nxt ? nxt.t0 : scene.dur) - cur.t0));
    const who = (st.cast || []).find((c) => c.id === cur.who) || (st.cast || [])[0];
    const sc1 = who && who.depth ? 1.08 : 1.42, wx = who ? (who.x ?? 0.5) * 1080 : 540;
    const piece = (st.set || [])[cur.set || 0];
    let cx = 540, cy = 960, z = 1.0;
    if (cur.frame === 'medium') { cx = wx; cy = FLOOR - CHEST * sc1; z = 1.55; }
    else if (cur.frame === 'close') { cx = wx; cy = FLOOR - HEAD * sc1; z = 2.3; }
    else if (cur.frame === 'insert' && piece) { cx = piece.x * 1080; cy = FLOOR - (LIT_PROPS[piece.kind] ? LIT_PROPS[piece.kind].insertY * (piece.depth ? 0.85 : 1) : ['scoreboard', 'tower', 'sign', 'ticket-counter', 'clapper'].includes(piece.kind) ? 480 : 300); z = LIT_PROPS[piece.kind] ? 1.5 : 1.65; }   // 1.65: a rotated stamp or label stays whole
    else if (cur.frame === 'reverse') { cx = 540 + (540 - wx) * 0.35; cy = 1010; z = 1.18; }   // a second angle: closer, off-centre (never mirrored: text would read backwards)
    z *= 1 + 0.035 * prog;                                 // a slow push inside the shot keeps it alive
    // and a lateral drift whose direction alternates per shot: the layers move at different speeds (real parallax)
    drift = (prog - 0.5) * (shotIdx % 2 ? 60 : -60); push = 0.05 * prog;
    const hw = 540 / z, hh = 960 / z;
    // text props on the actor's plane are either fully in frame or fully out - never a word cut by the frame edge
    if (cur.frame === 'medium' || cur.frame === 'close') {
      const PW = PWX;
      for (const pc of st.set || []) {
        const pw = PW[pc.kind]; if (!pw) continue;
        const px = pc.x * 1080, l = cx - hw, r = cx + hw;
        if (px + pw > l && px - pw < r && (px - pw < l || px + pw > r)) {          // partly in view
          const away = px > cx ? px - pw - hw - 8 : px + pw + hw + 8;               // push it fully out
          if (Math.abs(away - wx) < hw * 0.8) cx = away;
        }
      }
    }
    cx = Math.max(hw - 150, Math.min(1230 - hw, cx)); cy = Math.max(hh, Math.min(1920 - hh, cy));
    if (cur.frame === 'medium' || cur.frame === 'close') {
      // still a text prop cut by the frame (pushing it out was blocked by the stage edge): widen to a two-shot that holds
      // the actor AND the whole prop
      const PW = PWX;
      for (const pc of st.set || []) {
        const pw = PW[pc.kind]; if (!pw) continue;
        const px = pc.x * 1080, hwN = 540 / z, l = cx - hwN, r = cx + hwN;
        if (px + pw > l && px - pw < r && (px - pw < l || px + pw > r)) {
          const lo = Math.min(px - pw, wx - 140), hi = Math.max(px + pw, wx + 140);
          // fit both ways: the actor's head (~700 units up) down to the floor, where props stand
          z = Math.max(1.0, Math.min(z, 540 / ((hi - lo) / 2 + 30), 960 / (350 * sc1 + 60)));
          cx = (lo + hi) / 2; cy = Math.max(960 / z, Math.min(1920 - 960 / z, FLOOR - 350 * sc1));
          const hw2 = 540 / z; cx = Math.max(hw2 - 150, Math.min(1230 - hw2, cx));
        }
      }
    }
    {
      // caption-safe framing: no in-world text (prop labels, clapper, signs) may land in the caption band on screen
      // (y 1420-1660). Tilt the camera so the text frames above it; if the actor's head would leave the frame, ease the zoom.
      // y of each prop's LOWEST text line (its bottom must clear the caption card's top)
      const TY: Record<string, (pc: any) => number> = {
        scoreboard: () => FLOOR - 355, sign: () => FLOOR - 345, 'ticket-counter': () => FLOOR - 450, script: () => FLOOR - 150,
        clapper: () => FLOOR - 385, tower: (pc: any) => FLOOR - 900 * (pc.h ?? 1) - 45,
        ...Object.fromEntries(Object.entries(LIT_PROPS).map(([k, v]) => [k, (pc: any) => FLOOR - v.textY * (pc.depth ? 0.85 : 1)])) };
      const PW2 = PWX;
      const headTop = FLOOR - TOP * sc1;
      for (let pass = 0; pass < 3; pass++) {
        let moved = false;
        for (const pc of st.set || []) {
          if (!TY[pc.kind]) continue;
          const px = pc.x * 1080, hwz = 540 / z;
          if (px + (PW2[pc.kind] || 150) < cx - hwz || px - (PW2[pc.kind] || 150) > cx + hwz) continue;   // not on screen
          const sy = (TY[pc.kind](pc) - cy) * z + 960;
          if (sy > 1380 && sy < 1700) {
            let ncy = TY[pc.kind](pc) - (1330 - 960) / z;          // put its lowest text line well above the band
            if (ncy - 960 / z > headTop - 20) { z = Math.max(1.0, z * 0.85); ncy = TY[pc.kind](pc) - (1330 - 960) / z; }
            cy = Math.max(960 / z, Math.min(1920 - 960 / z, ncy)); moved = true;
          }
        }
        if (!moved) break;
      }
    }
    dof = cur.frame === 'close' ? 8 : cur.frame === 'medium' || cur.frame === 'insert' ? 5 : 0;   // inserts too: a wall sign cut by the frame reads as background, not a mistake   // background depth of field in tighter shots
    shotT = `translate(540 960) scale(${z}) translate(${-cx} ${-cy})`;
  }
  // camera
  const p = ease(clamp(t / Math.max(1, scene.dur)));
  const cams: Record<string, [number, number, number, number]> = {     // x0, x1, zoom0, zoom1
    'push-in': [0, 0, 1.0, 1.14], 'pull-out': [0, 0, 1.16, 1.0], 'pan-left': [70, -70, 1.08, 1.08], 'pan-right': [-70, 70, 1.08, 1.08], static: [0, 0, 1.03, 1.03],
  };
  const [x0, x1, z0, z1] = cams[st.camera || (index % 2 ? 'pan-right' : 'push-in')] || cams.static;
  let camX = shots ? drift : x0 + (x1 - x0) * p, zoom = shots ? 1 + push : z0 + (z1 - z0) * p;
  const focus = (st.cast || []).find((c) => c.id === (st.focus || st.speaker));
  const fx = focus ? ((focus.x ?? 0.5) - 0.5) * 1080 : 0;
  const pivotX = 540 + fx * 0.6, pivotY = FLOOR - 420;
  const layer = (k: number, node: React.ReactNode) => (
    <g transform={`translate(${pivotX} ${pivotY}) scale(${1 + (zoom - 1) * k}) translate(${-pivotX + camX * k} ${-pivotY})`}>{node}</g>
  );
  // speaking: mouth flap on each spoken word, gesture accents
  const word = scene.words.find((w) => t >= w.s && t < w.e);
  const talking = !!word && !!st.speaker && st.speaker !== 'narrator';
  // gesture weight ramps in/out over the whole spoken passage (not per word) so arms never jump between words
  const w0 = scene.words[0]?.s ?? 0, w1 = scene.words[scene.words.length - 1]?.e ?? scene.dur;
  const gw = st.speaker && st.speaker !== 'narrator' ? Math.min(clamp((t - w0 + 0.1) / 0.4), clamp((w1 + 0.3 - t) / 0.4)) : 0;
  const syll = word ? Math.abs(Math.sin(((t - word.s) / Math.max(0.12, word.e - word.s)) * Math.PI * Math.max(1, Math.round(word.w.length / 3)))) : 0;
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs><filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={dof} /></filter></defs>
        <g transform={shotT || undefined}>
        <g filter={dof ? 'url(#dof)' : undefined}>
        {layer(0.25, bg.sky)}
        {layer(0.5, bg.far)}
        {layer(0.8, bg.mid)}
        {layer(0.6, bg.top)}
        </g>
        {layer(1, bg.floor)}
        {layer(1, <g>
          {(st.set || []).map((s, i) => <g key={i} transform={`translate(${s.x * 1080},${FLOOR - (s.depth ? 30 : 0)}) scale(${s.depth ? 0.85 : 1})`}><SetPiece kind={s.kind} t={t} p={s} /></g>)}
          {[...(st.cast || [])].sort((a, b) => (b.depth || 0) - (a.depth || 0)).map((c, i) => {
            const d = designs[c.id]; if (!d) return null;
            let pose = (st.act ?? toon) && !(c.actions && c.actions.length) ? autoAct(c as any, i + 1 + c.id.length * 5, t) : poseAt(c, sc, t);
            let x = (c.x ?? 0.5) * 1080;
            let walking = false;
            if (c.walk) {
              const a0 = tv(sc, c.walk.at ?? 0), a1 = a0 + (c.walk.dur ?? 0.35) * (tv(sc, 1) - tv(sc, 0) || scene.dur);
              const k = clamp((t - a0) / Math.max(0.3, a1 - a0));
              x = (c.walk.from + (c.walk.to - c.walk.from) * ease(k)) * 1080;
              walking = k > 0 && k < 1;
              const env = Math.min(1, k / 0.12, (1 - k) / 0.12);   // stride eases in/out: no snap at the start or end of a walk
              if (walking) pose = mix(pose, walkCycle(mix(pose, POSES.walking, 0.6), (t - a0) * 7.5, 1), env);
            }
            const speaking = (talking && st.speaker === c.id) || (!!word && (st as any).mime === c.id);   // mime: the character mouths the narrated quote
            if (st.speaker === c.id && gw > 0) {
              const g = Math.sin(t * 5.2) * 9 * gw, n = Math.sin(t * 3.1) * 4 * gw;
              if (pose.drop < 60) pose = { ...pose, rsh: pose.rsh + (Math.max(pose.rsh, 38) - pose.rsh) * gw + g, rel: pose.rel + (Math.max(pose.rel, 50) - pose.rel) * gw + g * 0.8, head: pose.head + n * 0.5 };
              else pose = { ...pose, rsh: pose.rsh + g * 0.6, head: pose.head + n * 0.5 };
            }
            const facing = c.facing ? (c.facing === 'left' ? -1 : 1) : (x > 540 ? -1 : 1);
            const blink = (t * 1.0 + rand(i + index) * 7) % (3.2 + rand(i) * 1.5) < 0.13;
            const sc0 = c.depth ? 1.08 : 1.42;
            const pn = poseName(c, sc, t);
            const seated = pose.drop > 90 && pn.startsWith('sitting');
            return (
              <g key={c.id} transform={`translate(${x},${FLOOR - (c.depth ? 40 : 0) - (c.lie ? 190 * sc0 : 0)}) rotate(${c.lie ? -84 + Math.sin(t * 1.6) * 0.8 : 0})`}>   {/* lie: whole puppet laid flat (e.g. on the arrow bed), breathing */}
                {seated ? <g transform={`scale(${sc0})`}><rect x={-80} y={-128} width={160} height={128} rx={18} fill={d.sash} stroke="#1d1b18" strokeWidth={4.5} /><rect x={-86} y={-138} width={172} height={30} rx={14} fill={d.trim} stroke="#1d1b18" strokeWidth={4} /></g> : null}
                {(() => { const rs = { pose, blink, mouthOpen: speaking ? 0.25 + 0.75 * syll : 0, t: t + i * 1.7, speaking, propAtMouth: pn === 'flute' };
                  return toon ? <ToonCharacter d={d} facing={facing as 1 | -1} scale={sc0 * 1.06} s={rs} /> : <Character d={d} facing={facing as 1 | -1} scale={sc0} s={rs} />; })()}
                {speaking && !toon ? <g transform={`translate(${facing * 70},${-700 * sc0})`} opacity={0.85}>
                  {[0, 1, 2].map((k) => <path key={k} d={`M ${facing * (10 + k * 14)} ${-k * 4} q ${facing * 10} -14 0 -28`} fill="none" stroke="#1d1b18" strokeWidth={4} opacity={(Math.sin(t * 9 - k) + 1) / 2} />)}
                </g> : null}
                {c.intro ? (() => {
                  const k = interpolate(t, [0.3, 0.7, 2.6, 3.0], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  // keep the whole tag inside the frame (shift it sideways near the edges) and stagger neighbours vertically so
                  // two tags never touch
                  const half = d.name.length * 15 + 26, m = 28;
                  const dx = x - half < m ? m - (x - half) : x + half > 1080 - m ? 1080 - m - (x + half) : 0;
                  const dy = (i % 2) * 74;
                  return <g opacity={k} transform={`translate(${dx},${-(FLOOR - 405) + dy + (c.depth ? 40 : 0) + (1 - k) * 20})`}>   {/* fixed band just under the headline banner */}
                    <rect x={-d.name.length * 15 - 26} y={-34} width={d.name.length * 30 + 52} height={60} rx={30} fill="#1d1b18" />
                    <text x={0} y={8} textAnchor="middle" fontFamily={F.heavy} fontWeight={800} fontSize={36} fill="#ffd43b">{d.name}</text></g>;
                })() : null}
              </g>
            );
          })}
        </g>)}
        {layer(1.2, bg.front)}
        </g>
        {bg.tint ? <rect width={1080} height={1920} fill={bg.tint} /> : null}
      </svg>
      {/* film-coverage mode (documentary): no title banner over the picture - the reference shows text only inside the
          world (marquees, signs, scoreboards); the karaoke captions carry the words */}
      {shots ? null : <Banner text={scene.headline} t={index === 0 ? 1 : t} />}
    </AbsoluteFill>
  );
};
export const characterStory: StyleDef = { Scene, transition: 'fade', captions: { key: '#ffd43b', y: 1500 } };   // floor zone: never over faces
