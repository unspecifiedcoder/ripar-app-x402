// Where the agents sit.
//
// A grid would be legible and dead. A pure random scatter would be alive and
// illegible. This is the middle: a handful of loose constellations placed on a
// golden-angle ring, each agent dropped around its cluster on a bell curve,
// then relaxed apart so no two nodes ever fuse into one blob.
//
// Runs once, at construction, from the seeded generator.

import { gaussian, type Rng } from "./rng";

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export type Placed = { x: number; y: number; cluster: number };

export function placeAgents(count: number, clusters: number, r: Rng): Placed[] {
  const centres = Array.from({ length: clusters }, (_, i) => {
    const angle = i * GOLDEN * 2.4 + r() * 0.35;
    // Rings rather than one disc — the field reads as depth instead of soup.
    const radius = 0.22 + (i / Math.max(1, clusters - 1)) * 0.62 + gaussian(r, 0, 0.05);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.72 };
  });

  const spread = 0.1 + 0.5 / Math.sqrt(clusters);
  const pts: Placed[] = Array.from({ length: count }, (_, i) => {
    const cluster = i % clusters;
    const c = centres[cluster];
    return {
      x: c.x + gaussian(r, 0, spread),
      y: c.y + gaussian(r, 0, spread * 0.72),
      cluster,
    };
  });

  relax(pts, 0.052, 46);

  // Fit the field to the viewport after relaxation has pushed at its edges.
  //
  // Per axis, and that matters. This used to take a single maximum across both
  // axes and scale x and y by it together, which meant the wider axis decided
  // the fate of the narrower one: x would overflow to about 1.7, everything got
  // multiplied by 0.58, and y — which only ever reached 0.8 — came out at 0.46.
  // On screen that was a field filling the width and using less than half the
  // height, with a dead band across the bottom third of a full-bleed hero.
  //
  // Fit the actual bounding box rather than assuming the cloud is centred on
  // the origin. Seven clusters dropped on a ring with gaussian scatter are
  // never quite symmetric, and an uncentred field reads as a mistake even when
  // nobody can say why — it just looks like it slid.
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const halfX = (x1 - x0) / 2;
  const halfY = (y1 - y0) / 2;

  // Nearly the whole frame. Scaling by the extent guarantees every agent lands
  // inside it, so there is no reason to hold much back — and the panels are
  // glass, so agents passing behind them read as depth rather than as clipping.
  const kx = halfX > 0 ? 0.99 / halfX : 1;
  const ky = halfY > 0 ? 0.96 / halfY : 1;
  for (const p of pts) {
    p.x = (p.x - midX) * kx;
    p.y = (p.y - midY) * ky;
  }
  return pts;
}

/** Pairwise repulsion below a minimum distance. O(n²) once at init is fine. */
function relax(pts: Placed[], min: number, iterations: number) {
  const min2 = min * min;
  for (let step = 0; step < iterations; step++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        // Vertical space is scarcer than horizontal, so measure in that shape.
        const dx = a.x - b.x;
        const dy = (a.y - b.y) / 0.68;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min2 || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5;
        const px = dx * push;
        const py = dy * push * 0.68;
        a.x += px;
        a.y += py;
        b.x -= px;
        b.y -= py;
      }
    }
  }
}
