// Curated source-space bounds (all hero marks use a 360 × 260 viewBox).
// Bounds include breathing room around the whole glyph, not a former route node.
const frame = (left, top, width, height, size = 222) => Object.freeze({
  heroMarkIsolated: true,
  heroMarkAnchorX: (left + width / 2) / 360,
  heroMarkAnchorY: (top + height / 2) / 260,
  heroMarkCropWidth: width / 360,
  heroMarkCropHeight: height / 260,
  heroEmblemSize: size,
  heroEmblemX: 0.86,
  heroEmblemY: 0.35
})

export const DIRECTOR_CUT_EMBLEM_FRAMES = Object.freeze({
  domina: frame(99, 35, 161, 189, 212),
  dmon: frame(95, 56, 170, 145, 216),
  doomfist: frame(83, 45, 177, 181, 212),
  dva: frame(173, 72, 113, 119, 206),
  hazard: frame(124, 30, 173, 187, 210),
  'junker-queen': frame(206, 26, 125, 106, 216),
  mauga: frame(90, 32, 198, 186, 232),
  orisa: frame(72, 32, 240, 199, 236),
  ramattra: frame(112, 53, 136, 178, 210),
  reinhardt: frame(74, 19, 214, 222, 218),
  roadhog: frame(95, 13, 144, 203, 208),
  sigma: frame(90, 50, 175, 167, 224),
  winston: frame(140, 60, 141, 68, 224),
  'wrecking-ball': frame(87, 37, 186, 186, 216),
  zarya: frame(104, 31, 163, 203, 208),
  anran: frame(129, 60, 146, 138, 218),
  ashe: frame(44, 68, 294, 121, 248),
  bastion: frame(111, 71, 137, 115, 216),
  cassidy: frame(161, 62, 138, 136, 210),
  echo: frame(110, 35, 176, 176, 218),
  emre: frame(129, 49, 190, 138, 224),
  freja: frame(90, 34, 188, 169, 228),
  genji: frame(90, 26, 184, 174, 218),
  hanzo: frame(77, 22, 168, 218, 220),
  junkrat: frame(207, 24, 151, 160, 212),
  mei: frame(207, 82, 105, 90, 206),
  pharah: frame(195, 35, 107, 172, 202),
  reaper: frame(128, 62, 96, 119, 198),
  sojourn: Object.freeze({
    ...frame(96, 45, 210, 152, 230),
    heroEmblemX: 0.88,
    heroEmblemY: 0.36
  }),
  'soldier-76': frame(73, 74, 216, 90, 232),
  sierra: frame(92, 50, 186, 160, 230),
  shion: frame(133, 60, 159, 143, 216),
  sombra: frame(174, 75, 110, 112, 214),
  symmetra: frame(80, 36, 200, 202, 218),
  torbjorn: frame(218, 88, 138, 123, 230),
  tracer: frame(178, 91, 77, 80, 190),
  vendetta: frame(107, 25, 192, 205, 222),
  venture: frame(131, 84, 169, 92, 226),
  widowmaker: frame(16, 16, 328, 227, 248),
  ana: frame(84, 72, 200, 143, 226),
  baptiste: frame(191, 77, 135, 114, 218),
  brigitte: frame(90, 43, 184, 166, 222),
  illari: frame(82, 32, 196, 196, 212),
  'jetpack-cat': frame(116, 64, 124, 118, 208),
  juno: frame(89, 25, 183, 196, 212),
  kiriko: Object.freeze({ ...frame(69, 53, 222, 171, 224), heroEmblemX: 0.85 }),
  lifeweaver: frame(78, 37, 204, 158, 230),
  lucio: Object.freeze({ heroEmblemX: 0.86, heroEmblemY: 0.36 }),
  mercy: frame(56, 26, 248, 191, 238),
  mizuki: frame(78, 69, 217, 111, 234),
  moira: frame(172, 86, 88, 88, 194),
  wuyang: frame(68, 60, 210, 141, 228),
  zenyatta: frame(89, 31, 183, 190, 214)
})

export function getDirectorCutEmblemFrame(heroId) {
  return DIRECTOR_CUT_EMBLEM_FRAMES[heroId] || null
}
