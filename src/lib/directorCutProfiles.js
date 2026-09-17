import { OW_HEROES, formatOwHeroName, getOwHero, normalizeOwLookupKey } from './heroes.js'
import { getDirectorCutLineDirection } from './directorCutLineDirections.js'
import { getDirectorCutAmbientField } from './directorCutAmbientFields.js'
import { getDirectorCutEmblemFrame } from './directorCutEmblemFrames.js'
import { getHeroRenderImage, heroNameToSlug, normalizeHeroFolder } from './reviewAssets.js'
import { getDirectorCutStorySignature } from './directorCutStorySignatures.js'

const ARCHIVE_HEROES = [
  { id: 'dmon', zh: 'D.Mon', en: 'D.Mon', role: 'tank', assetKey: 'dmon', aliases: ['DMon'] }
]

const HERO_RECIPES = {
  domina: ['fortress', 'SOVEREIGN / ORDER', '#d9c997', 'monument'],
  doomfist: ['impact', 'GAUNTLET / IMPACT', '#cf5947', 'kinetic'],
  dva: ['orbit', 'MECHA / AFTERBURN', '#eb7fb9', 'aerial'],
  dmon: ['signal', 'INTERCEPT / AEGIS', '#73c9df', 'aerial'],
  hazard: ['strata', 'FRACTURE / ASCENT', '#9275bb', 'asymmetric'],
  'junker-queen': ['trajectory', 'BLADE / COMMAND', '#e46a43', 'kinetic'],
  mauga: ['fortress', 'FURNACE / CROSSFIRE', '#d8573f', 'monument'],
  orisa: ['orbit', 'SENTRY / HORIZON', '#79af68', 'monument'],
  ramattra: ['strata', 'VOID / NEMESIS', '#8f7db5', 'ritual'],
  reinhardt: ['fortress', 'BASTION / HONOR', '#9cbccc', 'monument'],
  roadhog: ['signal', 'CHAIN / UNDERTOW', '#bd925d', 'asymmetric'],
  sigma: ['orbit', 'GRAVITY / CONCERTO', '#719bc9', 'ritual'],
  winston: ['trajectory', 'PRIMAL / VOLTAGE', '#819bb5', 'kinetic'],
  'wrecking-ball': ['orbit', 'GYROSCOPE / MOMENTUM', '#dc8b48', 'kinetic'],
  zarya: ['halo', 'PARTICLE / RESOLVE', '#ce76b2', 'monument'],

  anran: ['wave', 'EMBER / HARMONY', '#ed7642', 'kinetic'],
  ashe: ['trajectory', 'DEADEYE / VELVET', '#b87757', 'precision'],
  bastion: ['grid', 'GRID / RECONFIGURE', '#7fa270', 'monument'],
  cassidy: ['trajectory', 'NOON / CELLULOID', '#b96d4d', 'precision'],
  echo: ['orbit', 'REFRACTION / REPRISE', '#6ac8dc', 'aerial'],
  emre: ['signal', 'BREACH / OVERWATCH', '#6f9dbd', 'precision'],
  freja: ['trajectory', 'BOLT / NORTHWIND', '#87a7c2', 'aerial'],
  genji: ['wave', 'BLADE / CHROMA', '#70caa9', 'kinetic'],
  hanzo: ['trajectory', 'ARROW / DRAGONLINE', '#6aa3aa', 'precision'],
  junkrat: ['strata', 'CHAOS / DETONATION', '#e0a33b', 'asymmetric'],
  mei: ['halo', 'FROST / STILL FRAME', '#77b9d8', 'ritual'],
  pharah: ['trajectory', 'ROCKET / SKYLINE', '#6689c5', 'aerial'],
  reaper: ['wave', 'SHADOW / DISSOLVE', '#8c99a6', 'asymmetric'],
  sojourn: ['trajectory', 'RAIL / VELOCITY', '#5ea2bd', 'precision'],
  'soldier-76': ['signal', 'PULSE / PROTOCOL', '#758aa2', 'precision'],
  sierra: ['strata', 'RIDGELINE / PURSUIT', '#9a7d66', 'asymmetric'],
  shion: ['wave', 'WRAITH / REDACTION', '#d8d9df', 'ritual'],
  sombra: ['signal', 'GLITCH / NEGATIVE', '#a85ac7', 'asymmetric'],
  symmetra: ['orbit', 'LATTICE / ORDER', '#62a6c5', 'ritual'],
  torbjorn: ['fortress', 'FORGE / BLUEPRINT', '#c16e48', 'monument'],
  tracer: ['orbit', 'CHRONO / JUMP CUT', '#e29a3c', 'kinetic'],
  vendetta: ['trajectory', 'DUEL / FINAL TAKE', '#b94a4e', 'precision'],
  venture: ['strata', 'STRATA / SEISMIC', '#c58b54', 'asymmetric'],
  widowmaker: ['signal', 'SCOPE / SILENCE', '#858a9f', 'precision'],

  ana: ['signal', 'SIGHTLINE / VIGIL', '#52788f', 'precision'],
  baptiste: ['halo', 'FIELD / SECOND CHANCE', '#d28a4b', 'monument'],
  brigitte: ['fortress', 'RALLY / STANDARD', '#c58a5c', 'monument'],
  illari: ['halo', 'SOLAR / EXPOSURE', '#e2a341', 'aerial'],
  'jetpack-cat': ['nine-lives', 'JETSTREAM / NINE LIVES', '#70b8d4', 'aerial'],
  juno: ['orbit', 'ORBIT / LIFELINE', '#7d83d8', 'aerial'],
  kiriko: ['wave', 'TORII / FOXFIRE', '#d56f68', 'kinetic'],
  lifeweaver: ['halo', 'BLOOM / LATTICE', '#d987ad', 'ritual'],
  lucio: ['wave', 'RHYTHM / RESONANCE', '#64c87a', 'kinetic'],
  mercy: ['halo', 'WINGS / ASCENSION', '#e7cf83', 'aerial'],
  mizuki: ['tide', 'TIDE / AFTERIMAGE', '#6eb4b9', 'ritual'],
  moira: ['wave', 'DUALITY / DECAY', '#a468c5', 'asymmetric'],
  wuyang: ['tide', 'CURRENT / RETURN', '#5faabd', 'ritual'],
  zenyatta: ['orbit', 'MANDALA / TRANSCEND', '#d6aa53', 'ritual']
}

const COMPOSITIONS = {
  monument: { subjectScale: 1.04, subjectX: -0.025, subjectY: 0.018, ghostX: -0.02, ghostY: 0 },
  kinetic: { subjectScale: 1.12, subjectX: 0.035, subjectY: 0.008, ghostX: 0.035, ghostY: 0.015 },
  aerial: { subjectScale: 1.08, subjectX: 0.028, subjectY: -0.028, ghostX: 0.02, ghostY: -0.015 },
  precision: { subjectScale: 1.06, subjectX: -0.045, subjectY: -0.008, ghostX: -0.035, ghostY: -0.01 },
  ritual: { subjectScale: 1.02, subjectX: 0.005, subjectY: 0.025, ghostX: 0, ghostY: 0.02 },
  asymmetric: { subjectScale: 1.1, subjectX: -0.065, subjectY: 0.012, ghostX: 0.055, ghostY: 0.01 }
}

export const DIRECTOR_CUT_STAGE_AUDIT_VERSION = '2026-09-01-v86'

