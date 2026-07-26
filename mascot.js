"use strict";
/* ============================================================
   MASCOTTE — Foxy (la volpe guida) e Pipelette (la gazza).
   SVG inline generato: nessun asset, nessuna libreria.
   Le pose cambiano trasformazioni e tratti del viso, non il corpo.
   ============================================================ */

const FOX_POSES = ["idle","parle","saute","montre","curieux","salue"];
const PIE_POSES = ["vole","rit","boude"];

/* palette Foxy */
const FOX = { fur:"#FF8A3D", furDark:"#E86E20", belly:"#FFF3E4", ink:"#3D2B24" };

/* tratti del viso per posa: bocca (path) e occhi (rx/ry) */
const FOX_FACE = {
  idle:    { mouth:"M44 62 q6 5 12 0",        eyeRy:5,   brow:0  },
  parle:   { mouth:"M44 60 q6 10 12 0 q-6 4 -12 0", eyeRy:5, brow:0 },
  saute:   { mouth:"M42 58 q8 12 16 0",       eyeRy:2.5, brow:-3 },
  montre:  { mouth:"M44 62 q6 4 12 0",        eyeRy:5,   brow:-2 },
  curieux: { mouth:"M45 63 q5 2 10 0",        eyeRy:6,   brow:-5 },
  salue:   { mouth:"M43 59 q7 9 14 0",        eyeRy:3,   brow:-2 },
};

function foxSvg(pose, opts = {}) {
  const p = FOX_POSES.includes(pose) ? pose : "idle";
  const size = opts.size || 120;
  const face = FOX_FACE[p];
  const flip = opts.flip ? ' transform="scale(-1,1) translate(-100,0)"' : "";
  return `<svg class="mascot-svg fox-${p}" viewBox="0 0 100 110" width="${size}" height="${size * 1.1}" aria-hidden="true"><g${flip}>
  <g class="fox-tail"><path d="M18 84 q-16 -6 -14 -24 q10 12 20 14 z" fill="${FOX.fur}"/>
    <path d="M8 62 q-6 -8 -4 -14 q6 6 10 8 z" fill="${FOX.belly}"/></g>
  <g class="fox-body">
    <ellipse cx="50" cy="86" rx="24" ry="20" fill="${FOX.fur}"/>
    <ellipse cx="50" cy="90" rx="14" ry="13" fill="${FOX.belly}"/>
  </g>
  <g class="fox-arm"><ellipse cx="74" cy="82" rx="7" ry="12" fill="${FOX.furDark}"/></g>
  <g class="fox-head">
    <path d="M28 40 l-4 -22 l18 10 z" fill="${FOX.furDark}"/>
    <path d="M72 40 l4 -22 l-18 10 z" fill="${FOX.furDark}"/>
    <ellipse cx="50" cy="46" rx="26" ry="23" fill="${FOX.fur}"/>
    <path d="M50 52 q-14 2 -18 12 q18 8 36 0 q-4 -10 -18 -12 z" fill="${FOX.belly}"/>
    <g class="fox-eyes" transform="translate(0 ${face.brow})">
      <ellipse cx="41" cy="44" rx="4" ry="${face.eyeRy}" fill="${FOX.ink}"/>
      <ellipse cx="59" cy="44" rx="4" ry="${face.eyeRy}" fill="${FOX.ink}"/>
    </g>
    <ellipse cx="50" cy="56" rx="4.5" ry="3.5" fill="${FOX.ink}"/>
    <path d="${face.mouth}" stroke="${FOX.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </g>
</g></svg>`;
}

/* palette Pipelette */
const PIE = { body:"#3A3A46", wing:"#5A5A68", belly:"#FDFDF6", beak:"#FFC53D", ink:"#1A1A20" };

const PIE_FACE = { vole:5, rit:2.5, boude:4 };

function pieSvg(pose, opts = {}) {
  const p = PIE_POSES.includes(pose) ? pose : "vole";
  const size = opts.size || 100;
  const eyeRy = PIE_FACE[p];
  const flip = opts.flip ? ' transform="scale(-1,1) translate(-100,0)"' : "";
  return `<svg class="mascot-svg pie-${p}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><g${flip}>
  <path class="pie-tail" d="M18 62 l-16 14 l18 -2 z" fill="${PIE.body}"/>
  <ellipse cx="52" cy="58" rx="26" ry="20" fill="${PIE.body}"/>
  <ellipse cx="56" cy="62" rx="14" ry="12" fill="${PIE.belly}"/>
  <g class="pie-wing"><ellipse cx="48" cy="52" rx="16" ry="9" fill="${PIE.wing}" transform="rotate(-18 48 52)"/></g>
  <circle cx="70" cy="38" r="15" fill="${PIE.body}"/>
  <ellipse cx="74" cy="36" rx="3.5" ry="${eyeRy}" fill="${PIE.ink}"/>
  <path d="M84 38 l12 4 l-12 4 z" fill="${PIE.beak}"/>
</g></svg>`;
}