// Every tuple is reviewed against the final 1920x1080 ticket, not inferred from
// role or motif. `subjectScale` is a camera zoom against the render's complete
// 1920x1080 source frame; weapons, wings and other transparent-image extremities
// no longer change the zoom. Tuple order: [subjectScale, subjectX, subjectY].
// Keeping all heroes explicit makes a new or replaced render fail QA until it is
// calibrated.
const HERO_STAGE_CALIBRATIONS = Object.freeze({
  domina: [1.52, -0.02, -0.04],
  doomfist: [1.52, -0.02, 0],
  dva: [1.42, -0.08, 0.035],
  dmon: [1.45, -0.065, 0.03],
  hazard: [1.42, -0.06, 0.005],
  'junker-queen': [1.4, -0.05, 0.025],
  mauga: [1.5, -0.055, 0],
  orisa: [1.4, -0.05, 0],
  ramattra: [1.42, -0.04, -0.005],
  reinhardt: [1.44, -0.045, 0.005],
  roadhog: [1.42, -0.06, 0.005],
  sigma: [1.5, -0.04, 0],
  winston: [1.28, -0.045, 0.005],
  'wrecking-ball': [1.58, -0.015, 0.155],
  zarya: [1.3, -0.045, -0.03],

  anran: [1.5, -0.015, 0.005],
  ashe: [1.65, -0.075, -0.005],
  bastion: [1.6, -0.06, 0.005],
  cassidy: [1.38, -0.045, -0.02],
  echo: [1.53, -0.005, 0.035],
  emre: [1.74, -0.05, 0.012],
  freja: [1.46, -0.005, -0.035],
  genji: [1.53, -0.015, 0.025],
  hanzo: [1.7, -0.055, 0.012],
  junkrat: [1.66, -0.055, 0.025],
  mei: [1.62, -0.025, 0.03],
  pharah: [1.48, -0.03, -0.015],
  reaper: [1.64, -0.065, 0.005],
  sojourn: [1.68, -0.07, 0.02],
  'soldier-76': [1.34, -0.095, -0.115],
  sierra: [1.8, -0.06, 0.02],
  shion: [1.72, -0.025, 0.03],
  sombra: [1.55, -0.06, 0.02],
  symmetra: [1.58, -0.015, -0.01],
  torbjorn: [1.26, -0.065, -0.1],
  tracer: [1.75, -0.005, 0.025],
  vendetta: [1.58, -0.055, 0.035],
  venture: [1.78, -0.06, 0.025],
  widowmaker: [1.78, -0.06, 0],

  ana: [1.45, -0.075, 0.005],
  baptiste: [1.58, -0.04, 0.03],
  brigitte: [1.38, -0.05, 0],
  illari: [1.72, -0.02, 0.015],
  'jetpack-cat': [1.78, -0.03, 0.04],
  juno: [1.7, -0.015, 0.015],
  kiriko: [1.56, -0.02, -0.025],
  lifeweaver: [1.58, -0.035, 0.035],
  lucio: [1.65, -0.025, 0.025],
  mercy: [1.44, -0.07, 0.035],
  mizuki: [1.52, -0.075, 0.045],
  moira: [1.5, -0.06, 0.025],
  wuyang: [1.55, -0.04, 0.025],
  zenyatta: [1.64, -0.04, 0.01]
})

// Only audited source cutouts receive edge treatment. Values are measured in
// ticket-space pixels so zooming a portrait does not change the fade length.
// The approved portraits keep their existing paint path byte-for-byte.
const PORTRAIT_COPY_CLEARANCE = Object.freeze({ subjectCopyFadeStart: 0.65, subjectCopyFadeEnd: 0.8 })
const HERO_PORTRAIT_BOUNDARIES = Object.freeze({
  doomfist: PORTRAIT_COPY_CLEARANCE,
  dva: { subjectFeatherTop: 54, subjectFeatherBottom: 76, ...PORTRAIT_COPY_CLEARANCE },
  dmon: { subjectFeatherTop: 28, ...PORTRAIT_COPY_CLEARANCE },
  'junker-queen': { subjectFeatherTop: 14 },
  mauga: PORTRAIT_COPY_CLEARANCE,
  orisa: PORTRAIT_COPY_CLEARANCE,
  ramattra: { subjectFeatherTop: 30, ...PORTRAIT_COPY_CLEARANCE },
  reinhardt: PORTRAIT_COPY_CLEARANCE,
  winston: PORTRAIT_COPY_CLEARANCE,
  zarya: PORTRAIT_COPY_CLEARANCE,
  anran: PORTRAIT_COPY_CLEARANCE,
  bastion: PORTRAIT_COPY_CLEARANCE,
  genji: PORTRAIT_COPY_CLEARANCE,
  junkrat: PORTRAIT_COPY_CLEARANCE,
  pharah: { subjectFeatherTop: 38, ...PORTRAIT_COPY_CLEARANCE },
  'soldier-76': { subjectFeatherBottom: 88 },
  sombra: PORTRAIT_COPY_CLEARANCE,
  torbjorn: { subjectFeatherBottom: 78, ...PORTRAIT_COPY_CLEARANCE },
  vendetta: { subjectFeatherTop: 40, ...PORTRAIT_COPY_CLEARANCE },
  baptiste: PORTRAIT_COPY_CLEARANCE,
  'jetpack-cat': PORTRAIT_COPY_CLEARANCE,
  mercy: PORTRAIT_COPY_CLEARANCE,
  mizuki: PORTRAIT_COPY_CLEARANCE,
  moira: PORTRAIT_COPY_CLEARANCE,
  wuyang: PORTRAIT_COPY_CLEARANCE
})

// Per-hero film finish, reviewed independently from camera placement. Tuple:
// [motifStrength, rimStrength, brightness, saturation, contrast, sepia, ghostScale].
// The story highlight provides the first rim color; the recipe palette supplies
// the second. Keeping every hero explicit prevents a new portrait from quietly
// falling back to the same generic grade as the rest of its role.
const HERO_POSTER_FINISHES = Object.freeze({
  domina: [1.62, 0.24, 1.07, 0.78, 1.19, 0.025, 0.92],
  doomfist: [1.82, 0.32, 1.06, 0.78, 1.22, 0.02, 0.96],
  dva: [1.62, 0.24, 1.08, 0.92, 1.17, 0, 0.92],
  dmon: [1.58, 0.23, 1.07, 0.86, 1.18, 0.01, 0.91],
  hazard: [1.68, 0.27, 1.06, 0.84, 1.2, 0.01, 0.94],
  'junker-queen': [1.7, 0.27, 1.07, 0.86, 1.2, 0.025, 0.95],
  mauga: [1.72, 0.28, 1.06, 0.84, 1.21, 0.03, 0.96],
  orisa: [1.58, 0.22, 1.08, 0.86, 1.17, 0.015, 0.92],
  ramattra: [1.72, 0.3, 1.08, 0.72, 1.2, 0, 0.94],
  reinhardt: [1.62, 0.23, 1.09, 0.74, 1.2, 0.02, 0.92],
  roadhog: [1.64, 0.24, 1.05, 0.72, 1.21, 0.04, 0.94],
  sigma: [1.66, 0.25, 1.08, 0.72, 1.2, 0.005, 0.93],
  winston: [1.58, 0.22, 1.08, 0.74, 1.19, 0.02, 0.92],
  'wrecking-ball': [1.58, 0.2, 1.08, 0.9, 1.15, 0.02, 0.84],
  zarya: [1.64, 0.23, 1.08, 0.88, 1.18, 0.005, 0.93],

  anran: [1.66, 0.24, 1.08, 0.9, 1.18, 0.015, 0.94],
  ashe: [1.62, 0.22, 1.06, 0.76, 1.2, 0.035, 0.94],
  bastion: [1.62, 0.21, 1.08, 0.8, 1.18, 0.025, 0.9],
  cassidy: [1.6, 0.22, 1.06, 0.8, 1.19, 0.035, 0.93],
  echo: [1.66, 0.24, 1.09, 0.88, 1.17, 0, 0.92],
  emre: [1.68, 0.27, 1.05, 0.76, 1.22, 0, 0.94],
  freja: [1.62, 0.22, 1.08, 0.74, 1.2, 0.015, 0.93],
  genji: [1.68, 0.26, 1.07, 0.84, 1.2, 0.005, 0.94],
  hanzo: [1.62, 0.23, 1.06, 0.72, 1.21, 0.02, 0.94],
  junkrat: [1.72, 0.28, 1.07, 0.92, 1.2, 0.025, 0.96],
  mei: [1.6, 0.22, 1.1, 0.78, 1.17, 0.005, 0.92],
  pharah: [1.64, 0.23, 1.07, 0.78, 1.2, 0.015, 0.93],
  reaper: [1.72, 0.34, 1.12, 0.62, 1.24, 0, 0.94],
  sojourn: [1.62, 0.23, 1.08, 0.78, 1.2, 0, 0.93],
  'soldier-76': [1.58, 0.22, 1.08, 0.7, 1.21, 0.015, 0.92],
  sierra: [1.64, 0.23, 1.07, 0.74, 1.2, 0.025, 0.94],
  shion: [1.68, 0.3, 1.08, 0.62, 1.22, 0, 0.94],
  sombra: [1.62, 0.3, 1.05, 0.9, 1.18, 0, 0.94],
  symmetra: [1.64, 0.24, 1.08, 0.78, 1.19, 0.005, 0.92],
  torbjorn: [1.62, 0.22, 1.07, 0.78, 1.2, 0.03, 0.92],
  tracer: [1.66, 0.25, 1.09, 0.9, 1.17, 0.005, 0.94],
  vendetta: [1.68, 0.27, 1.06, 0.82, 1.21, 0.02, 0.95],
  venture: [1.64, 0.23, 1.08, 0.82, 1.19, 0.025, 0.94],
  widowmaker: [1.66, 0.32, 1.08, 0.72, 1.2, 0, 0.94],

  ana: [1.62, 0.24, 1.1, 0.68, 1.21, 0.025, 0.93],
  baptiste: [1.62, 0.23, 1.08, 0.84, 1.18, 0.02, 0.93],
  brigitte: [1.62, 0.22, 1.08, 0.8, 1.2, 0.025, 0.92],
  illari: [1.68, 0.27, 1.1, 0.9, 1.19, 0.005, 0.94],
  'jetpack-cat': [1.6, 0.2, 1.1, 0.92, 1.15, 0.015, 0.82],
  juno: [1.64, 0.23, 1.09, 0.88, 1.17, 0.005, 0.93],
  kiriko: [1.66, 0.25, 1.08, 0.88, 1.19, 0.015, 0.94],
  lifeweaver: [1.64, 0.23, 1.09, 0.9, 1.17, 0.005, 0.93],
  lucio: [1.66, 0.24, 1.08, 0.92, 1.18, 0.005, 0.94],
  mercy: [1.6, 0.22, 1.11, 0.72, 1.18, 0.015, 0.92],
  mizuki: [1.68, 0.26, 1.07, 0.78, 1.21, 0.015, 0.94],
  moira: [1.68, 0.32, 1.07, 0.86, 1.2, 0, 0.94],
  wuyang: [1.64, 0.23, 1.09, 0.76, 1.18, 0.005, 0.93],
  zenyatta: [1.64, 0.23, 1.09, 0.72, 1.18, 0.025, 0.92]
})

// Per-hero background hierarchy. Tuple:
// [generic, story, texture, emblem, identity, ghost, customSignature].
// Story art owns the poster; the old recipe motif only supplies a faint spatial
// rhythm. The compact identity layer carries texture, never a second emblem.
const HERO_BACKGROUND_FINISHES = Object.freeze({
  domina: [0.08, 0.72, 0.74, 0.82, 0.3, 0.48, 0.7],
  doomfist: [0.06, 0.7, 0.6, 0.88, 0.28, 0.45, 0.72],
  dva: [0.1, 0.72, 0.68, 0.84, 0.34, 0.48, 0.72],
  dmon: [0.04, 0.7, 0.68, 0.75, 0.28, 0.44, 0.76],
  hazard: [0.08, 0.72, 0.64, 0.88, 0.3, 0.48, 0.72],
  'junker-queen': [0.02, 0.7, 0.48, 0.92, 0.24, 0.4, 0.72],
  mauga: [0.05, 0.68, 0.52, 0.88, 0.26, 0.42, 0.72],
  orisa: [0.04, 0.68, 0.58, 0.78, 0.28, 0.44, 0.72],
  ramattra: [0.03, 0.72, 0.6, 0.8, 0.26, 0.44, 0.78],
  reinhardt: [0.04, 0.7, 0.54, 0.82, 0.28, 0.46, 0.76],
  roadhog: [0.02, 0.64, 0.4, 0.78, 0.22, 0.38, 0.78],
  sigma: [0.02, 0.7, 0.56, 0.82, 0.26, 0.42, 0.76],
  winston: [0.08, 0.72, 0.64, 0.84, 0.32, 0.48, 0.72],
  'wrecking-ball': [0.1, 0.68, 0.6, 0.82, 0.34, 0.42, 0.7],
  zarya: [0.04, 0.7, 0.56, 0.88, 0.28, 0.44, 0.72],

  anran: [0.08, 0.72, 0.68, 0.84, 0.32, 0.5, 0.72],
  ashe: [0.06, 0.7, 0.58, 0.84, 0.28, 0.46, 0.72],
  bastion: [0.08, 0.7, 0.62, 0.82, 0.32, 0.46, 0.72],
  cassidy: [0.05, 0.68, 0.48, 0.86, 0.26, 0.42, 0.72],
  echo: [0.08, 0.72, 0.66, 0.84, 0.32, 0.48, 0.72],
  emre: [0.04, 0.68, 0.52, 0.82, 0.26, 0.42, 0.76],
  freja: [0.06, 0.68, 0.52, 0.86, 0.28, 0.46, 0.72],
  genji: [0.06, 0.7, 0.58, 0.88, 0.28, 0.44, 0.72],
  hanzo: [0.06, 0.68, 0.54, 0.88, 0.26, 0.44, 0.72],
  junkrat: [0.05, 0.68, 0.52, 0.9, 0.24, 0.42, 0.72],
  mei: [0.06, 0.7, 0.58, 0.86, 0.3, 0.46, 0.72],
  pharah: [0.06, 0.7, 0.56, 0.86, 0.28, 0.46, 0.72],
  reaper: [0.02, 0.68, 0.44, 0.8, 0.22, 0.36, 0.8],
  sojourn: [0.04, 0.68, 0.48, 0.88, 0.26, 0.42, 0.72],
  'soldier-76': [0.04, 0.66, 0.44, 0.86, 0.24, 0.4, 0.72],
  sierra: [0.06, 0.68, 0.56, 0.86, 0.28, 0.44, 0.72],
  shion: [0.02, 0.68, 0.44, 0.78, 0.22, 0.36, 0.8],
  sombra: [0.01, 0.66, 0.38, 0.78, 0.2, 0.34, 0.8],
  symmetra: [0.04, 0.72, 0.6, 0.88, 0.28, 0.44, 0.72],
  torbjorn: [0.04, 0.68, 0.46, 0.88, 0.24, 0.4, 0.72],
  tracer: [0.08, 0.72, 0.62, 0.86, 0.32, 0.48, 0.72],
  vendetta: [0.06, 0.68, 0.52, 0.88, 0.26, 0.42, 0.72],
  venture: [0.08, 0.7, 0.62, 0.84, 0.3, 0.46, 0.72],
  widowmaker: [0.01, 0.66, 0.38, 0.78, 0.2, 0.34, 0.8],

  ana: [0.04, 0.68, 0.48, 0.88, 0.24, 0.4, 0.72],
  baptiste: [0.06, 0.7, 0.58, 0.84, 0.28, 0.44, 0.74],
  brigitte: [0.06, 0.7, 0.56, 0.86, 0.28, 0.44, 0.72],
  illari: [0.05, 0.72, 0.56, 0.9, 0.28, 0.44, 0.72],
  'jetpack-cat': [0.1, 0.68, 0.58, 0.82, 0.34, 0.42, 0.7],
  juno: [0.08, 0.72, 0.62, 0.84, 0.32, 0.46, 0.72],
  kiriko: [0.01, 0.68, 0.42, 0.92, 0.22, 0.36, 0.72],
  lifeweaver: [0.03, 0.68, 0.48, 0.86, 0.24, 0.4, 0.74],
  lucio: [0.08, 0.7, 0.62, 0.86, 0.32, 0.46, 0.72],
  mercy: [0.06, 0.7, 0.56, 0.86, 0.28, 0.44, 0.72],
  mizuki: [0.05, 0.7, 0.56, 0.86, 0.28, 0.42, 0.74],
  moira: [0.01, 0.66, 0.38, 0.76, 0.2, 0.34, 0.8],
  wuyang: [0.05, 0.7, 0.58, 0.86, 0.28, 0.44, 0.74],
  zenyatta: [0.02, 0.7, 0.48, 0.82, 0.24, 0.38, 0.78]
})

function heroEmblem(languageField, {
  color,
  neutral,
  width = 440,
  anchorX = 0.56,
  anchorY = 0.5,
  opacity = 0.64,
  strength = 0.94,
  x = 0.74,
  y = 0.39,
  cropWidth = 0.5,
  cropHeight = 0.68,
  emblemSize = 216,
  offsetX = 0,
  offsetY = 0,
  finish = 'luminous',
  cleanZoneStrength = 0.33
}) {
  return {
    languageField,
    languageFieldEdition: 'poster',
    languageFieldStrength: strength,
    languageFieldX: x,
    languageFieldY: y,
    languageColor: color,
    languageNeutral: neutral,
    heroMarkMode: 'emblem',
    heroMarkWidth: width,
    heroMarkAnchorX: anchorX,
    heroMarkAnchorY: anchorY,
    heroMarkOpacity: opacity,
    heroMarkCropWidth: cropWidth,
    heroMarkCropHeight: cropHeight,
    heroEmblemSize: emblemSize,
    heroEmblemOffsetX: offsetX,
    heroEmblemOffsetY: offsetY,
    heroMarkFinish: finish,
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    cleanZoneStrength
  }
}

// These overrides only tune each hero's graphic language. Camera placement is
// owned by HERO_STAGE_CALIBRATIONS so one value cannot silently undo QA framing.
const HERO_STAGE_OVERRIDES = {
  anran: {
    ...heroEmblem('silk-ember', {
      color: '#ed7642', neutral: '#f2b34f', width: 448, anchorX: 0.561, anchorY: 0.52, opacity: 0.72, x: 0.74, y: 0.4,
      cropWidth: 0.46, cropHeight: 0.62, emblemSize: 230
    })
  },
  ashe: {
    ...heroEmblem('velvet-deadeye', {
      color: '#b87757', neutral: '#d6a05e', width: 462, anchorX: 0.456, anchorY: 0.492, opacity: 0.74, x: 0.74, y: 0.39,
      cropWidth: 0.5, cropHeight: 0.7, emblemSize: 232, finish: 'etched'
    })
  },
  echo: {
    ...heroEmblem('adaptive-reprise', {
      color: '#6ac8dc', neutral: '#d5f3ff', width: 448, anchorX: 0.594, anchorY: 0.5, opacity: 0.74, x: 0.75, y: 0.39,
      cropWidth: 0.5, cropHeight: 0.62, emblemSize: 228
    })
  },
  junkrat: {
    ...heroEmblem('secret-detonation', {
      color: '#e0a33b', neutral: '#e5d24a', width: 450, anchorX: 0.778, anchorY: 0.381, opacity: 0.76, x: 0.76, y: 0.37,
      cropWidth: 0.52, cropHeight: 0.72, emblemSize: 236, finish: 'etched'
    })
  },
  sojourn: {
    ...heroEmblem('rail-map', {
      color: '#628f9b', neutral: '#e1e7df', width: 512, anchorX: 0.6, anchorY: 0.5, opacity: 0.82, x: 0.755, y: 0.385,
      cropWidth: 0.72, cropHeight: 0.44, emblemSize: 244, offsetX: 0.008, offsetY: -0.002, finish: 'matte'
    })
  },
  sierra: {
    ...heroEmblem('summit-pursuit', {
      color: '#9a7d66', neutral: '#d5a667', width: 510, anchorX: 0.642, anchorY: 0.35, opacity: 0.8, x: 0.75, y: 0.365,
      cropWidth: 0.5, cropHeight: 0.64, emblemSize: 234, finish: 'etched'
    })
  },
  torbjorn: {
    ...heroEmblem('forge-blueprint', {
      color: '#c16e48', neutral: '#7695aa', width: 466, anchorX: 0.78, anchorY: 0.54, opacity: 0.78, x: 0.74, y: 0.39,
      cropWidth: 0.44, cropHeight: 0.58, emblemSize: 238, finish: 'etched'
    })
  },
  vendetta: {
    ...heroEmblem('duel-final-cut', {
      color: '#b94a4e', neutral: '#d75a61', width: 448, anchorX: 0.594, anchorY: 0.492, opacity: 0.65, x: 0.75, y: 0.39
    })
  },
  venture: {
    ...heroEmblem('buried-wayfinder', {
      color: '#c58b54', neutral: '#d7a45d', width: 500, anchorX: 0.639, anchorY: 0.519, opacity: 0.76, x: 0.75, y: 0.39,
      cropWidth: 0.55, cropHeight: 0.68, emblemSize: 232, finish: 'etched'
    })
  },
  illari: {
    ...heroEmblem('fractured-inti', {
      color: '#e2a341', neutral: '#f6df6a', width: 446, anchorX: 0.661, anchorY: 0.481, opacity: 0.65, x: 0.75, y: 0.38
    })
  },
  juno: {
    ...heroEmblem('mars-lifeline', {
      color: '#7d83d8', neutral: '#e56d67', width: 466, anchorX: 0.628, anchorY: 0.542, opacity: 0.7, x: 0.75, y: 0.39
    })
  },
  domina: {
    ...heroEmblem('sovereign-panopticon', {
      color: '#d9c997', neutral: '#e7c55f', width: 438, anchorX: 0.664, opacity: 0.64, x: 0.76, y: 0.38
    }),
    centerX: 0.41,
    centerY: 0.45,
    motifStrength: 1.62,
    rimStrength: 0.24,
    ghostScale: 0.92
  },
  doomfist: {
    ...heroEmblem('evolution-impact', {
      color: '#cf5947', neutral: '#ef9f45', width: 450, anchorX: 0.569, anchorY: 0.458, opacity: 0.66, x: 0.73
    }),
    centerX: 0.38,
    centerY: 0.48,
    motifStrength: 1.82,
    rimStrength: 0.34,
    ghostScale: 0.96
  },
  dva: {
    languageField: 'mecha-orbit',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.94,
    languageFieldX: 0.76,
    languageFieldY: 0.38,
    languageColor: '#eb7fb9',
    languageNeutral: '#78d8e7',
    heroMarkMode: 'emblem',
    heroMarkWidth: 442,
    heroMarkAnchorX: 0.633,
    heroMarkAnchorY: 0.5,
    heroMarkOpacity: 0.66,
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    cleanZoneStrength: 0.33
  },
  dmon: {
    languageField: 'intercept',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.96,
    languageFieldX: 0.76,
    languageFieldY: 0.36,
    languageStartY: 0.53,
    languageColor: '#73c9df',
    genericStrength: 0.015,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.04,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkWidth: 468,
    heroMarkAnchorX: 0.461,
    heroMarkAnchorY: 0.51,
    heroMarkOpacity: 0.71,
    cleanZoneStrength: 0.34
  },
  hazard: {
    ...heroEmblem('vanadium-fracture', {
      color: '#9275bb', neutral: '#83d7b4', width: 486, anchorX: 0.506, anchorY: 0.508, opacity: 0.72, x: 0.75
    })
  },
  'junker-queen': {
    ...heroEmblem('arena-crown', {
      color: '#e46a43', neutral: '#e5b34e', width: 452, anchorX: 0.619, anchorY: 0.335, opacity: 0.66, x: 0.75, y: 0.37, cleanZoneStrength: 0.32
    }),
    narrativeStage: false,
    narrativeFlow: 'scrap',
    narrativeStageX: 0.66,
    narrativeStageY: 0.34,
    narrativeStartY: 0.54,
    narrativeStageStrength: 0.78,
    narrativeFlowStrength: 0.82,
    narrativeStageScale: 0.84,
    narrativeEmblemStrength: 0.94,
    storyTextureStrength: 0
  },
  mauga: {
    ...heroEmblem('twin-heart-crossfire', {
      color: '#d8573f', neutral: '#f2a049', width: 464, anchorX: 0.671, anchorY: 0.508, opacity: 0.71
    })
  },
  orisa: {
    ...heroEmblem('guardian-horizon', {
      color: '#79af68', neutral: '#e5c65f', width: 450, anchorX: 0.617, anchorY: 0.462, opacity: 0.64, x: 0.75, y: 0.38
    }),
    signature: 'sentinel',
    signatureStrength: 1.04
  },
  sigma: {
    languageField: 'gravity-score',
    languageFieldEdition: 'poster',
    languageFieldStrength: 1,
    languageFieldX: 0.74,
    languageFieldY: 0.37,
    languageStartY: 0.55,
    languageColor: '#719bc9',
    genericStrength: 0.01,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkAnchorX: 0.656,
    heroMarkAnchorY: 0.5,
    heroMarkCropWidth: 0.48,
    heroMarkCropHeight: 0.68,
    heroMarkOpacity: 0.7,
    heroEmblemSize: 212,
    cleanZoneStrength: 0.34,
    signature: 'gravity-score',
    signatureStrength: 1.08
  },
  reinhardt: {
    languageField: 'crusader-vow',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.94,
    languageFieldX: 0.73,
    languageFieldY: 0.39,
    languageColor: '#9cbccc',
    languageNeutral: '#d8a85d',
    heroMarkMode: 'emblem',
    heroMarkWidth: 458,
    heroMarkAnchorX: 0.503,
    heroMarkAnchorY: 0.5,
    heroMarkOpacity: 0.7,
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    cleanZoneStrength: 0.33,
    signature: 'crusader-vow',
    signatureStrength: 1.04
  },
  roadhog: {
    languageField: 'undertow',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.96,
    languageFieldX: 0.7,
    languageFieldY: 0.41,
    languageStartY: 0.6,
    languageColor: '#bd925d',
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkWidth: 452,
    heroMarkAnchorX: 0.65,
    heroMarkAnchorY: 0.5,
    heroMarkOpacity: 0.65,
    centerX: 0.44,
    centerY: 0.48,
    motifStrength: 1.74,
    rimStrength: 0.27,
    rimPrimary: '#c39454',
    rimSecondary: '#829497',
    subjectBrightness: 1.12,
    subjectSaturation: 0.78,
    subjectContrast: 1.2,
    subjectSepia: 0.01,
    ghostScale: 0.92
  },
  winston: {
    ...heroEmblem('lunar-recall', {
      color: '#819bb5', neutral: '#e7b053', width: 500, anchorX: 0.569, anchorY: 0.331, opacity: 0.7, x: 0.75, y: 0.38
    })
  },
  'wrecking-ball': {
    ...heroEmblem('arena-escape', {
      color: '#dc8b48', neutral: '#8c9aa1', width: 440, anchorX: 0.606, opacity: 0.65, x: 0.75
    })
  },
  zarya: {
    languageField: 'particle-vault',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.94,
    languageFieldX: 0.72,
    languageFieldY: 0.39,
    languageStartY: 0.55,
    languageColor: '#ce76b2',
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkWidth: 440,
    heroMarkAnchorX: 0.511,
    heroMarkAnchorY: 0.51,
    heroMarkOpacity: 0.65,
    cleanZoneStrength: 0.32
  },
  ramattra: {
    languageField: 'vow-fracture',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.96,
    languageFieldX: 0.73,
    languageFieldY: 0.37,
    languageStartY: 0.57,
    languageColor: '#a78bd0',
    languageNeutral: '#d5a45d',
    genericStrength: 0.01,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.03,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkWidth: 432,
    heroMarkAnchorX: 0.6,
    heroMarkAnchorY: 0.5,
    heroMarkOpacity: 0.66,
    cleanZoneStrength: 0.33,
    signature: 'ravager-vow',
    signatureStrength: 1.18,
    signatureX: -0.07,
    storyX: -0.06,
    motifStrength: 1.72,
    rimStrength: 0.3,
    rimPrimary: '#d5a45d',
    rimSecondary: '#a78bd0',
    subjectBrightness: 1.08,
    subjectSaturation: 0.72,
    subjectContrast: 1.2,
    subjectSepia: 0,
    ghostScale: 0.94
  },
  bastion: {
    ...heroEmblem('nature-reconfigure', {
      color: '#7fa270', neutral: '#e0bd64', width: 480, anchorX: 0.469, anchorY: 0.492, opacity: 0.74, x: 0.75, y: 0.39,
      cropWidth: 0.46, cropHeight: 0.58, emblemSize: 226
    }),
    centerX: 0.39,
    centerY: 0.48,
    motifStrength: 1.68,
    rimStrength: 0.22,
    ghostScale: 0.92
  },
  cassidy: {
    languageField: 'noon-cut',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.94,
    languageFieldX: 0.73,
    languageFieldY: 0.4,
    languageStartY: 0.56,
    languageColor: '#b96d4d',
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkWidth: 438,
    heroMarkAnchorX: 0.647,
    heroMarkAnchorY: 0.5,
    heroMarkCropWidth: 0.5,
    heroMarkCropHeight: 0.72,
    heroMarkOpacity: 0.72,
    heroEmblemSize: 234,
    heroMarkFinish: 'etched',
    rimStrength: 0.22,
    cleanZoneStrength: 0.32
  },
  genji: {
    languageField: 'chroma-blade',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.94,
    languageFieldX: 0.74,
    languageFieldY: 0.39,
    languageColor: '#70caa9',
    languageNeutral: '#b8c9ca',
    heroMarkMode: 'emblem',
    heroMarkWidth: 448,
    heroMarkAnchorX: 0.545,
    heroMarkAnchorY: 0.5,
    heroMarkOpacity: 0.66,
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    cleanZoneStrength: 0.33
  },
  hanzo: {
    ...heroEmblem('penitent-bow', {
      color: '#6aa3aa', neutral: '#80bfd2', width: 440, anchorX: 0.386, opacity: 0.7, x: 0.74,
      cropWidth: 0.52, cropHeight: 0.72, emblemSize: 230, finish: 'etched'
    })
  },
  mei: {
    ...heroEmblem('cryo-thaw', {
      color: '#77b9d8', neutral: '#d8f1fb', width: 466, anchorX: 0.7, anchorY: 0.54, opacity: 0.74, x: 0.73, y: 0.4,
      cropWidth: 0.52, cropHeight: 0.66, emblemSize: 228, finish: 'etched'
    })
  },
  reaper: {
    ...heroEmblem('blackwatch-dissolve', {
      color: '#8c99a6', neutral: '#a72e3f', width: 466, anchorX: 0.483, anchorY: 0.508, opacity: 0.74,
      cropWidth: 0.58, cropHeight: 0.72, emblemSize: 232, finish: 'etched'
    }),
    signature: 'blackwatch-wraith',
    signatureStrength: 1.18,
    signatureX: -0.04,
    storyX: -0.04,
    motifStrength: 1.72,
    rimStrength: 0.34,
    rimPrimary: '#a72e3f',
    rimSecondary: '#c8d2dc',
    subjectBrightness: 1.12,
    subjectSaturation: 0.62,
    subjectContrast: 1.24,
    subjectSepia: 0,
    ghostScale: 0.94
  },
  sombra: {
    ...heroEmblem('conspiracy-negative', {
      color: '#a85ac7', neutral: '#55d4d8', width: 442, anchorX: 0.611, opacity: 0.76, x: 0.75,
      cropWidth: 0.54, cropHeight: 0.7, emblemSize: 234, finish: 'etched'
    }),
    signature: 'conspiracy-void',
    signatureStrength: 1.16,
    signatureX: -0.11,
    storyX: -0.11,
    motifStrength: 1.62,
    rimStrength: 0.3,
    rimPrimary: '#b85bd5',
    rimSecondary: '#55d4d8',
    subjectBrightness: 1.05,
    subjectSaturation: 0.9,
    subjectContrast: 1.18,
    subjectSepia: 0,
    ghostScale: 0.94
  },
  shion: {
    ...heroEmblem('redaction-ascent', {
      color: '#d44d5c', neutral: '#d8d9df', width: 452, anchorX: 0.58, anchorY: 0.458, opacity: 0.74, x: 0.75, y: 0.38,
      cropWidth: 0.62, cropHeight: 0.72, emblemSize: 236, finish: 'etched'
    }),
    signature: 'redacted-wraith',
    signatureStrength: 1.18,
    signatureX: -0.08,
    storyX: -0.08,
    motifStrength: 1.68,
    rimStrength: 0.3,
    rimPrimary: '#d44d5c',
    rimSecondary: '#e1e4ea',
    subjectBrightness: 1.08,
    subjectSaturation: 0.62,
    subjectContrast: 1.22,
    subjectSepia: 0,
    ghostScale: 0.94
  },
  emre: {
    ...heroEmblem('broken-override', {
      color: '#6f9dbd', neutral: '#df525a', width: 450, anchorX: 0.683, anchorY: 0.527, opacity: 0.65, x: 0.75, y: 0.39
    }),
    signature: 'breach-scan',
    signatureStrength: 1.05
  },
  widowmaker: {
    languageField: 'lock',
    languageFieldEdition: 'poster',
    languageFieldStrength: 1,
    languageFieldX: 0.74,
    languageFieldY: 0.4,
    languageStartY: 0.54,
    languageColor: '#c33d5a',
    genericStrength: 0.008,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.03,
    signatureLayerStrength: 0,
    motifStrength: 1.66,
    rimStrength: 0.32,
    rimPrimary: '#a72e46',
    rimSecondary: '#d8e4ee',
    subjectBrightness: 1.08,
    subjectSaturation: 0.72,
    subjectContrast: 1.2,
    subjectSepia: 0,
    ghostScale: 0.94,
    heroMarkMode: 'emblem',
    heroMarkAnchorX: 0.5,
    heroMarkAnchorY: 0.58,
    heroMarkCropWidth: 1,
    heroMarkCropHeight: 1,
    heroMarkOpacity: 0.72,
    heroEmblemSize: 238,
    cleanZoneStrength: 0.34
  },
  symmetra: {
    languageField: 'lattice',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.94,
    languageFieldX: 0.78,
    languageFieldY: 0.37,
    languageStartY: 0.52,
    languageColor: '#62a6c5',
    languageNeutral: '#d8bd70',
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkWidth: 460,
    heroMarkAnchorX: 0.65,
    heroMarkAnchorY: 0.5,
    heroMarkCropWidth: 0.56,
    heroMarkCropHeight: 0.72,
    heroMarkOpacity: 0.72,
    heroEmblemSize: 236,
    heroMarkFinish: 'etched',
    cleanZoneStrength: 0.33
  },
  tracer: {
    languageField: 'jump-cut',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.94,
    languageFieldX: 0.76,
    languageFieldY: 0.38,
    languageStartY: 0.55,
    languageColor: '#58d7ef',
    languageNeutral: '#e29a3c',
    genericStrength: 0.018,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.04,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkWidth: 442,
    heroMarkAnchorX: 0.597,
    heroMarkAnchorY: 0.504,
    heroMarkOpacity: 0.66,
    cleanZoneStrength: 0.32
  },
  ana: {
    languageField: 'vigil-sightline',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.92,
    languageFieldX: 0.73,
    languageFieldY: 0.39,
    languageColor: '#52788f',
    languageNeutral: '#a8cad8',
    heroMarkMode: 'emblem',
    heroMarkWidth: 442,
    heroMarkAnchorX: 0.644,
    heroMarkAnchorY: 0.5,
    heroMarkOpacity: 0.72,
    heroMarkCropWidth: 0.62,
    heroMarkCropHeight: 0.8,
    heroEmblemSize: 238,
    heroMarkFinish: 'etched',
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    cleanZoneStrength: 0.33,
    rimStrength: 0.25,
    subjectBrightness: 1.12,
    copyBlendX: 450
  },
  kiriko: {
    languageField: 'fold',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.94,
    languageFieldX: 0.75,
    languageFieldY: 0.39,
    languageStartY: 0.57,
    languageColor: '#d56f68',
    languageNeutral: '#ead9cc',
    genericStrength: 0.01,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkWidth: 452,
    heroMarkAnchorX: 0.644,
    heroMarkAnchorY: 0.5,
    heroMarkOpacity: 0.78,
    heroMarkCropWidth: 0.46,
    heroMarkCropHeight: 0.62,
    heroEmblemSize: 248,
    heroMarkFinish: 'etched',
    ambientLineStyle: 'fold',
    ambientLineStrength: 0.82,
    ambientLineNeutral: '#ead9cc',
    ambientLineY: 0.57,
    lineLayer: 'ambient',
    cleanZoneStrength: 0.33
  },
  baptiste: {
    ...heroEmblem('second-chance-field', {
      color: '#d28a4b', neutral: '#62d0d7', width: 466, anchorX: 0.72, anchorY: 0.542, opacity: 0.78, x: 0.74, y: 0.4,
      cropWidth: 0.56, cropHeight: 0.68, emblemSize: 236, finish: 'etched'
    }),
    signature: 'field',
    signatureStrength: 1.06
  },
  freja: {
    ...heroEmblem('northwind-lock', {
      color: '#87a7c2', neutral: '#c5e1ed', width: 450, anchorX: 0.703, anchorY: 0.458, opacity: 0.74, x: 0.75, y: 0.38,
      cropWidth: 0.48, cropHeight: 0.64, emblemSize: 232
    }),
    copyBlendX: 455
  },
  pharah: {
    ...heroEmblem('legacy-launch', {
      color: '#6689c5', neutral: '#e1bd68', width: 448, anchorX: 0.697, anchorY: 0.442, opacity: 0.64, x: 0.75, y: 0.38
    }),
    copyBlendX: 470
  },
  'soldier-76': {
    ...heroEmblem('classified-vigil', {
      color: '#758aa2', neutral: '#d75555', width: 462, anchorX: 0.586, anchorY: 0.512, opacity: 0.76, x: 0.75,
      cropWidth: 0.52, cropHeight: 0.64, emblemSize: 236, finish: 'etched'
    }),
    copyBlendX: 465
  },
  brigitte: {
    ...heroEmblem('rally-standard', {
      color: '#c58a5c', neutral: '#dfb762', width: 468, anchorX: 0.678, anchorY: 0.44, opacity: 0.7, x: 0.75, y: 0.38
    }),
    copyBlendX: 480
  },
  mercy: {
    languageField: 'ascension',
    languageFieldEdition: 'poster',
    languageFieldStrength: 0.92,
    languageFieldX: 0.74,
    languageFieldY: 0.39,
    languageColor: '#e7cf83',
    languageNeutral: '#9bc7d7',
    heroMarkMode: 'emblem',
    heroMarkWidth: 430,
    heroMarkAnchorX: 0.511,
    heroMarkAnchorY: 0.51,
    heroMarkOpacity: 0.63,
    genericStrength: 0.012,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    cleanZoneStrength: 0.33
  },
  lifeweaver: {
    languageField: 'bloom-lattice',
    languageFieldEdition: 'poster',
    languageFieldStrength: 1,
    languageFieldX: 0.76,
    languageFieldY: 0.38,
    languageStartY: 0.56,
    languageColor: '#d987ad',
    genericStrength: 0.01,
    storyStrength: 0,
    storyTextureStrength: 0,
    storyEmblemStrength: 0,
    identityStrength: 0.035,
    signatureLayerStrength: 0,
    heroMarkMode: 'emblem',
    heroMarkAnchorX: 0.575,
    heroMarkAnchorY: 0.63,
    heroMarkCropWidth: 0.56,
    heroMarkCropHeight: 0.72,
    heroMarkOpacity: 0.7,
    heroEmblemSize: 224,
    cleanZoneStrength: 0.33,
    signature: 'petal-lattice',
    signatureStrength: 1.04
  },
  mizuki: {
    ...heroEmblem('fate-unbound', {
      color: '#6eb4b9', neutral: '#dd5b72', width: 450, anchorX: 0.58, anchorY: 0.52, opacity: 0.74, x: 0.755, y: 0.39,
      cropWidth: 0.72, cropHeight: 0.74, emblemSize: 238, finish: 'etched'
    }),
    signature: 'afterimage',
    signatureStrength: 1.02
  },
  moira: {
    ...heroEmblem('biotic-schism', {
      color: '#a468c5', neutral: '#e08a42', width: 450, anchorX: 0.56, anchorY: 0.5, opacity: 0.8, x: 0.75, y: 0.39,
      cropWidth: 0.82, cropHeight: 0.8, emblemSize: 246, finish: 'etched'
    }),
    signature: 'biotic-schism',
    signatureStrength: 1.2,
    signatureX: -0.08,
    storyX: -0.08,
    motifStrength: 1.68,
    rimStrength: 0.32,
    rimPrimary: '#e08a42',
    rimSecondary: '#bd70d2',
    subjectBrightness: 1.07,
    subjectSaturation: 0.86,
    subjectContrast: 1.2,
    subjectSepia: 0,
    ghostScale: 0.94
  },
  wuyang: {
    ...heroEmblem('return-current', {
      color: '#5faabd', neutral: '#bce4e8', width: 508, anchorX: 0.692, anchorY: 0.55, opacity: 0.74, x: 0.75, y: 0.4
    }),
    signature: 'return-current',
    signatureStrength: 1.02
  },
  zenyatta: {
    ...heroEmblem('open-iris', {
      color: '#d6aa53', neutral: '#dfc36b', width: 446, anchorX: 0.58, anchorY: 0.5, opacity: 0.72, x: 0.75, y: 0.39,
      cropWidth: 0.72, cropHeight: 0.74, emblemSize: 238, finish: 'etched'
    }),
    signature: 'mandala',
    signatureStrength: 1.06
  },
  'jetpack-cat': {
    ...heroEmblem('fika-landing', {
      color: '#70b8d4', neutral: '#74d9eb', width: 466, anchorX: 0.761, anchorY: 0.581, opacity: 0.7, x: 0.76, y: 0.4
    }),
    centerX: 0.38,
    centerY: 0.44,
    motifStrength: 1.66,
    rimStrength: 0.22,
    ghostScale: 0.84
  },
  lucio: {
    ...heroEmblem('rio-resonance', {
      color: '#64c87a', neutral: '#70df88', width: 466, anchorX: 0.6, anchorY: 0.5, opacity: 0.7, x: 0.75, y: 0.39
    }),
    ambientLineStyle: 'soundwave',
    ambientLineStrength: 0.94,
    ambientLineNeutral: '#d5b943',
    ambientLineY: 0.48,
    lineLayer: 'ambient',
    centerX: 0.38,
    centerY: 0.48,
    motifStrength: 1.64,
    rimStrength: 0.24,
    ghostScale: 0.94
  }
}

const ROLE_FALLBACKS = {
  tank: { id: 'tank-archive', type: 'fortress', label: 'FORTRESS / PRESSURE', secondary: '#8fa7b7', composition: 'monument' },
  damage: { id: 'damage-archive', type: 'trajectory', label: 'TRAJECTORY / IMPACT', secondary: '#b97055', composition: 'kinetic' },
  support: { id: 'support-archive', type: 'halo', label: 'HALO / RESPONSE', secondary: '#7bb9a6', composition: 'ritual' }
}

const KIND_FALLBACKS = {
  caster: { id: 'select-hero', type: 'archive', label: 'SELECT / HERO', secondary: '#a79b75', composition: 'ritual' },
  staff: { id: 'select-hero', type: 'archive', label: 'SELECT / HERO', secondary: '#a79b75', composition: 'ritual' },
  manager: { id: 'select-hero', type: 'archive', label: 'SELECT / HERO', secondary: '#a79b75', composition: 'ritual' },
  coach: { id: 'select-hero', type: 'archive', label: 'SELECT / HERO', secondary: '#a79b75', composition: 'ritual' },
  managerCoach: { id: 'select-hero', type: 'archive', label: 'SELECT / HERO', secondary: '#a79b75', composition: 'ritual' },
  team: { id: 'select-hero', type: 'archive', label: 'SELECT / HERO', secondary: '#a79b75', composition: 'ritual' },
  tournament: { id: 'select-hero', type: 'archive', label: 'SELECT / HERO', secondary: '#a79b75', composition: 'ritual' },
  archive: { id: 'archive-cut', type: 'archive', label: 'ARCHIVE / MEMORY', secondary: '#a79b75', composition: 'ritual' }
}

const HERO_DRIVEN_EDITION = Object.freeze({
  rail: "DIRECTOR'S CUT / ONE HERO / ONE ARCHIVE",
  header: "FRIES CUP PICTURES / DIRECTOR'S CUT",
  stub: "DIRECTOR'S CUT",
  stubLine: 'HERO EDITION / ADMIT ONE',
  note: "DIRECTOR'S NOTE / SEASON LOGLINE"
})

export const DIRECTOR_CUT_EDITIONS = Object.freeze({
  player: HERO_DRIVEN_EDITION,
  caster: HERO_DRIVEN_EDITION,
  staff: HERO_DRIVEN_EDITION,
  manager: HERO_DRIVEN_EDITION,
  coach: HERO_DRIVEN_EDITION,
  managerCoach: HERO_DRIVEN_EDITION,
  team: HERO_DRIVEN_EDITION,
  tournament: HERO_DRIVEN_EDITION
})

const HERO_CATALOG = (() => {
  const seen = new Set()
  return [...OW_HEROES, ...ARCHIVE_HEROES]
    .filter(hero => {
      const id = String(hero.id || hero.assetKey || '').trim()
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((hero, index) => {
      const recipe = HERO_RECIPES[hero.id] || [ROLE_FALLBACKS[hero.role]?.type || 'archive', `${hero.en.toLocaleUpperCase('en-US')} / ARCHIVE`, '#a79b75', 'ritual']
      const [type, label, secondary, composition] = recipe
      const compositionProfile = COMPOSITIONS[composition] || COMPOSITIONS.ritual
      const story = getDirectorCutStorySignature(hero.id)
      const lineDirection = getDirectorCutLineDirection(hero.id)
      const ambientField = getDirectorCutAmbientField(hero.id)
      const calibrationTuple = HERO_STAGE_CALIBRATIONS[hero.id]
      const stageCalibration = calibrationTuple
        ? {
            subjectScale: calibrationTuple[0],
            subjectX: calibrationTuple[1],
            subjectY: calibrationTuple[2],
            subjectFraming: 'source-frame',
            stageReview: DIRECTOR_CUT_STAGE_AUDIT_VERSION
          }
        : {}
      const finishTuple = HERO_POSTER_FINISHES[hero.id]
      const posterFinish = finishTuple
        ? {
            motifStrength: finishTuple[0],
            rimStrength: finishTuple[1],
            rimPrimary: story?.highlight || secondary,
            rimSecondary: secondary,
            subjectBrightness: finishTuple[2],
            subjectSaturation: finishTuple[3],
            subjectContrast: finishTuple[4],
            subjectSepia: finishTuple[5],
            ghostScale: finishTuple[6]
          }
        : {}
      const stageOverride = HERO_STAGE_OVERRIDES[hero.id] || {}
      const backgroundTuple = HERO_BACKGROUND_FINISHES[hero.id]
      const backgroundFinish = backgroundTuple
        ? {
            genericStrength: backgroundTuple[0],
            storyStrength: backgroundTuple[1],
            storyTextureStrength: backgroundTuple[2],
            storyEmblemStrength: backgroundTuple[3],
            identityStrength: backgroundTuple[4],
            ghostStrength: backgroundTuple[5],
            signatureLayerStrength: backgroundTuple[6]
          }
        : {}
      const cutLabel = `${String(label).split('/')[0].trim()} CUT`
      return Object.freeze({
        ...hero,
        render: getHeroRenderImage(hero.en, hero.role),
        profile: Object.freeze({
          id: hero.id,
          heroId: hero.id,
          type,
          label,
          secondary,
          composition,
          code: `DC-${String(index + 1).padStart(2, '0')}`,
          variant: index,
          density: 0.86 + ((index % 5) * 0.075),
          centerX: 0.38 + ((index % 4) * 0.042),
          centerY: 0.44 + (((index + 2) % 5) * 0.026),
          rotation: ((index % 7) - 3) * 0.035,
          cutLabel,
          story,
          lineDirection,
          motifStrength: 1.34 + ((index % 4) * 0.075),
          rimStrength: 0.18 + ((index % 3) * 0.02),
          ghostScale: 0.9 + ((index % 3) * 0.045),
          ...compositionProfile,
          ...stageCalibration,
          ...posterFinish,
          ...backgroundFinish,
          ...stageOverride,
          ...HERO_PORTRAIT_BOUNDARIES[hero.id],
          // Emblem bounds and placement never depend on a line's origin/focus.
          ...getDirectorCutEmblemFrame(hero.id),
          lineLayer: 'ambient',
          ambientLineStyle: ambientField?.style,
          ambientLineStrength: ambientField?.strength ?? 0.9,
          ambientField
        })
      })
    })
})()

const HERO_BY_ID = new Map(HERO_CATALOG.map(hero => [hero.id, hero]))
const HERO_BY_LOOKUP = new Map()

HERO_CATALOG.forEach(hero => {
  [hero.id, hero.assetKey, hero.en, hero.zh, ...(hero.aliases || [])].filter(Boolean).forEach(value => {
    HERO_BY_LOOKUP.set(normalizeOwLookupKey(value), hero)
  })
})

function normalizeRole(value) {
  const role = String(value || '').toLocaleUpperCase('en-US')
  if (/TANK|重装|坦克|돌격/.test(role)) return 'tank'
  if (/SUPPORT|SUP|支援|辅助|지원/.test(role)) return 'support'
  if (/DAMAGE|DPS|输出|공격/.test(role)) return 'damage'
  return ''
}

function completeFallback(profile, kind = 'archive') {
  const composition = profile.composition || 'ritual'
  return {
    variant: 0,
    density: 1,
    centerX: 0.46,
    centerY: 0.5,
    rotation: 0,
    code: 'DC-00',
    cutLabel: 'ARCHIVE CUT',
    motifStrength: 1.35,
    rimStrength: 0.18,
    ghostScale: 1,
    heroId: '',
    ...COMPOSITIONS[composition],
    ...profile,
    kind
  }
}

export const DIRECTOR_CUT_HERO_CATALOG = HERO_CATALOG

export function resolveDirectorCutHero(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  const canonical = getOwHero(raw)
  if (canonical && HERO_BY_ID.has(canonical.id)) return HERO_BY_ID.get(canonical.id)

  const slug = heroNameToSlug(raw).replace(/_/g, '-')
  return HERO_BY_ID.get(slug) || HERO_BY_LOOKUP.get(normalizeOwLookupKey(raw)) || null
}

export function getDirectorCutProfile(heroName = '', role = '', kind = 'archive') {
  const hero = resolveDirectorCutHero(heroName)
  if (hero) return { ...hero.profile, hero }

  const kindProfile = KIND_FALLBACKS[kind]
  if (kindProfile) return completeFallback(kindProfile, kind)

  const roleProfile = ROLE_FALLBACKS[normalizeRole(role)]
  return completeFallback(roleProfile || KIND_FALLBACKS.archive, kind)
}

export function getDirectorCutEdition(kind = 'player') {
  return DIRECTOR_CUT_EDITIONS[kind] || DIRECTOR_CUT_EDITIONS.player
}

export function getDirectorCutHeroOptions(locale = 'zh-CN') {
  return HERO_CATALOG.map(hero => {
    const localized = formatOwHeroName(hero.en, locale) || hero.zh || hero.en
    return {
      id: hero.id,
      role: hero.role,
      name: localized,
      en: hero.en,
      label: localized === hero.en ? hero.en : `${localized} · ${hero.en}`,
      render: hero.render,
      profile: hero.profile
    }
  })
}

export function getDirectorCutSeasonHeroIds(payload) {
  const ticket = payload?.playerTicket || {}
  const seen = new Set()
  return (Array.isArray(ticket.heroes) ? ticket.heroes : [])
    .map(item => resolveDirectorCutHero(item?.title))
    .filter(Boolean)
    .map(hero => hero.id)
    .filter(id => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
}

export function getDirectorCutSelection(payload, choice = 'auto', locale = 'zh-CN') {
  const ticket = payload?.playerTicket || payload?.identityTicket || {}
  const manual = choice && choice !== 'auto'
  const signatureHero = resolveDirectorCutHero(ticket.topHero) || resolveDirectorCutHero(ticket.heroes?.[0]?.title)
  const hero = manual ? resolveDirectorCutHero(choice) : payload?.cardKind === 'player' ? signatureHero : null
  const profile = getDirectorCutProfile(hero?.id || '', ticket.role, payload?.cardKind)
  const source = hero ? (manual ? 'manual' : 'signature') : 'unselected'
  const displayName = hero ? (formatOwHeroName(hero.en, locale) || hero.zh || hero.en) : ''

  return {
    choice: hero ? (manual ? hero.id : 'auto') : '',
    ready: Boolean(hero?.render),
    source,
    subjectMode: 'hero',
    hero,
    heroId: hero?.id || '',
    heroName: displayName,
    heroNameEn: hero?.en || '',
    heroRender: hero?.render || '',
    profile,
    choiceLabel: source === 'manual'
      ? "DIRECTOR'S CHOICE"
      : source === 'signature'
        ? 'SIGNATURE HERO'
        : 'SELECT HERO'
  }
}

export function applyDirectorCutSelection(payload, selection) {
  if (!payload || !selection) return payload

  const isHeroSubject = selection.subjectMode === 'hero' && selection.hero && selection.heroRender
  const ticketKey = payload.playerTicket ? 'playerTicket' : payload.identityTicket ? 'identityTicket' : ''
  const nextTicket = ticketKey
    ? {
        ...payload[ticketKey],
        ...(isHeroSubject && payload.cardKind === 'player' ? {
          topHero: selection.heroName,
          heroRender: selection.heroRender
        } : {})
      }
    : null

  return {
    ...payload,
    ...(ticketKey ? { [ticketKey]: nextTicket } : {}),
    heroRender: isHeroSubject ? selection.heroRender : '',
    directorCut: {
      choice: selection.choice,
      source: selection.source,
      subjectMode: selection.subjectMode,
      heroId: selection.heroId,
      heroName: selection.heroName,
      heroNameEn: selection.heroNameEn,
      heroRender: selection.heroRender,
      choiceLabel: selection.choiceLabel,
      profile: selection.profile
    }
  }
}

export function getDirectorCutHeroAsset(hero) {
  const resolved = typeof hero === 'string' ? resolveDirectorCutHero(hero) : hero
  if (!resolved) return ''
  const folder = normalizeHeroFolder(resolved.role, resolved.en)
  const slug = heroNameToSlug(resolved.en).replace(/_/g, '-')
  return `/review/hero-renders/${folder}/${slug}.png`
}
