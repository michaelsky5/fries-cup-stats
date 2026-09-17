const STORY_ROWS = {
  domina: ['domina-panopticon', 'Vishkar heiress, corporate image, custom hard-light', 'corporate-diamond', 'panopticon', -0.05, '#e7c55f'],
  doomfist: ['doomfist-evolution', 'Talon strategist, conflict as evolution, the Doomfist gauntlet', 'gauntlet-evolution', 'impact', -0.12, '#ef9f45'],
  dva: ['dva-gwishin-stream', 'Esports champion, MEKA pilot, defender against the Gwishin', 'arcade-star', 'hud', 0.06, '#55cfe8'],
  dmon: ['dmon-meka-command', 'MEKA squad leader, tactical anchor, Beast mech', 'command-shield', 'formation', -0.04, '#f0a24d'],
  hazard: ['hazard-phreak-vanadium', 'Phreak found family, bodily autonomy, stolen vanadium', 'crystal-spike', 'fracture', 0.12, '#bb62e8'],
  'junker-queen': ['junker-queen-arena-crown', 'Junkertown exile turned ruler and arena champion', 'junker-crown', 'scrap', -0.09, '#e5b34e'],
  mauga: ['mauga-two-hearts', 'Samoan Deepsea Raider, two hearts, Talon chaos', 'twin-heart', 'organic', 0.08, '#f2a049'],
  orisa: ['orisa-numbani-guardian', 'Efi Oladele creation and guardian of Numbani', 'guardian-spear', 'civic', -0.03, '#e5c65f'],
  ramattra: ['ramattra-shambali-null', 'Ravager, former Shambali monk, founder of Null Sector', 'ravager-mask', 'ritual', 0.04, '#d5a45d'],
  reinhardt: ['reinhardt-crusader-vow', 'Crusader, knightly vow, shield and rocket hammer', 'crusader-crest', 'heraldic', -0.08, '#efc45c'],
  roadhog: ['roadhog-outback-chain', 'Irradiated Outback survivor, respirator and chain hook', 'respirator-chain', 'wasteland', 0.08, '#d4b76d'],
  sigma: ['sigma-gravity-score', 'Astrophysicist fractured by a gravity experiment and music', 'gravity-score', 'orbit', -0.07, '#9bc6ef'],
  winston: ['winston-lunar-recall', 'Horizon Lunar Colony scientist and author of the Recall', 'lunar-glasses', 'lunar', 0.03, '#e7b053'],
  'wrecking-ball': ['wrecking-ball-arena-escape', 'Lunar-colony escapee and Junkertown mech champion', 'hamster-wheel', 'arena', -0.08, '#e7a34b'],
  zarya: ['zarya-volskaya-strength', 'Champion weightlifter and defender of Russia', 'barbell-star', 'volskaya', 0.02, '#79cfe3'],

  anran: ['anran-zhuque-discipline', 'Wuxing Fire College prodigy, wushu and classical dance', 'zhuque-fan', 'silk', -0.08, '#f2b34f'],
  ashe: ['ashe-deadlock-heiress', 'Rebellious heiress and leader of the Deadlock Gang', 'deadlock-rose', 'outlaw', 0.08, '#d6a05e'],
  bastion: ['bastion-ganymede-awakening', 'E54 war machine awakened to nature by Ganymede', 'bird-branch', 'forest', -0.03, '#e0bd64'],
  cassidy: ['cassidy-high-noon-redemption', 'Deadlock gunslinger, Blackwatch past, chosen redemption', 'spur-sun', 'film', -0.08, '#e7b44e'],
  echo: ['echo-liao-adaptation', 'Mina Liao adaptive AI carrying her creator\'s promise', 'adaptive-echo', 'adaptive', 0.04, '#d5f3ff'],
  emre: ['emre-broken-override', 'Overwatch prodigy fighting a malignant cybernetic override', 'broken-protocol', 'corrupted', -0.04, '#df525a'],
  freja: ['freja-rescue-to-bounty', 'Search-and-rescue tracker turned obsessive bounty hunter', 'bounty-crossbow', 'tracker', -0.08, '#c5e1ed'],
  genji: ['genji-cyber-dragon', 'Shimada heir rebuilt as a cyborg and guided by Zenyatta', 'cyber-dragon', 'shimada', 0.06, '#91df72'],
  hanzo: ['hanzo-penitent-dragons', 'Shimada heir wandering in penance after betraying Genji', 'penitent-bow', 'penance', -0.08, '#80bfd2'],
  junkrat: ['junkrat-irradiated-secret', 'Irradiated scavenger carrying a secret from the Outback', 'fuse-bomb', 'radiation', 0.11, '#e5d24a'],
  mei: ['mei-antarctic-beacon', 'Ecopoint climatologist and sole cryostasis survivor', 'cryo-beacon', 'research', -0.03, '#d8f1fb'],
  pharah: ['pharah-raptora-legacy', 'Helix captain pursuing the Overwatch legacy of her mother', 'raptora-wing', 'helix', -0.05, '#e1bd68'],
  reaper: ['reaper-blackwatch-wraith', 'Gabriel Reyes, Blackwatch commander remade as a wraith', 'wraith-skull', 'blackwatch', 0.08, '#a72e3f'],
  sojourn: ['sojourn-cybernetic-captain', 'Canadian captain whose cybernetics enabled survival and strategy', 'rail-map', 'tactical', -0.05, '#72d0e5'],
  'soldier-76': ['soldier-76-fallen-commander', 'Enhanced soldier, former commander, masked vigilante', 'vigil-chevron', 'classified', -0.05, '#d75555'],
  sierra: ['sierra-naughton-summit', 'Helix summit leader tracing her mother, Soldier: 00', 'summit-drone', 'terrain', 0.04, '#d5a667'],
  shion: ['shion-hashimoto-ascent', 'Captive omnic who seized the Hashimoto and remade herself', 'hashimoto-mask', 'neon', 0.09, '#d44d5c'],
  sombra: ['sombra-dorado-conspiracy', 'Dorado orphan and hacker pursuing the eye of a global conspiracy', 'conspiracy-eye', 'code', -0.04, '#55d4d8'],
  symmetra: ['symmetra-utopaea-order', 'Vishkar architech balancing hard-light order and conscience', 'utopia-prism', 'hardlight', -0.04, '#d8bd70'],
  torbjorn: ['torbjorn-ironclad-forge', 'Ironclad engineer confronting the legacy of his machines', 'forge-anvil', 'forge', -0.05, '#e4a156'],
  tracer: ['tracer-chronal-anchor', 'Pilot untethered from time and anchored by Winston', 'chronal-hourglass', 'chronal', 0.04, '#58d7ef'],
  vendetta: ['vendetta-wolf-throne', 'Talon heiress and Colosseo champion reclaiming her throne', 'wolf-gladius', 'colosseo', -0.07, '#d75a61'],
  venture: ['venture-wayfinder-history', 'Wayfinder archaeologist drilling toward forgotten history', 'wayfinder-drill', 'strata', 0.08, '#d7a45d'],
  widowmaker: ['widowmaker-talon-spider', 'Amelie Lacroix remade by Talon into a patient assassin', 'talon-spider', 'talon', -0.04, '#a72e46'],

  ana: ['ana-amari-vigil', 'Overwatch founder, mother and one-eyed protector of Cairo', 'amari-eye', 'cairo', -0.06, '#d2b06a'],
  baptiste: ['baptiste-second-chance', 'Caribbean Coalition medic who deserted Talon to save lives', 'deserter-lamp', 'caribbean', 0.05, '#62d0d7'],
  brigitte: ['brigitte-squire-armorer', 'Armorer and squire who chose to fight beside Reinhardt', 'squire-shield', 'armor', -0.04, '#dfb762'],
  illari: ['illari-last-inti', 'Last Inti Warrior carrying the guilt of a solar catastrophe', 'fractured-sun', 'inti', 0.02, '#f6df6a'],
  'jetpack-cat': ['jetpack-cat-fika-flight', 'Fika, Gibraltar stray and Brigitte workshop assistant', 'paw-propeller', 'workshop', 0.07, '#74d9eb'],
  juno: ['juno-mars-lifeline', 'Martian colonist seeking a lifeline for the Red Promise', 'mars-orbit', 'mars', -0.03, '#e56d67'],
  kiriko: ['kiriko-yokai-protector', 'Kanezaka shrine protector between tradition and the Yokai', 'yokai-torii', 'shrine', -0.05, '#ed6e67'],
  lifeweaver: ['lifeweaver-biolight-fugitive', 'Vishkar prodigy and fugitive creator of biolight', 'biolight-lotus', 'botanical', 0.04, '#8ce0cf'],
  lucio: ['lucio-rio-liberation', 'Rio DJ who reclaimed Vishkar sonic technology for his community', 'rio-equalizer', 'sound', -0.04, '#70df88'],
  mercy: ['mercy-valkyrie-peace', 'War orphan, nanobiologist and reluctant Valkyrie medic', 'valkyrie-caduceus', 'medical', 0.03, '#d9ebf7'],
  mizuki: ['mizuki-fate-unbound', 'Hashimoto debtor and infiltrator choosing redemption over a curse', 'fate-kusarigama', 'curse', 0.08, '#dd5b72'],
  moira: ['moira-oasis-duality', 'Unethical geneticist joining Blackwatch, Talon and Oasis', 'biotic-duality', 'genetics', -0.04, '#e08a42'],
  wuyang: ['wuyang-water-path', 'Wuxing Water College student forging a path beyond family expectations', 'water-staff', 'wuxing', 0.05, '#bce4e8'],
  zenyatta: ['zenyatta-iris-wanderer', 'Wandering Shambali monk guiding others toward the Iris', 'iris-orbs', 'shambali', -0.03, '#dfc36b']
}

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0))

function colorToRgba(color, alpha) {
  const raw = String(color || '#f4c629').trim()
  const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return raw
  const hex = match[1].length === 3
    ? match[1].split('').map(char => `${char}${char}`).join('')
    : match[1]
  const value = Number.parseInt(hex, 16)
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${clamp01(alpha)})`
}

function path(ctx, points, close = false) {
  ctx.beginPath()
  points.forEach(([pointX, pointY], index) => {
    if (index === 0) ctx.moveTo(pointX, pointY)
    else ctx.lineTo(pointX, pointY)
  })
  if (close) ctx.closePath()
}

function polygon(ctx, radius, sides, rotation = 0) {
  const points = []
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (Math.PI * 2 * index) / sides
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius])
  }
  path(ctx, points, true)
}

function star(ctx, outer = 0.78, inner = 0.34, points = 5, rotation = -Math.PI / 2) {
  const vertices = []
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = rotation + (Math.PI * index) / points
    vertices.push([Math.cos(angle) * radius, Math.sin(angle) * radius])
  }
  path(ctx, vertices, true)
}

function ellipse(ctx, x, y, radiusX, radiusY, rotation = 0, start = 0, end = Math.PI * 2) {
  ctx.beginPath()
  ctx.ellipse(x, y, radiusX, radiusY, rotation, start, end)
}

function drawStoryTexture(ctx, texture, primary, secondary, tertiary, alpha, compact) {
  const setStroke = (color, opacity, width = 0.012) => {
    ctx.strokeStyle = colorToRgba(color, alpha(opacity))
    ctx.lineWidth = width
  }
  const limit = compact ? 2 : 3

  if (texture === 'panopticon') {
    for (let frame = 0; frame < (compact ? 2 : 4); frame += 1) {
      const inset = frame * 0.15
      setStroke(frame === 1 ? tertiary : frame === 2 ? secondary : primary, frame === 1 ? 0.13 : 0.048, frame === 1 ? 0.018 : 0.009)
      ctx.strokeRect(-1.32 + inset, -0.72 + inset * 0.62, 2.64 - inset * 2, 1.44 - inset * 1.24)
    }
    ;[[-1.08, -0.48], [0.92, -0.42], [-0.86, 0.5], [1.12, 0.4]].slice(0, compact ? 3 : 4).forEach(([nodeX, nodeY], index) => {
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.15 : 0.065, index === 1 ? 0.02 : 0.01)
      polygon(ctx, 0.09, 4, Math.PI / 4)
      ctx.save(); ctx.translate(nodeX, nodeY); polygon(ctx, 0.09, 4, Math.PI / 4); ctx.stroke(); ctx.restore()
      ctx.beginPath(); ctx.moveTo(nodeX, nodeY); ctx.lineTo(0.3, 0.02); ctx.stroke()
    })
    ctx.fillStyle = colorToRgba(tertiary, alpha(0.026))
    ctx.fillRect(0.18, -0.62, 0.72, 1.24)
  } else if (texture === 'hardlight') {
    for (let diagonal = -4; diagonal <= 4; diagonal += 1) {
      setStroke(diagonal === 0 ? tertiary : diagonal % 2 === 0 ? secondary : primary, diagonal === 0 ? 0.14 : 0.042, diagonal === 0 ? 0.019 : 0.008)
      ctx.beginPath(); ctx.moveTo(-1.36, diagonal * 0.2 + 0.62); ctx.lineTo(0.52, diagonal * 0.2 - 0.62); ctx.lineTo(1.36, diagonal * 0.2 - 0.62); ctx.stroke()
    }
    ;[0.34, 0.62, 0.92].slice(0, compact ? 2 : 3).forEach((radius, index) => {
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.12 : 0.05, index === 1 ? 0.018 : 0.009)
      polygon(ctx, radius, 6, Math.PI / 6); ctx.stroke()
    })
  } else if (texture === 'civic') {
    ;[-1.2, -0.74, -0.22, 0.34, 0.86].slice(0, compact ? 4 : 5).forEach((towerX, index) => {
      const towerHeight = 0.34 + (index % 3) * 0.18
      setStroke(index === 2 ? tertiary : secondary, index === 2 ? 0.13 : 0.052, index === 2 ? 0.018 : 0.009)
      ctx.strokeRect(towerX, 0.58 - towerHeight, 0.34, towerHeight)
    })
    setStroke(tertiary, 0.12, 0.018)
    ctx.beginPath(); ctx.moveTo(-1.34, 0.58); ctx.lineTo(1.34, 0.58); ctx.moveTo(-0.72, 0.46); ctx.lineTo(0.86, -0.54); ctx.stroke()
  } else if (texture === 'impact') {
    for (let ray = 0; ray < (compact ? 7 : 12); ray += 1) {
      const angle = -0.22 + (ray / (compact ? 7 : 12)) * Math.PI * 2
      const inner = ray % 3 === 0 ? 0.44 : 0.68
      const outer = 1.28 + (ray % 4) * 0.06
      setStroke(ray % 3 === 0 ? tertiary : ray % 2 === 0 ? secondary : primary, ray % 3 === 0 ? 0.14 : 0.05, ray % 3 === 0 ? 0.021 : 0.009)
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * 0.68); ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer * 0.68); ctx.stroke()
    }
    setStroke(tertiary, 0.11, 0.018); polygon(ctx, 0.42, 5, -0.18); ctx.stroke()
  } else if (texture === 'fracture') {
    const shards = [[-1.28, 0.52, -0.3, -0.64], [-0.82, 0.68, -0.04, -0.18], [-0.22, 0.68, 0.18, -0.7], [0.16, 0.62, 0.68, -0.46], [0.58, 0.68, 1.26, -0.22]]
    shards.slice(0, compact ? 3 : 5).forEach(([x1, y1, x2, y2], index) => {
      setStroke(index === 2 ? tertiary : index % 2 ? secondary : primary, index === 2 ? 0.15 : 0.055, index === 2 ? 0.022 : 0.01)
      path(ctx, [[x1, y1], [x2, y2], [x2 + 0.16, y2 + 0.22], [x1, y1]], true); ctx.stroke()
    })
  } else if (texture === 'radiation') {
    ;[0.34, 0.62, 0.94].slice(0, compact ? 2 : 3).forEach((radius, index) => {
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.13 : 0.05, index === 1 ? 0.019 : 0.009)
      ctx.setLineDash(index === 2 ? [0.08, 0.06] : []); ellipse(ctx, -0.08, 0.02, radius, radius * 0.74, 0.08); ctx.stroke()
    })
    ctx.setLineDash([])
    for (let fuse = 0; fuse < (compact ? 5 : 8); fuse += 1) {
      const angle = -1.2 + fuse * 0.34
      setStroke(fuse === 3 ? tertiary : primary, fuse === 3 ? 0.14 : 0.045, fuse === 3 ? 0.019 : 0.009)
      ctx.beginPath(); ctx.moveTo(-0.08 + Math.cos(angle) * 0.72, 0.02 + Math.sin(angle) * 0.52); ctx.lineTo(-0.08 + Math.cos(angle) * 1.34, 0.02 + Math.sin(angle) * 0.82); ctx.stroke()
    }
  } else if (texture === 'blackwatch') {
    for (let stream = -limit; stream <= limit; stream += 1) {
      setStroke(stream === 0 ? secondary : primary, stream === 0 ? 0.14 : 0.05, stream === 0 ? 0.02 : 0.01)
      ctx.beginPath()
      ctx.moveTo(-1.42, stream * 0.18 + 0.36)
      ctx.bezierCurveTo(-0.74, stream * 0.18 - 0.58, 0.22, stream * 0.18 + 0.56, 1.42, stream * 0.18 - 0.28)
      ctx.stroke()
    }
    ctx.save()
    ctx.rotate(-0.24)
    ;[-0.58, -0.18, 0.27, 0.64].slice(0, compact ? 3 : 4).forEach((offset, index) => {
      ctx.fillStyle = colorToRgba(index === 1 ? tertiary : secondary, alpha(index === 1 ? 0.075 : 0.025))
      ctx.fillRect(-1.22, offset, 2.44, index === 1 ? 0.075 : 0.035)
    })
    ctx.restore()
    setStroke(tertiary, 0.16, 0.022)
    path(ctx, [[-0.86, -0.68], [-0.24, -0.18], [-0.43, 0.05], [0.14, 0.34], [0.02, 0.68], [0.82, 0.38]])
    ctx.stroke()
  } else if (texture === 'code') {
    const voidWash = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.16)
    voidWash.addColorStop(0, colorToRgba('#05030a', alpha(0.34)))
    voidWash.addColorStop(0.56, colorToRgba('#05030a', alpha(0.16)))
    voidWash.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = voidWash
    ctx.fillRect(-1.42, -0.84, 2.84, 1.68)
    const nodes = [[-1.18, -0.52], [-0.72, 0.34], [-0.22, -0.44], [0.36, 0.46], [0.88, -0.32], [1.2, 0.24]]
    setStroke(primary, 0.055, 0.009)
    ctx.beginPath()
    nodes.forEach(([nodeX, nodeY], index) => {
      if (index === 0) ctx.moveTo(nodeX, nodeY)
      else ctx.lineTo(nodeX, nodeY)
    })
    ctx.stroke()
    nodes.forEach(([nodeX, nodeY], index) => {
      ctx.beginPath()
      ctx.arc(nodeX, nodeY, index === 2 || index === 3 ? 0.055 : 0.032, 0, Math.PI * 2)
      setStroke(index === 2 ? tertiary : index === 3 ? secondary : primary, index === 2 || index === 3 ? 0.18 : 0.07, index === 2 || index === 3 ? 0.018 : 0.01)
      ctx.stroke()
    })
    ;[-0.62, -0.18, 0.25, 0.58].slice(0, compact ? 3 : 4).forEach((offset, index) => {
      const start = index % 2 === 0 ? -1.34 : 0.18
      const end = index % 2 === 0 ? -0.3 : 1.34
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.16 : 0.075, index === 1 ? 0.021 : 0.012)
      ctx.beginPath()
      ctx.moveTo(start, offset)
      ctx.lineTo(end, offset)
      ctx.stroke()
    })
  } else if (texture === 'talon') {
    const lens = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.18)
    lens.addColorStop(0, colorToRgba(tertiary, alpha(0.07)))
    lens.addColorStop(0.48, colorToRgba(secondary, alpha(0.028)))
    lens.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = lens
    ctx.fillRect(-1.32, -0.82, 2.64, 1.64)
    ;[0.54, 0.86, 1.16].slice(0, compact ? 2 : 3).forEach((radius, index) => {
      setStroke(index === 1 ? secondary : primary, index === 1 ? 0.14 : 0.055, index === 1 ? 0.02 : 0.01)
      ellipse(ctx, 0, 0, radius, radius * 0.68, -0.04)
      ctx.stroke()
    })
    for (let spoke = 0; spoke < 8; spoke += 1) {
      const angle = -Math.PI / 2 + (spoke / 8) * Math.PI * 2
      const inner = compact ? 0.46 : 0.34
      const outer = spoke % 2 === 0 ? 1.35 : 1.18
      setStroke(spoke === 0 ? tertiary : spoke % 2 === 0 ? secondary : primary, spoke === 0 ? 0.18 : spoke % 2 === 0 ? 0.09 : 0.045, spoke === 0 ? 0.022 : 0.011)
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * 0.68)
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer * 0.68)
      ctx.stroke()
    }
  } else if (texture === 'ritual') {
    const mandalaX = -0.18
    const mandalaY = -0.02
    ;[0.42, 0.7, 1.02].slice(0, compact ? 2 : 3).forEach((radius, index) => {
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.14 : 0.055, index === 1 ? 0.02 : 0.01)
      ctx.setLineDash(index === 2 ? [0.08, 0.065] : [])
      ellipse(ctx, mandalaX, mandalaY, radius, radius * 0.78, 0.03)
      ctx.stroke()
    })
    ctx.setLineDash([])
    for (let bead = 0; bead < (compact ? 8 : 12); bead += 1) {
      const angle = -Math.PI / 2 + (bead / (compact ? 8 : 12)) * Math.PI * 2
      const beadX = mandalaX + Math.cos(angle) * 0.7
      const beadY = mandalaY + Math.sin(angle) * 0.55
      ctx.fillStyle = colorToRgba(bead % 3 === 0 ? tertiary : secondary, alpha(bead % 3 === 0 ? 0.12 : 0.055))
      ctx.beginPath()
      ctx.arc(beadX, beadY, bead % 3 === 0 ? 0.035 : 0.022, 0, Math.PI * 2)
      ctx.fill()
    }
    setStroke(tertiary, 0.16, 0.02)
    ctx.beginPath(); ctx.moveTo(0.08, -0.78); ctx.lineTo(0.08, 0.78); ctx.stroke()
    ;[-0.42, -0.12, 0.18, 0.48].slice(0, compact ? 3 : 4).forEach((offset, index) => {
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.13 : 0.06, index === 1 ? 0.019 : 0.01)
      path(ctx, [[0.22, offset - 0.12], [0.5, offset], [0.22, offset + 0.12], [1.28, offset + 0.12]])
      ctx.stroke()
    })
  } else if (texture === 'neon') {
    for (let veil = -limit; veil <= limit; veil += 1) {
      setStroke(veil === 0 ? secondary : primary, veil === 0 ? 0.12 : 0.045, veil === 0 ? 0.018 : 0.009)
      ctx.beginPath()
      ctx.moveTo(-1.36, veil * 0.19 + 0.12)
      ctx.bezierCurveTo(-0.76, veil * 0.12 - 0.48, 0.22, veil * 0.2 + 0.5, 1.34, veil * 0.12 - 0.18)
      ctx.stroke()
    }
    ctx.save()
    ctx.rotate(-0.18)
    ;[-0.5, -0.14, 0.24, 0.54].slice(0, compact ? 3 : 4).forEach((offset, index) => {
      ctx.fillStyle = colorToRgba(index === 1 ? tertiary : secondary, alpha(index === 1 ? 0.12 : 0.035))
      ctx.fillRect(-1.22, offset, index === 1 ? 1.52 : 2.38, index === 1 ? 0.065 : 0.026)
    })
    ctx.restore()
    setStroke(tertiary, 0.14, 0.02)
    ctx.setLineDash([0.12, 0.08])
    ctx.strokeRect(0.52, -0.58, 0.54, 0.44)
    ctx.setLineDash([])
    setStroke(primary, 0.09, 0.012)
    ctx.beginPath(); ctx.moveTo(0.62, -0.48); ctx.lineTo(0.96, -0.24); ctx.moveTo(0.96, -0.48); ctx.lineTo(0.62, -0.24); ctx.stroke()
  } else if (texture === 'genetics') {
    const helixStart = -1.28
    const helixEnd = 1.22
    const segments = compact ? 8 : 13
    setStroke(secondary, 0.12, 0.018)
    ctx.beginPath()
    for (let segment = 0; segment <= segments; segment += 1) {
      const progress = segment / segments
      const helixX = helixStart + (helixEnd - helixStart) * progress
      const helixY = Math.sin(progress * Math.PI * 3.2) * 0.34
      if (segment === 0) ctx.moveTo(helixX, helixY)
      else ctx.lineTo(helixX, helixY)
    }
    ctx.stroke()
    setStroke(tertiary, 0.14, 0.018)
    ctx.beginPath()
    for (let segment = 0; segment <= segments; segment += 1) {
      const progress = segment / segments
      const helixX = helixStart + (helixEnd - helixStart) * progress
      const helixY = -Math.sin(progress * Math.PI * 3.2) * 0.34
      if (segment === 0) ctx.moveTo(helixX, helixY)
      else ctx.lineTo(helixX, helixY)
    }
    ctx.stroke()
    for (let segment = 0; segment <= segments; segment += 2) {
      const progress = segment / segments
      const helixX = helixStart + (helixEnd - helixStart) * progress
      const helixY = Math.sin(progress * Math.PI * 3.2) * 0.34
      setStroke(segment % 4 === 0 ? tertiary : secondary, segment % 4 === 0 ? 0.13 : 0.07, segment % 4 === 0 ? 0.018 : 0.01)
      ctx.beginPath(); ctx.moveTo(helixX, helixY); ctx.lineTo(helixX, -helixY); ctx.stroke()
    }
    ;[-0.7, -0.46, 0.48, 0.72].slice(0, compact ? 3 : 4).forEach((guideY, index) => {
      setStroke(index === 2 ? tertiary : primary, index === 2 ? 0.1 : 0.035, index === 2 ? 0.015 : 0.008)
      ctx.beginPath(); ctx.moveTo(-1.34, guideY); ctx.lineTo(1.34, guideY); ctx.stroke()
    })
    ;[-0.88, 0.86].forEach((reservoirX, index) => {
      ellipse(ctx, reservoirX, 0.02, 0.28, 0.52, index ? -0.16 : 0.16)
      setStroke(index === 0 ? secondary : tertiary, 0.09, 0.015)
      ctx.stroke()
      ctx.fillStyle = colorToRgba(index === 0 ? secondary : tertiary, alpha(0.045))
      ctx.beginPath(); ctx.arc(reservoirX, index ? -0.16 : 0.16, 0.07, 0, Math.PI * 2); ctx.fill()
    })
  } else if (texture === 'organic') {
    ;[-0.48, 0.48].forEach((heartX, index) => {
      setStroke(index ? tertiary : secondary, index ? 0.14 : 0.1, index ? 0.021 : 0.017)
      ctx.beginPath(); ctx.moveTo(heartX, 0.42); ctx.bezierCurveTo(heartX - 0.58, 0.04, heartX - 0.28, -0.54, heartX, -0.18); ctx.bezierCurveTo(heartX + 0.28, -0.54, heartX + 0.58, 0.04, heartX, 0.42); ctx.stroke()
    })
    setStroke(primary, 0.05, 0.009)
    ctx.beginPath(); ctx.moveTo(-1.36, 0.1); ctx.lineTo(-0.88, 0.1); ctx.lineTo(-0.72, -0.22); ctx.lineTo(-0.48, 0.34); ctx.lineTo(-0.22, -0.12); ctx.lineTo(0.18, -0.12); ctx.lineTo(0.46, 0.28); ctx.lineTo(0.7, -0.26); ctx.lineTo(0.92, 0.1); ctx.lineTo(1.36, 0.1); ctx.stroke()
  } else if (texture === 'heraldic') {
    ctx.fillStyle = colorToRgba(secondary, alpha(0.025)); ctx.fillRect(-0.22, -0.78, 0.44, 1.56)
    ;[0.52, 0.82, 1.1].slice(0, compact ? 2 : 3).forEach((radius, index) => {
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.13 : 0.05, index === 1 ? 0.02 : 0.009)
      ctx.beginPath(); ctx.arc(0, 0.78, radius, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke()
    })
    setStroke(tertiary, 0.12, 0.018); ctx.beginPath(); ctx.moveTo(0, -0.76); ctx.lineTo(0, 0.5); ctx.moveTo(-0.58, -0.18); ctx.lineTo(0, 0.5); ctx.lineTo(0.58, -0.18); ctx.stroke()
  } else if (texture === 'arena') {
    ;[0.44, 0.72, 1.02].slice(0, compact ? 2 : 3).forEach((radius, index) => {
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.13 : 0.052, index === 1 ? 0.02 : 0.01)
      ctx.setLineDash(index === 2 ? [0.12, 0.07] : []); ellipse(ctx, 0, 0.06, radius, radius * 0.7, -0.06); ctx.stroke()
    })
    ctx.setLineDash([])
    for (let tick = 0; tick < (compact ? 8 : 14); tick += 1) {
      const angle = -Math.PI + tick * (Math.PI * 2 / (compact ? 8 : 14))
      setStroke(tick === 3 ? tertiary : primary, tick === 3 ? 0.14 : 0.045, tick === 3 ? 0.02 : 0.008)
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 1.08, 0.06 + Math.sin(angle) * 0.75); ctx.lineTo(Math.cos(angle) * 1.28, 0.06 + Math.sin(angle) * 0.84); ctx.stroke()
    }
  } else if (texture === 'volskaya') {
    ;[0.46, 0.76, 1.04].slice(0, compact ? 2 : 3).forEach((radius, index) => {
      setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.14 : 0.052, index === 1 ? 0.02 : 0.009); ellipse(ctx, 0, 0, radius, radius * 0.72, 0); ctx.stroke()
    })
    setStroke(primary, 0.055, 0.01)
    ;[-1.18, -0.76, -0.34, 0.34, 0.76, 1.18].forEach(lineX => { ctx.beginPath(); ctx.moveTo(lineX, -0.72); ctx.lineTo(lineX, 0.72); ctx.stroke() })
    setStroke(tertiary, 0.14, 0.022); ctx.beginPath(); ctx.moveTo(-1.24, 0); ctx.lineTo(1.24, 0); ctx.stroke()
  } else if (texture === 'forge') {
    setStroke(primary, 0.04, 0.008)
    for (let grid = -4; grid <= 4; grid += 1) { ctx.beginPath(); ctx.moveTo(grid * 0.3, -0.76); ctx.lineTo(grid * 0.3, 0.76); ctx.moveTo(-1.36, grid * 0.18); ctx.lineTo(1.36, grid * 0.18); ctx.stroke() }
    setStroke(secondary, 0.095, 0.016); path(ctx, [[-0.86, 0.4], [-0.36, 0.4], [-0.18, 0.16], [0.4, 0.16], [0.58, 0.4], [1.02, 0.4]]); ctx.stroke()
    for (let spark = 0; spark < (compact ? 5 : 9); spark += 1) {
      const sparkX = -0.72 + spark * 0.19
      setStroke(spark === 4 ? tertiary : secondary, spark === 4 ? 0.18 : 0.075, spark === 4 ? 0.02 : 0.01); ctx.beginPath(); ctx.moveTo(sparkX, -0.12); ctx.lineTo(sparkX + ((spark % 2) ? 0.16 : -0.08), -0.58 - (spark % 3) * 0.04); ctx.stroke()
    }
  } else if (texture === 'outlaw') {
    ctx.save(); ctx.rotate(-0.16)
    ;[-0.56, -0.18, 0.2, 0.58].slice(0, compact ? 3 : 4).forEach((bandY, index) => { ctx.fillStyle = colorToRgba(index === 1 ? tertiary : secondary, alpha(index === 1 ? 0.07 : 0.024)); ctx.fillRect(-1.42, bandY, 2.84, index === 1 ? 0.08 : 0.035) })
    ctx.restore()
    setStroke(secondary, 0.08, 0.013); ctx.beginPath(); ctx.arc(-0.28, 0.06, 0.68, -2.72, 0.54); ctx.stroke()
    setStroke(tertiary, 0.13, 0.019); path(ctx, [[-1.28, 0.5], [-0.72, 0.16], [-0.2, 0.28], [0.34, -0.18], [1.28, -0.52]]); ctx.stroke()
  } else if (texture === 'film') {
    ;[-0.56, 0.56].forEach((railY, railIndex) => {
      setStroke(railIndex ? tertiary : secondary, railIndex ? 0.12 : 0.075, railIndex ? 0.018 : 0.012); ctx.beginPath(); ctx.moveTo(-1.34, railY); ctx.lineTo(1.34, railY); ctx.stroke()
      for (let frame = -5; frame <= 5; frame += 1) ctx.strokeRect(frame * 0.26 - 0.08, railY - 0.07, 0.16, 0.14)
    })
    for (let ray = 0; ray < (compact ? 5 : 8); ray += 1) {
      const angle = -0.86 + ray * 0.22
      setStroke(ray === 3 ? tertiary : primary, ray === 3 ? 0.13 : 0.043, ray === 3 ? 0.019 : 0.008); ctx.beginPath(); ctx.moveTo(-0.44, 0.16); ctx.lineTo(-0.44 + Math.cos(angle) * 1.86, 0.16 + Math.sin(angle) * 1.24); ctx.stroke()
    }
  } else if (texture === 'adaptive') {
    ;[-1, 1].forEach(side => {
      setStroke(side > 0 ? tertiary : secondary, side > 0 ? 0.12 : 0.08, side > 0 ? 0.019 : 0.014)
      path(ctx, [[0, -0.46], [side * 0.42, -0.18], [side * 0.84, -0.36], [side * 0.62, 0.08], [side * 1.2, 0.38], [side * 0.36, 0.48], [0, 0.7]]); ctx.stroke()
    })
    ;[0.2, 0.38, 0.58].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : primary, index === 1 ? 0.13 : 0.045, index === 1 ? 0.018 : 0.009); polygon(ctx, radius, 4, Math.PI / 4); ctx.stroke() })
  } else if (texture === 'corrupted') {
    ;[-0.58, -0.34, -0.08, 0.18, 0.44, 0.62].slice(0, compact ? 4 : 6).forEach((scanY, index) => {
      const offset = index % 2 ? 0.28 : -0.18
      setStroke(index === 3 ? tertiary : index % 2 ? secondary : primary, index === 3 ? 0.15 : 0.052, index === 3 ? 0.021 : 0.009)
      ctx.beginPath(); ctx.moveTo(-1.34 + offset, scanY); ctx.lineTo(-0.26 + offset, scanY); ctx.moveTo(0.08 - offset, scanY); ctx.lineTo(1.34 - offset, scanY); ctx.stroke()
    })
    ctx.fillStyle = colorToRgba(tertiary, alpha(0.045)); ctx.fillRect(-0.24, -0.52, 0.16, 0.34); ctx.fillRect(0.16, 0.08, 0.24, 0.18); ctx.fillRect(0.7, -0.18, 0.34, 0.12)
  } else if (texture === 'tracker') {
    const route = [[-1.22, 0.44], [-0.82, -0.18], [-0.36, 0.1], [0.08, -0.52], [0.62, -0.22], [1.16, -0.6]]
    setStroke(secondary, 0.09, 0.014); path(ctx, route); ctx.stroke()
    route.slice(0, compact ? 4 : 6).forEach(([nodeX, nodeY], index) => { setStroke(index === 3 ? tertiary : primary, index === 3 ? 0.16 : 0.06, index === 3 ? 0.019 : 0.01); ctx.beginPath(); ctx.arc(nodeX, nodeY, index === 3 ? 0.08 : 0.04, 0, Math.PI * 2); ctx.stroke() })
    setStroke(tertiary, 0.11, 0.018); ctx.beginPath(); ctx.arc(0.08, -0.52, 0.28, 0, Math.PI * 2); ctx.moveTo(-0.36, -0.52); ctx.lineTo(0.52, -0.52); ctx.moveTo(0.08, -0.78); ctx.lineTo(0.08, -0.26); ctx.stroke()
  } else if (texture === 'shimada') {
    for (let stream = -1; stream <= (compact ? 1 : 2); stream += 1) {
      setStroke(stream === 0 ? tertiary : secondary, stream === 0 ? 0.13 : 0.055, stream === 0 ? 0.02 : 0.01)
      ctx.beginPath(); ctx.moveTo(-1.34, 0.42 + stream * 0.16); ctx.bezierCurveTo(-0.72, -0.7 + stream * 0.12, 0.04, 0.72 + stream * 0.12, 1.3, -0.34 + stream * 0.12); ctx.stroke()
    }
    setStroke(primary, 0.07, 0.012); ;[-0.88, -0.28, 0.32, 0.92].slice(0, compact ? 3 : 4).forEach(bladeX => { ctx.beginPath(); ctx.moveTo(bladeX - 0.16, 0.62); ctx.lineTo(bladeX + 0.22, -0.54); ctx.stroke() })
  } else if (texture === 'penance') {
    setStroke(secondary, 0.1, 0.017); ctx.beginPath(); ctx.arc(-0.12, 0, 0.82, -2.72, 1.7); ctx.stroke()
    setStroke(tertiary, 0.14, 0.021); ctx.beginPath(); ctx.arc(-0.12, 0, 0.58, -2.52, 0.86); ctx.stroke()
    setStroke(primary, 0.055, 0.01); ctx.beginPath(); ctx.moveTo(-1.32, 0.52); ctx.lineTo(1.18, -0.46); ctx.lineTo(0.92, -0.5); ctx.moveTo(1.18, -0.46); ctx.lineTo(1.02, -0.24); ctx.stroke()
  } else if (texture === 'research') {
    setStroke(primary, 0.045, 0.008); for (let grid = -4; grid <= 4; grid += 1) { ctx.beginPath(); ctx.moveTo(grid * 0.31, -0.72); ctx.lineTo(grid * 0.31, 0.72); ctx.moveTo(-1.34, grid * 0.18); ctx.lineTo(1.34, grid * 0.18); ctx.stroke() }
    setStroke(tertiary, 0.13, 0.019); ctx.strokeRect(-0.42, -0.64, 0.84, 1.28)
    setStroke(secondary, 0.09, 0.014); ctx.beginPath(); ctx.moveTo(-1.28, 0.3); ctx.lineTo(-0.88, 0.3); ctx.quadraticCurveTo(-0.54, -0.54, -0.12, 0.3); ctx.quadraticCurveTo(0.32, 0.72, 0.78, 0.3); ctx.lineTo(1.28, 0.3); ctx.stroke()
  } else if (texture === 'helix') {
    ;[-1, 1].forEach(side => { setStroke(side > 0 ? tertiary : secondary, side > 0 ? 0.12 : 0.075, side > 0 ? 0.019 : 0.013); path(ctx, [[0, 0.62], [side * 0.38, 0.24], [side * 0.72, 0.1], [side * 1.08, -0.42]]); ctx.stroke() })
    for (let rung = -3; rung <= 3; rung += 1) { setStroke(rung === 0 ? tertiary : primary, rung === 0 ? 0.13 : 0.045, rung === 0 ? 0.018 : 0.008); ctx.beginPath(); ctx.moveTo(-0.18 - Math.abs(rung) * 0.07, rung * 0.19); ctx.lineTo(0.18 + Math.abs(rung) * 0.07, rung * 0.19); ctx.stroke() }
  } else if (texture === 'colosseo') {
    ;[-0.76, 0, 0.76].slice(0, compact ? 2 : 3).forEach((archX, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.13 : 0.055, index === 1 ? 0.02 : 0.01); ctx.beginPath(); ctx.arc(archX, 0.56, 0.4, Math.PI, Math.PI * 2); ctx.lineTo(archX + 0.4, 0.68); ctx.moveTo(archX - 0.4, 0.56); ctx.lineTo(archX - 0.4, 0.68); ctx.stroke() })
    setStroke(tertiary, 0.12, 0.02); ctx.beginPath(); ctx.moveTo(0, -0.72); ctx.lineTo(0, 0.7); ctx.moveTo(-0.18, -0.5); ctx.lineTo(0.18, -0.5); ctx.stroke()
  } else if (texture === 'cairo') {
    setStroke(secondary, 0.075, 0.013); ctx.beginPath(); ctx.moveTo(-1.34, 0.48); ctx.quadraticCurveTo(-0.58, 0.28, 0.08, 0.48); ctx.quadraticCurveTo(0.72, 0.66, 1.34, 0.4); ctx.stroke()
    setStroke(tertiary, 0.14, 0.02); ctx.beginPath(); ctx.moveTo(-1.22, 0.36); ctx.lineTo(1.18, -0.46); ctx.moveTo(0.92, -0.58); ctx.lineTo(1.18, -0.46); ctx.lineTo(0.96, -0.28); ctx.stroke()
    setStroke(primary, 0.055, 0.01); ctx.beginPath(); ctx.arc(0.54, -0.24, 0.38, -1.3, 1.36); ctx.stroke()
  } else if (texture === 'caribbean') {
    setStroke(secondary, 0.075, 0.013); ctx.beginPath(); ctx.moveTo(-1.34, 0.28); ctx.bezierCurveTo(-0.84, 0.04, -0.42, 0.54, 0.06, 0.28); ctx.bezierCurveTo(0.52, 0.02, 0.9, 0.5, 1.34, 0.24); ctx.stroke()
    ;[0.32, 0.56, 0.82].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : primary, index === 1 ? 0.13 : 0.045, index === 1 ? 0.019 : 0.009); ellipse(ctx, 0.38, -0.16, radius, radius * 0.72, 0); ctx.stroke() })
    ctx.fillStyle = colorToRgba(tertiary, alpha(0.055)); ctx.fillRect(0.34, -0.54, 0.08, 1.08)
  } else if (texture === 'armor') {
    ;[0.42, 0.72, 1.02].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.13 : 0.052, index === 1 ? 0.02 : 0.01); polygon(ctx, radius, 6, Math.PI / 6); ctx.stroke() })
    setStroke(primary, 0.055, 0.009); for (let seam = 0; seam < 6; seam += 1) { const angle = seam * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 0.44, Math.sin(angle) * 0.44); ctx.lineTo(Math.cos(angle) * 1.24, Math.sin(angle) * 0.82); ctx.stroke() }
  } else if (texture === 'inti') {
    ;[0.34, 0.62, 0.94].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.15 : 0.055, index === 1 ? 0.021 : 0.01); ctx.setLineDash(index === 2 ? [0.1, 0.06] : []); ellipse(ctx, 0, 0, radius, radius * 0.76, 0); ctx.stroke() })
    ctx.setLineDash([])
    for (let ray = 0; ray < (compact ? 8 : 14); ray += 1) { const angle = ray * Math.PI * 2 / (compact ? 8 : 14); const gap = ray === 3 || ray === 4; setStroke(gap ? primary : ray % 3 === 0 ? tertiary : secondary, gap ? 0.025 : ray % 3 === 0 ? 0.14 : 0.055, gap ? 0.008 : ray % 3 === 0 ? 0.019 : 0.01); ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 0.72, Math.sin(angle) * 0.54); ctx.lineTo(Math.cos(angle) * (gap ? 0.9 : 1.32), Math.sin(angle) * (gap ? 0.68 : 0.82)); ctx.stroke() }
  } else if (texture === 'workshop') {
    setStroke(primary, 0.04, 0.008); for (let grid = -4; grid <= 4; grid += 1) { ctx.beginPath(); ctx.moveTo(grid * 0.3, -0.74); ctx.lineTo(grid * 0.3, 0.74); ctx.moveTo(-1.34, grid * 0.18); ctx.lineTo(1.34, grid * 0.18); ctx.stroke() }
    ;[[-0.84, 0.36], [-0.42, -0.28], [0.12, 0.2], [0.64, -0.4], [1.06, 0.18]].slice(0, compact ? 4 : 5).forEach(([nodeX, nodeY], index) => { setStroke(index === 3 ? tertiary : secondary, index === 3 ? 0.15 : 0.07, index === 3 ? 0.02 : 0.011); ctx.beginPath(); ctx.arc(nodeX, nodeY, index === 3 ? 0.09 : 0.045, 0, Math.PI * 2); ctx.stroke(); if (index) { const [prevX, prevY] = [[-0.84, 0.36], [-0.42, -0.28], [0.12, 0.2], [0.64, -0.4], [1.06, 0.18]][index - 1]; ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(nodeX, nodeY); ctx.stroke() } })
  } else if (texture === 'shrine') {
    setStroke(tertiary, 0.13, 0.02); ctx.beginPath(); ctx.moveTo(-0.88, -0.46); ctx.lineTo(0.88, -0.46); ctx.moveTo(-0.68, -0.28); ctx.lineTo(0.68, -0.28); ctx.moveTo(-0.5, -0.46); ctx.lineTo(-0.38, 0.66); ctx.moveTo(0.5, -0.46); ctx.lineTo(0.38, 0.66); ctx.stroke()
    for (let stream = -2; stream <= (compact ? 1 : 2); stream += 1) { setStroke(stream === 0 ? secondary : primary, stream === 0 ? 0.1 : 0.04, stream === 0 ? 0.016 : 0.008); ctx.beginPath(); ctx.moveTo(-1.34, 0.36 + stream * 0.15); ctx.bezierCurveTo(-0.62, -0.26 + stream * 0.12, 0.4, 0.66 + stream * 0.08, 1.34, -0.18 + stream * 0.12); ctx.stroke() }
  } else if (texture === 'medical') {
    ;[-1, 1].forEach(side => { setStroke(side > 0 ? tertiary : secondary, side > 0 ? 0.12 : 0.075, side > 0 ? 0.019 : 0.013); path(ctx, [[0, -0.5], [side * 0.44, -0.18], [side * 0.88, -0.34], [side * 0.58, 0.12], [side * 1.18, 0.42], [side * 0.3, 0.52], [0, 0.72]]); ctx.stroke() })
    setStroke(primary, 0.055, 0.01); ctx.beginPath(); ctx.moveTo(-1.28, 0.18); ctx.lineTo(-0.72, 0.18); ctx.lineTo(-0.56, -0.18); ctx.lineTo(-0.34, 0.42); ctx.lineTo(-0.08, 0.02); ctx.lineTo(0.18, 0.18); ctx.lineTo(1.28, 0.18); ctx.stroke()
  } else if (texture === 'hud') {
    ;[0.42, 0.72, 1.02].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.14 : 0.05, index === 1 ? 0.019 : 0.009); ctx.setLineDash(index === 2 ? [0.08, 0.06] : []); ellipse(ctx, 0, 0.02, radius, radius * 0.7, 0); ctx.stroke() })
    ctx.setLineDash([])
    ;[-1, 1].forEach(side => { setStroke(side > 0 ? tertiary : primary, side > 0 ? 0.12 : 0.05, side > 0 ? 0.018 : 0.009); path(ctx, [[side * 1.3, -0.62], [side * 0.96, -0.62], [side * 0.86, -0.46], [side * 0.86, 0.46], [side * 0.96, 0.62], [side * 1.3, 0.62]]); ctx.stroke() })
    setStroke(tertiary, 0.13, 0.019); ctx.beginPath(); ctx.moveTo(-0.22, 0.02); ctx.lineTo(0.22, 0.02); ctx.moveTo(0, -0.2); ctx.lineTo(0, 0.24); ctx.stroke()
  } else if (texture === 'formation') {
    const squad = [[0, -0.52], [-0.62, 0.28], [0.62, 0.28], [-1.02, -0.04], [1.02, -0.04]]
    setStroke(secondary, 0.08, 0.013); path(ctx, squad); ctx.stroke()
    squad.slice(0, compact ? 3 : 5).forEach(([nodeX, nodeY], index) => { setStroke(index === 0 ? tertiary : primary, index === 0 ? 0.16 : 0.06, index === 0 ? 0.021 : 0.01); polygon(ctx, index === 0 ? 0.12 : 0.07, 4, Math.PI / 4); ctx.save(); ctx.translate(nodeX, nodeY); polygon(ctx, index === 0 ? 0.12 : 0.07, 4, Math.PI / 4); ctx.stroke(); ctx.restore() })
    setStroke(primary, 0.045, 0.008); ;[-0.66, -0.22, 0.22, 0.66].forEach(guideY => { ctx.beginPath(); ctx.moveTo(-1.34, guideY); ctx.lineTo(1.34, guideY); ctx.stroke() })
  } else if (texture === 'tactical') {
    setStroke(primary, 0.04, 0.008); for (let grid = -4; grid <= 4; grid += 1) { ctx.beginPath(); ctx.moveTo(grid * 0.3, -0.74); ctx.lineTo(grid * 0.3, 0.74); ctx.moveTo(-1.34, grid * 0.18); ctx.lineTo(1.34, grid * 0.18); ctx.stroke() }
    const rail = [[-1.28, 0.52], [-0.68, 0.18], [-0.22, 0.34], [0.32, -0.24], [1.24, -0.48]]
    setStroke(tertiary, 0.14, 0.021); path(ctx, rail); ctx.stroke()
    rail.slice(0, compact ? 4 : 5).forEach(([nodeX, nodeY], index) => { ctx.fillStyle = colorToRgba(index === 3 ? tertiary : secondary, alpha(index === 3 ? 0.15 : 0.065)); ctx.beginPath(); ctx.arc(nodeX, nodeY, index === 3 ? 0.065 : 0.035, 0, Math.PI * 2); ctx.fill() })
  } else if (texture === 'classified') {
    ;[-0.56, -0.28, 0.04, 0.34, 0.58].slice(0, compact ? 4 : 5).forEach((lineY, index) => { setStroke(index === 2 ? tertiary : secondary, index === 2 ? 0.14 : 0.055, index === 2 ? 0.021 : 0.01); ctx.beginPath(); ctx.moveTo(-1.26 + (index % 2) * 0.32, lineY); ctx.lineTo(1.26 - ((index + 1) % 2) * 0.46, lineY); ctx.stroke() })
    ctx.fillStyle = colorToRgba('#050507', alpha(0.22)); ctx.fillRect(-0.72, -0.42, 0.88, 0.12); ctx.fillRect(0.18, 0.18, 0.72, 0.11)
    setStroke(tertiary, 0.11, 0.018); path(ctx, [[-1.14, -0.7], [-0.82, -0.48], [-1.14, -0.26], [-0.82, -0.04]]); ctx.stroke()
  } else if (texture === 'orbit') {
    ;[0.42, 0.7, 1].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.13 : 0.05, index === 1 ? 0.019 : 0.009); ellipse(ctx, 0, 0, radius, radius * 0.48, -0.22 + index * 0.18); ctx.stroke() })
    ;[-0.82, -0.48, -0.14, 0.2, 0.54, 0.88].slice(0, compact ? 4 : 6).forEach((barX, index) => { setStroke(index === 3 ? tertiary : primary, index === 3 ? 0.14 : 0.045, index === 3 ? 0.02 : 0.009); ctx.beginPath(); ctx.moveTo(barX, 0.54); ctx.lineTo(barX, 0.54 - (0.18 + (index % 3) * 0.16)); ctx.stroke() })
  } else if (texture === 'lunar') {
    setStroke(secondary, 0.08, 0.014); ctx.beginPath(); ctx.arc(0, 0.74, 1.22, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke()
    ;[-0.5, 0.5].forEach((lensX, index) => { setStroke(index ? tertiary : secondary, index ? 0.13 : 0.09, index ? 0.019 : 0.015); ellipse(ctx, lensX, -0.08, 0.34, 0.25, 0); ctx.stroke() })
    setStroke(primary, 0.055, 0.01); ctx.beginPath(); ctx.moveTo(-0.16, -0.08); ctx.lineTo(0.16, -0.08); ctx.moveTo(-1.32, 0.48); ctx.lineTo(1.32, 0.48); ctx.stroke()
  } else if (texture === 'mars') {
    ;[0.44, 0.74, 1.04].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.14 : 0.052, index === 1 ? 0.02 : 0.009); ellipse(ctx, -0.14, 0.04, radius, radius * 0.45, -0.28 + index * 0.17); ctx.stroke() })
    ctx.fillStyle = colorToRgba(tertiary, alpha(0.12)); ctx.beginPath(); ctx.arc(0.82, -0.42, 0.075, 0, Math.PI * 2); ctx.fill()
    setStroke(primary, 0.055, 0.01); ctx.beginPath(); ctx.moveTo(-1.28, 0.52); ctx.quadraticCurveTo(-0.44, 0.16, 0.18, 0.5); ctx.quadraticCurveTo(0.72, 0.72, 1.28, 0.44); ctx.stroke()
  } else if (texture === 'chronal') {
    ;[0.4, 0.68, 0.96].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.14 : 0.05, index === 1 ? 0.02 : 0.009); ctx.setLineDash(index === 2 ? [0.1, 0.07] : []); ellipse(ctx, 0, 0, radius, radius * 0.72, 0); ctx.stroke() })
    ctx.setLineDash([]); setStroke(tertiary, 0.14, 0.02); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-0.38, -0.42); ctx.moveTo(0, 0); ctx.lineTo(0.48, -0.12); ctx.stroke()
    setStroke(primary, 0.045, 0.008); ;[-1.18, -0.84, 0.82, 1.16].forEach(frameX => ctx.strokeRect(frameX - 0.12, -0.56, 0.24, 1.12))
  } else if (texture === 'terrain') {
    for (let ridge = -2; ridge <= (compact ? 1 : 3); ridge += 1) { setStroke(ridge === 0 ? tertiary : secondary, ridge === 0 ? 0.13 : 0.05, ridge === 0 ? 0.019 : 0.009); ctx.beginPath(); ctx.moveTo(-1.38, 0.5 + ridge * 0.14); ctx.lineTo(-0.82, 0.18 + ridge * 0.11); ctx.lineTo(-0.34, 0.42 + ridge * 0.1); ctx.lineTo(0.2, -0.18 + ridge * 0.08); ctx.lineTo(0.72, 0.24 + ridge * 0.08); ctx.lineTo(1.38, -0.06 + ridge * 0.12); ctx.stroke() }
    setStroke(primary, 0.06, 0.01); ctx.setLineDash([0.08, 0.06]); ctx.beginPath(); ctx.moveTo(-1.2, -0.5); ctx.quadraticCurveTo(-0.26, -0.72, 0.84, -0.34); ctx.lineTo(1.22, -0.56); ctx.stroke(); ctx.setLineDash([])
  } else if (texture === 'strata') {
    for (let layer = -3; layer <= 3; layer += 1) { setStroke(layer === 0 ? tertiary : layer % 2 ? secondary : primary, layer === 0 ? 0.13 : 0.045, layer === 0 ? 0.019 : 0.008); ctx.beginPath(); ctx.moveTo(-1.36, layer * 0.18 + 0.12); ctx.bezierCurveTo(-0.72, layer * 0.12 - 0.24, 0.24, layer * 0.2 + 0.28, 1.36, layer * 0.14 - 0.08); ctx.stroke() }
    setStroke(tertiary, 0.12, 0.018); path(ctx, [[-0.72, -0.62], [-0.38, -0.28], [-0.12, -0.46], [0.2, 0.04], [0.5, -0.22], [0.92, 0.34]]); ctx.stroke()
  } else if (texture === 'wasteland') {
    for (let ridge = -2; ridge <= (compact ? 1 : 2); ridge += 1) {
      setStroke(ridge === 0 ? tertiary : secondary, ridge === 0 ? 0.13 : 0.045, ridge === 0 ? 0.019 : 0.009)
      ctx.beginPath()
      ctx.moveTo(-1.38, 0.38 + ridge * 0.17)
      ctx.quadraticCurveTo(-0.64, -0.12 + ridge * 0.1, 0.02, 0.26 + ridge * 0.15)
      ctx.quadraticCurveTo(0.74, 0.7 + ridge * 0.08, 1.38, 0.18 + ridge * 0.16)
      ctx.stroke()
    }
    ;[0.34, 0.52].forEach((radius, index) => {
      setStroke(index === 0 ? tertiary : secondary, index === 0 ? 0.14 : 0.06, index === 0 ? 0.019 : 0.01)
      ellipse(ctx, 0.58, -0.2, radius, radius * 0.76, 0)
      ctx.stroke()
    })
    for (let tick = 0; tick < (compact ? 7 : 11); tick += 1) {
      const angle = Math.PI * 0.78 + (tick / (compact ? 6 : 10)) * Math.PI * 1.44
      setStroke(tick === (compact ? 4 : 7) ? tertiary : primary, tick === (compact ? 4 : 7) ? 0.15 : 0.05, tick === (compact ? 4 : 7) ? 0.018 : 0.008)
      ctx.beginPath()
      ctx.moveTo(0.58 + Math.cos(angle) * 0.36, -0.2 + Math.sin(angle) * 0.27)
      ctx.lineTo(0.58 + Math.cos(angle) * 0.46, -0.2 + Math.sin(angle) * 0.35)
      ctx.stroke()
    }
    setStroke(primary, 0.07, 0.011)
    for (let link = 0; link < (compact ? 4 : 6); link += 1) {
      ellipse(ctx, -1.16 + link * 0.3, -0.48 + (link % 2) * 0.1, 0.15, 0.08, -0.28)
      ctx.stroke()
    }
  } else if (texture === 'scrap') {
    setStroke(primary, 0.045, 0.009); for (let tooth = -6; tooth <= 6; tooth += 1) { path(ctx, [[tooth * 0.22 - 0.12, 0.62], [tooth * 0.22, 0.34], [tooth * 0.22 + 0.12, 0.62]]); ctx.stroke() }
    setStroke(tertiary, 0.13, 0.02); path(ctx, [[-0.94, 0.28], [-0.76, -0.48], [-0.26, -0.14], [0, -0.66], [0.28, -0.14], [0.78, -0.5], [0.96, 0.28]]); ctx.stroke()
    setStroke(secondary, 0.07, 0.012); ctx.beginPath(); ctx.moveTo(-1.32, 0.3); ctx.lineTo(1.32, 0.3); ctx.stroke()
  } else if (texture === 'silk') {
    for (let stream = -2; stream <= (compact ? 1 : 2); stream += 1) { setStroke(stream === 0 ? tertiary : secondary, stream === 0 ? 0.13 : 0.05, stream === 0 ? 0.019 : 0.009); ctx.beginPath(); ctx.moveTo(-1.34, 0.28 + stream * 0.16); ctx.bezierCurveTo(-0.74, -0.64 + stream * 0.11, 0.32, 0.76 + stream * 0.1, 1.34, -0.26 + stream * 0.12); ctx.stroke() }
    ;[-0.72, -0.38, -0.04, 0.3, 0.64].slice(0, compact ? 4 : 5).forEach((fanX, index) => { setStroke(index === 2 ? tertiary : primary, index === 2 ? 0.12 : 0.045, index === 2 ? 0.018 : 0.008); ctx.beginPath(); ctx.moveTo(-0.88, 0.62); ctx.lineTo(fanX + 0.46, -0.54); ctx.stroke() })
  } else if (texture === 'forest') {
    const branches = [[-1.3, 0.48, -0.62, -0.18], [-0.7, 0.22, -0.22, -0.52], [-0.28, 0.12, 0.34, -0.32], [0.22, 0.3, 1.1, -0.2]]
    branches.slice(0, compact ? 3 : 4).forEach(([x1, y1, x2, y2], index) => { setStroke(index === 2 ? tertiary : secondary, index === 2 ? 0.12 : 0.055, index === 2 ? 0.018 : 0.01); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 0.28, x2, y2); ctx.stroke() })
    ;[[0.5, -0.52], [0.74, -0.64], [0.96, -0.48]].slice(0, compact ? 2 : 3).forEach(([birdX, birdY], index) => { setStroke(index === 1 ? tertiary : primary, index === 1 ? 0.13 : 0.05, index === 1 ? 0.018 : 0.009); ctx.beginPath(); ctx.arc(birdX - 0.06, birdY, 0.08, Math.PI, Math.PI * 2); ctx.arc(birdX + 0.06, birdY, 0.08, Math.PI, Math.PI * 2); ctx.stroke() })
  } else if (texture === 'botanical') {
    for (let petal = 0; petal < (compact ? 6 : 10); petal += 1) { const angle = petal * Math.PI * 2 / (compact ? 6 : 10); ctx.save(); ctx.rotate(angle); setStroke(petal % 3 === 0 ? tertiary : secondary, petal % 3 === 0 ? 0.13 : 0.055, petal % 3 === 0 ? 0.019 : 0.01); ellipse(ctx, 0, -0.52, 0.18, 0.46, 0); ctx.stroke(); ctx.restore() }
    setStroke(primary, 0.045, 0.008); for (let vein = -3; vein <= 3; vein += 1) { ctx.beginPath(); ctx.moveTo(-1.34, vein * 0.2); ctx.bezierCurveTo(-0.58, vein * 0.12 - 0.26, 0.48, vein * 0.22 + 0.24, 1.34, vein * 0.14); ctx.stroke() }
  } else if (texture === 'curse') {
    ;[0.42, 0.7, 0.98].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.14 : 0.052, index === 1 ? 0.02 : 0.009); ctx.setLineDash(index === 2 ? [0.08, 0.08] : []); ellipse(ctx, 0, 0, radius, radius * 0.72, 0.08); ctx.stroke() })
    ctx.setLineDash([]); setStroke(primary, 0.07, 0.012); for (let link = 0; link < (compact ? 6 : 9); link += 1) { ellipse(ctx, -1.18 + link * 0.29, 0.46 - (link % 2) * 0.12, 0.14, 0.075, -0.16); ctx.stroke() }
    setStroke(tertiary, 0.12, 0.018); ctx.beginPath(); ctx.arc(0.48, -0.28, 0.34, -1.38, 1.42); ctx.stroke()
  } else if (texture === 'wuxing') {
    for (let stream = -2; stream <= (compact ? 1 : 2); stream += 1) { setStroke(stream === 0 ? tertiary : secondary, stream === 0 ? 0.13 : 0.05, stream === 0 ? 0.019 : 0.009); ctx.beginPath(); ctx.moveTo(-1.36, -0.2 + stream * 0.17); ctx.bezierCurveTo(-0.72, 0.72 + stream * 0.1, 0.42, -0.7 + stream * 0.12, 1.36, 0.2 + stream * 0.14); ctx.stroke() }
    setStroke(primary, 0.06, 0.011); ctx.beginPath(); ctx.moveTo(-0.78, 0.58); ctx.lineTo(0.84, -0.52); ctx.moveTo(-0.46, 0.62); ctx.lineTo(1.08, -0.38); ctx.stroke()
  } else if (texture === 'shambali') {
    ;[0.36, 0.64, 0.94].slice(0, compact ? 2 : 3).forEach((radius, index) => { setStroke(index === 1 ? tertiary : secondary, index === 1 ? 0.14 : 0.05, index === 1 ? 0.019 : 0.009); polygon(ctx, radius, index === 0 ? 8 : 12, index * 0.07); ctx.stroke() })
    for (let bead = 0; bead < (compact ? 8 : 12); bead += 1) { const angle = bead * Math.PI * 2 / (compact ? 8 : 12); ctx.fillStyle = colorToRgba(bead % 3 === 0 ? tertiary : secondary, alpha(bead % 3 === 0 ? 0.14 : 0.06)); ctx.beginPath(); ctx.arc(Math.cos(angle) * 0.98, Math.sin(angle) * 0.7, bead % 3 === 0 ? 0.045 : 0.03, 0, Math.PI * 2); ctx.fill() }
  } else if (texture === 'sound') {
    for (let bar = -5; bar <= 5; bar += 1) {
      const barHeight = 0.24 + (Math.abs(bar * 7) % 4) * 0.14
      setStroke(bar === 0 ? secondary : primary, bar === 0 ? 0.12 : 0.05, bar === 0 ? 0.025 : 0.014)
      ctx.beginPath()
      ctx.moveTo(bar * 0.21, -barHeight)
      ctx.lineTo(bar * 0.21, barHeight)
      ctx.stroke()
    }
  } else {
    for (let arc = 1; arc <= limit; arc += 1) {
      setStroke(arc === 2 ? secondary : primary, arc === 2 ? 0.1 : 0.045, arc === 2 ? 0.016 : 0.009)
      ctx.beginPath()
      ctx.arc(0, 0, 0.58 + arc * 0.22, Math.PI * 1.04, Math.PI * 1.94)
      ctx.stroke()
    }
  }
}

function drawHeroEmblem(ctx, emblem, primary, secondary, tertiary, alpha) {
  const setStroke = (color = secondary, opacity = 0.22, width = 0.026) => {
    ctx.strokeStyle = colorToRgba(color, alpha(opacity))
    ctx.lineWidth = width
  }
  const setFill = (color = secondary, opacity = 0.08) => {
    ctx.fillStyle = colorToRgba(color, alpha(opacity))
  }
  const stroke = (color, opacity, width) => {
    setStroke(color, opacity, width)
    ctx.stroke()
  }

  if (emblem === 'corporate-diamond') {
    ;[0.9, 0.64, 0.38].forEach((radius, index) => {
      polygon(ctx, radius, 4, Math.PI / 4)
      stroke(index === 1 ? secondary : primary, index === 1 ? 0.27 : 0.12, index === 1 ? 0.034 : 0.018)
    })
    setStroke(secondary, 0.2, 0.025)
    ctx.beginPath(); ctx.moveTo(-0.9, 0); ctx.lineTo(0.9, 0); ctx.moveTo(0, -0.9); ctx.lineTo(0, 0.9); ctx.stroke()
  } else if (emblem === 'gauntlet-evolution') {
    ;[-0.54, -0.18, 0.18, 0.54].forEach((knuckle, index) => {
      setStroke(index === 2 ? secondary : primary, index === 2 ? 0.28 : 0.14, index === 2 ? 0.036 : 0.022)
      ctx.strokeRect(knuckle - 0.13, -0.72 + Math.abs(index - 1.5) * 0.06, 0.26, 0.38)
    })
    path(ctx, [[-0.7, -0.28], [0.68, -0.28], [0.52, 0.62], [0.06, 0.9], [-0.48, 0.58]], true)
    stroke(secondary, 0.24, 0.034)
    setStroke(primary, 0.12, 0.018); ctx.beginPath(); ctx.moveTo(-0.42, 0.12); ctx.lineTo(0.46, 0.52); ctx.stroke()
  } else if (emblem === 'arcade-star') {
    star(ctx, 0.86, 0.38, 5)
    stroke(secondary, 0.24, 0.032)
    setStroke(primary, 0.14, 0.022); ctx.beginPath(); ctx.moveTo(-0.62, 0.48); ctx.lineTo(-0.28, 0.48); ctx.moveTo(-0.45, 0.31); ctx.lineTo(-0.45, 0.65); ctx.stroke()
    setFill(primary, 0.14); ctx.beginPath(); ctx.arc(0.36, 0.43, 0.08, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0.57, 0.3, 0.08, 0, Math.PI * 2); ctx.fill()
  } else if (emblem === 'command-shield') {
    path(ctx, [[0, -0.92], [0.68, -0.56], [0.58, 0.38], [0, 0.92], [-0.58, 0.38], [-0.68, -0.56]], true)
    stroke(secondary, 0.25, 0.034)
    ;[[-0.34, -0.18], [0, -0.38], [0.34, -0.18], [-0.2, 0.28], [0.2, 0.28]].forEach(([x, y]) => {
      setFill(primary, 0.14); ctx.beginPath(); ctx.arc(x, y, 0.08, 0, Math.PI * 2); ctx.fill()
    })
    setStroke(primary, 0.13, 0.018); ctx.beginPath(); ctx.moveTo(-0.34, -0.18); ctx.lineTo(0, -0.38); ctx.lineTo(0.34, -0.18); ctx.lineTo(0.2, 0.28); ctx.lineTo(-0.2, 0.28); ctx.closePath(); ctx.stroke()
  } else if (emblem === 'crystal-spike') {
    path(ctx, [[0, -1], [0.22, -0.38], [0.74, -0.58], [0.52, -0.08], [0.96, 0.3], [0.3, 0.36], [0.12, 0.96], [-0.22, 0.42], [-0.82, 0.68], [-0.54, 0.08], [-0.92, -0.28], [-0.28, -0.34]], true)
    stroke(secondary, 0.25, 0.034)
    setStroke(primary, 0.13, 0.018); ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0.12, 0.96); ctx.moveTo(-0.82, 0.68); ctx.lineTo(0.74, -0.58); ctx.stroke()
  } else if (emblem === 'junker-crown') {
    path(ctx, [[-0.9, 0.5], [-0.72, -0.54], [-0.22, -0.12], [0, -0.88], [0.26, -0.12], [0.76, -0.58], [0.9, 0.5]], true)
    stroke(secondary, 0.25, 0.034)
    setStroke(primary, 0.14, 0.022); ctx.beginPath(); ctx.moveTo(-0.82, 0.22); ctx.lineTo(0.82, 0.22); ctx.moveTo(-0.48, 0.52); ctx.lineTo(0.48, -0.5); ctx.stroke()
  } else if (emblem === 'twin-heart') {
    ;[-0.28, 0.28].forEach((offset, index) => {
      setStroke(index === 0 ? secondary : primary, index === 0 ? 0.25 : 0.17, index === 0 ? 0.034 : 0.024)
      ctx.beginPath(); ctx.moveTo(offset, 0.82); ctx.bezierCurveTo(offset - 0.88, 0.22, offset - 0.62, -0.64, offset, -0.16); ctx.bezierCurveTo(offset + 0.62, -0.64, offset + 0.88, 0.22, offset, 0.82); ctx.stroke()
    })
    setStroke(secondary, 0.18, 0.022); ctx.beginPath(); ctx.moveTo(-0.92, 0.06); ctx.lineTo(-0.38, 0.06); ctx.lineTo(-0.2, -0.32); ctx.lineTo(0.02, 0.38); ctx.lineTo(0.26, -0.12); ctx.lineTo(0.92, -0.12); ctx.stroke()
  } else if (emblem === 'guardian-spear') {
    setStroke(secondary, 0.25, 0.034); ctx.beginPath(); ctx.moveTo(0, -0.94); ctx.lineTo(0, 0.94); ctx.stroke()
    path(ctx, [[0, -1.02], [0.18, -0.72], [0, -0.54], [-0.18, -0.72]], true); stroke(primary, 0.18, 0.024)
    ;[0.38, 0.62, 0.86].forEach((radius, index) => { ctx.beginPath(); ctx.arc(0, 0.08, radius, Math.PI * 1.08, Math.PI * 1.92); stroke(index === 1 ? secondary : primary, index === 1 ? 0.21 : 0.11, index === 1 ? 0.028 : 0.016) })
  } else if (emblem === 'ravager-mask') {
    ;[0.94, 0.7].forEach((radius, index) => { ctx.beginPath(); ctx.arc(0, 0, radius, -Math.PI * 0.82, Math.PI * 0.82); stroke(index === 0 ? secondary : tertiary, index === 0 ? 0.16 : 0.22, index === 0 ? 0.022 : 0.03) })
    path(ctx, [[0, -0.88], [0.54, -0.5], [0.62, 0.22], [0.3, 0.78], [0, 0.54], [-0.3, 0.78], [-0.62, 0.22], [-0.54, -0.5]], true)
    stroke(secondary, 0.24, 0.034)
    setStroke(tertiary, 0.22, 0.028); ctx.beginPath(); ctx.moveTo(0, -1.02); ctx.lineTo(0, 0.94); ctx.stroke()
    ;[-1, 1].forEach(direction => {
      setStroke(direction < 0 ? primary : secondary, direction < 0 ? 0.12 : 0.18, direction < 0 ? 0.018 : 0.024)
      ctx.beginPath(); ctx.moveTo(direction * 0.12, -0.24); ctx.lineTo(direction * 0.48, -0.08); ctx.lineTo(direction * 0.22, 0.08); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(direction * 0.42, 0.38); ctx.lineTo(direction * 0.84, 0.7); ctx.stroke()
    })
    for (let bead = -2; bead <= 2; bead += 1) { setFill(bead === 0 ? tertiary : secondary, bead === 0 ? 0.18 : 0.1); ctx.beginPath(); ctx.arc(bead * 0.22, 0.88 - Math.abs(bead) * 0.05, bead === 0 ? 0.06 : 0.04, 0, Math.PI * 2); ctx.fill() }
  } else if (emblem === 'crusader-crest') {
    path(ctx, [[0, -0.96], [0.72, -0.56], [0.56, 0.38], [0, 0.94], [-0.56, 0.38], [-0.72, -0.56]], true)
    stroke(secondary, 0.25, 0.034)
    setStroke(primary, 0.17, 0.024); ctx.beginPath(); ctx.moveTo(0, -0.66); ctx.lineTo(0, 0.58); ctx.moveTo(-0.46, -0.22); ctx.lineTo(0.46, -0.22); ctx.stroke()
  } else if (emblem === 'respirator-chain') {
    path(ctx, [[-0.48, -0.5], [0.48, -0.5], [0.34, 0.34], [0, 0.64], [-0.34, 0.34]], true)
    stroke(secondary, 0.24, 0.034)
    ;[-1, 1].forEach(direction => { ctx.beginPath(); ctx.arc(direction * 0.58, 0.12, 0.25, 0, Math.PI * 2); stroke(direction < 0 ? secondary : primary, 0.16, 0.022) })
    for (let link = -2; link <= 2; link += 1) { ellipse(ctx, link * 0.38, 0.86 - Math.abs(link) * 0.08, 0.2, 0.11, link % 2 ? 0.45 : -0.45); stroke(link === 0 ? secondary : primary, link === 0 ? 0.2 : 0.1, link === 0 ? 0.028 : 0.016) }
  } else if (emblem === 'gravity-score') {
    for (let staff = -2; staff <= 2; staff += 1) { setStroke(staff === 0 ? secondary : primary, staff === 0 ? 0.18 : 0.09, staff === 0 ? 0.024 : 0.012); ctx.beginPath(); ctx.moveTo(-0.95, staff * 0.16); ctx.lineTo(0.95, staff * 0.16); ctx.stroke() }
    ;[[0.54, 0.25], [0.82, 0.38]].forEach(([radiusX, radiusY], index) => { ellipse(ctx, 0, 0, radiusX, radiusY, index ? 0.28 : -0.2); stroke(index ? secondary : primary, index ? 0.22 : 0.13, index ? 0.03 : 0.018) })
    setFill(secondary, 0.16); ctx.fillRect(0.28, -0.48, 0.12, 0.12); ctx.fillRect(0.36, -0.78, 0.035, 0.32)
  } else if (emblem === 'lunar-glasses') {
    ;[-0.38, 0.38].forEach((offset, index) => { ctx.beginPath(); ctx.arc(offset, 0, 0.32, 0, Math.PI * 2); stroke(index === 0 ? secondary : primary, index === 0 ? 0.24 : 0.17, index === 0 ? 0.032 : 0.024) })
    setStroke(secondary, 0.18, 0.024); ctx.beginPath(); ctx.moveTo(-0.06, 0); ctx.lineTo(0.06, 0); ctx.moveTo(-0.7, 0); ctx.lineTo(-0.94, -0.18); ctx.moveTo(0.7, 0); ctx.lineTo(0.94, -0.18); ctx.stroke()
    ctx.beginPath(); ctx.arc(0, 0, 0.94, Math.PI * 1.08, Math.PI * 1.92); stroke(primary, 0.12, 0.018)
  } else if (emblem === 'hamster-wheel') {
    ;[0.9, 0.66].forEach((radius, index) => { ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); stroke(index === 0 ? secondary : primary, index === 0 ? 0.23 : 0.14, index === 0 ? 0.032 : 0.02) })
    for (let spoke = 0; spoke < 6; spoke += 1) { const angle = (spoke / 6) * Math.PI * 2; setStroke(primary, 0.1, 0.016); ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22); ctx.lineTo(Math.cos(angle) * 0.66, Math.sin(angle) * 0.66); ctx.stroke() }
    ;[-0.2, 0.2].forEach(offset => { ctx.beginPath(); ctx.arc(offset, -0.18, 0.18, Math.PI, Math.PI * 2); stroke(secondary, 0.16, 0.022) })
  } else if (emblem === 'barbell-star') {
    star(ctx, 0.58, 0.25, 5); stroke(secondary, 0.22, 0.03)
    setStroke(primary, 0.18, 0.026); ctx.beginPath(); ctx.moveTo(-0.98, 0); ctx.lineTo(0.98, 0); ctx.stroke()
    ;[-0.82, -0.66, 0.66, 0.82].forEach(offset => { setStroke(offset < 0 ? secondary : primary, 0.14, 0.05); ctx.beginPath(); ctx.moveTo(offset, -0.26); ctx.lineTo(offset, 0.26); ctx.stroke() })
  } else if (emblem === 'zhuque-fan') {
    ctx.beginPath(); ctx.arc(0, 0.46, 0.94, Math.PI * 1.08, Math.PI * 1.92); stroke(secondary, 0.24, 0.032)
    for (let rib = -3; rib <= 3; rib += 1) { const angle = -Math.PI / 2 + rib * 0.2; setStroke(rib === 0 ? secondary : primary, rib === 0 ? 0.18 : 0.1, rib === 0 ? 0.024 : 0.014); ctx.beginPath(); ctx.moveTo(0, 0.46); ctx.lineTo(Math.cos(angle) * 0.88, 0.46 + Math.sin(angle) * 0.88); ctx.stroke() }
    path(ctx, [[0, -0.96], [0.2, -0.54], [0.04, -0.3], [-0.16, -0.54]], true); stroke(primary, 0.18, 0.024)
  } else if (emblem === 'deadlock-rose') {
    ;[0.72, 0.5, 0.3].forEach((radius, index) => { ctx.beginPath(); ctx.arc(0, -0.04, radius, -0.5 + index * 0.7, Math.PI * 1.6 + index * 0.7); stroke(index === 1 ? secondary : primary, index === 1 ? 0.22 : 0.12, index === 1 ? 0.03 : 0.018) })
    setStroke(secondary, 0.18, 0.024); ctx.beginPath(); ctx.moveTo(0, 0.5); ctx.lineTo(-0.18, 0.96); ctx.moveTo(-0.1, 0.76); ctx.lineTo(-0.48, 0.68); ctx.stroke()
    path(ctx, [[0.48, -0.7], [0.7, -0.5], [0.54, -0.24], [0.32, -0.5]], true); stroke(primary, 0.14, 0.02)
  } else if (emblem === 'bird-branch') {
    path(ctx, [[-0.82, 0.02], [-0.38, -0.48], [-0.04, -0.2], [0.22, -0.62], [0.38, -0.08], [0.84, 0.08], [0.24, 0.22], [-0.12, 0.58], [-0.3, 0.2]], true)
    stroke(secondary, 0.23, 0.032)
    setStroke(primary, 0.15, 0.022); ctx.beginPath(); ctx.moveTo(-0.94, 0.7); ctx.quadraticCurveTo(0, 0.46, 0.94, 0.72); ctx.stroke()
  } else if (emblem === 'spur-sun') {
    ctx.beginPath(); ctx.arc(0, 0, 0.54, 0, Math.PI * 2); stroke(secondary, 0.23, 0.032)
    for (let spur = 0; spur < 8; spur += 1) { const angle = (spur / 8) * Math.PI * 2; setStroke(spur === 0 ? secondary : primary, spur === 0 ? 0.19 : 0.11, spur === 0 ? 0.024 : 0.015); ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 0.62, Math.sin(angle) * 0.62); ctx.lineTo(Math.cos(angle) * 0.94, Math.sin(angle) * 0.94); ctx.stroke() }
    setStroke(primary, 0.16, 0.022); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.26, -0.34); ctx.moveTo(0, 0); ctx.lineTo(-0.36, 0.16); ctx.stroke()
  } else if (emblem === 'adaptive-echo') {
    ;[0.92, 0.68, 0.44].forEach((radius, index) => { polygon(ctx, radius, 6, Math.PI / 6); stroke(index === 1 ? secondary : primary, index === 1 ? 0.22 : 0.11, index === 1 ? 0.03 : 0.017) })
    ;[-1, 1].forEach(direction => { path(ctx, [[direction * 0.18, -0.12], [direction * 0.88, -0.58], [direction * 0.62, 0.34], [direction * 0.2, 0.56]], true); stroke(direction < 0 ? secondary : primary, 0.14, 0.02) })
  } else if (emblem === 'broken-protocol') {
    path(ctx, [[-0.72, -0.78], [-0.08, -0.92], [-0.16, -0.18], [0.02, -0.04], [-0.12, 0.18], [-0.02, 0.92], [-0.72, 0.72]], true); stroke(secondary, 0.23, 0.032)
    path(ctx, [[0.72, -0.78], [0.08, -0.92], [0.16, -0.18], [-0.02, -0.04], [0.12, 0.18], [0.02, 0.92], [0.72, 0.72]], true); stroke(primary, 0.17, 0.024)
    setStroke(primary, 0.13, 0.017); ctx.setLineDash([0.12, 0.08]); ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 1); ctx.stroke(); ctx.setLineDash([])
  } else if (emblem === 'bounty-crossbow') {
    setStroke(secondary, 0.24, 0.034); ctx.beginPath(); ctx.moveTo(-0.92, -0.18); ctx.quadraticCurveTo(0, 0.52, 0.92, -0.18); ctx.stroke()
    setStroke(primary, 0.17, 0.024); ctx.beginPath(); ctx.moveTo(-0.92, -0.18); ctx.lineTo(0.92, -0.18); ctx.moveTo(0, -0.82); ctx.lineTo(0, 0.92); ctx.stroke()
    path(ctx, [[0, -0.96], [-0.12, -0.7], [0.12, -0.7]], true); stroke(secondary, 0.19, 0.024)
  } else if (emblem === 'cyber-dragon') {
    setStroke(secondary, 0.24, 0.034); ctx.beginPath(); ctx.moveTo(-0.86, 0.6); ctx.bezierCurveTo(-0.32, -0.88, 0.22, 0.84, 0.82, -0.56); ctx.stroke()
    path(ctx, [[0.82, -0.56], [0.48, -0.54], [0.68, -0.22]], true); stroke(primary, 0.17, 0.024)
    setStroke(primary, 0.14, 0.02); ctx.beginPath(); ctx.moveTo(-0.72, 0.82); ctx.lineTo(0.68, -0.84); ctx.stroke()
  } else if (emblem === 'penitent-bow') {
    setStroke(secondary, 0.24, 0.034); ctx.beginPath(); ctx.arc(-0.18, 0, 0.82, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke()
    setStroke(primary, 0.17, 0.024); ctx.beginPath(); ctx.moveTo(-0.18, -0.82); ctx.lineTo(-0.18, 0.82); ctx.moveTo(-0.72, 0); ctx.lineTo(0.92, 0); ctx.stroke()
    path(ctx, [[0.94, 0], [0.62, -0.16], [0.62, 0.16]], true); stroke(secondary, 0.18, 0.022)
  } else if (emblem === 'fuse-bomb') {
    ctx.beginPath(); ctx.arc(-0.08, 0.16, 0.62, 0, Math.PI * 2); stroke(secondary, 0.24, 0.034)
    setStroke(primary, 0.16, 0.022); ctx.beginPath(); ctx.moveTo(0.28, -0.34); ctx.quadraticCurveTo(0.62, -0.8, 0.88, -0.5); ctx.stroke()
    for (let spark = 0; spark < 5; spark += 1) { const angle = -1.02 + spark * 0.3; setStroke(spark === 2 ? secondary : primary, spark === 2 ? 0.19 : 0.11, spark === 2 ? 0.024 : 0.015); ctx.beginPath(); ctx.moveTo(0.88, -0.5); ctx.lineTo(0.88 + Math.cos(angle) * 0.28, -0.5 + Math.sin(angle) * 0.28); ctx.stroke() }
  } else if (emblem === 'cryo-beacon') {
    setStroke(secondary, 0.23, 0.032)
    for (let branch = 0; branch < 6; branch += 1) { const angle = (branch / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * 0.82, Math.sin(angle) * 0.82); ctx.stroke() }
    ctx.strokeRect(-0.2, -0.28, 0.4, 0.56)
    setStroke(primary, 0.15, 0.02); ctx.beginPath(); ctx.moveTo(0, -0.96); ctx.lineTo(0, -0.74); ctx.stroke()
  } else if (emblem === 'raptora-wing') {
    setStroke(secondary, 0.24, 0.034); ctx.beginPath(); ctx.moveTo(-0.06, -0.88); ctx.lineTo(-0.06, 0.92); ctx.stroke()
    ;[-1, 1].forEach(direction => { for (let feather = 0; feather < 4; feather += 1) { path(ctx, [[direction * 0.1, -0.42 + feather * 0.22], [direction * (0.5 + feather * 0.12), -0.72 + feather * 0.18], [direction * (0.34 + feather * 0.1), -0.2 + feather * 0.26]], true); stroke(direction < 0 ? secondary : primary, feather === 1 ? 0.17 : 0.1, feather === 1 ? 0.024 : 0.016) } })
  } else if (emblem === 'wraith-skull') {
    path(ctx, [[0, -0.94], [0.54, -0.7], [0.76, -0.08], [0.42, 0.5], [0.2, 0.42], [0.14, 0.82]], false); stroke(secondary, 0.26, 0.036)
    path(ctx, [[0, -0.94], [-0.54, -0.7], [-0.76, -0.08], [-0.42, 0.5], [-0.2, 0.42], [-0.14, 0.82]], false); stroke(primary, 0.16, 0.024)
    ;[-0.28, 0.28].forEach(offset => { setFill(tertiary, 0.17); path(ctx, [[offset - 0.16, -0.22], [offset + 0.16, -0.16], [offset + 0.08, 0.02], [offset - 0.13, -0.03]], true); ctx.fill() })
    setStroke(tertiary, 0.18, 0.021); path(ctx, [[-0.54, -0.66], [-0.12, -0.18], [-0.3, 0.1], [0.18, 0.38], [0.04, 0.72]]); ctx.stroke()
    ;[-1, 1].forEach(direction => { setStroke(direction < 0 ? secondary : primary, 0.12, 0.018); ctx.beginPath(); ctx.moveTo(direction * 0.22, 0.36); ctx.quadraticCurveTo(direction * 0.76, 0.2, direction * 0.98, 0.72); ctx.stroke() })
  } else if (emblem === 'rail-map') {
    setStroke(secondary, 0.24, 0.034); ctx.beginPath(); ctx.moveTo(-0.94, 0.62); ctx.lineTo(-0.44, -0.34); ctx.lineTo(0.16, 0.08); ctx.lineTo(0.92, -0.66); ctx.stroke()
    ;[[-0.44, -0.34], [0.16, 0.08], [0.92, -0.66]].forEach(([x, y], index) => { ctx.beginPath(); ctx.arc(x, y, index === 1 ? 0.14 : 0.1, 0, Math.PI * 2); stroke(index === 1 ? secondary : primary, index === 1 ? 0.2 : 0.12, index === 1 ? 0.027 : 0.017) })
    setStroke(primary, 0.14, 0.02); ctx.beginPath(); ctx.moveTo(-0.78, -0.78); ctx.lineTo(0.78, 0.78); ctx.stroke()
  } else if (emblem === 'vigil-chevron') {
    path(ctx, [[-0.82, -0.42], [0, 0.46], [0.82, -0.42], [0.62, 0.62], [0, 0.96], [-0.62, 0.62]], true); stroke(secondary, 0.24, 0.034)
    setStroke(primary, 0.16, 0.022); ctx.beginPath(); ctx.moveTo(-0.74, -0.64); ctx.lineTo(0.74, -0.64); ctx.moveTo(-0.44, -0.48); ctx.lineTo(0.44, -0.48); ctx.stroke()
  } else if (emblem === 'summit-drone') {
    path(ctx, [[-0.94, 0.62], [-0.42, -0.18], [-0.12, 0.18], [0.28, -0.72], [0.94, 0.62]], false); stroke(secondary, 0.24, 0.034)
    polygon(ctx, 0.26, 6, Math.PI / 6); stroke(primary, 0.18, 0.024)
    ;[-1, 1].forEach(direction => { setStroke(primary, 0.12, 0.017); ctx.beginPath(); ctx.moveTo(direction * 0.22, 0); ctx.lineTo(direction * 0.72, -0.18); ctx.stroke(); ctx.beginPath(); ctx.arc(direction * 0.78, -0.2, 0.16, 0, Math.PI * 2); ctx.stroke() })
  } else if (emblem === 'hashimoto-mask') {
    path(ctx, [[0, -0.94], [0.62, -0.52], [0.66, 0.28], [0.26, 0.86], [0, 0.62], [-0.26, 0.86], [-0.66, 0.28], [-0.62, -0.52]], true); stroke(secondary, 0.25, 0.034)
    setStroke(primary, 0.13, 0.018); ctx.beginPath(); ctx.moveTo(0, -0.9); ctx.lineTo(0, 0.68); ctx.stroke()
    setStroke(secondary, 0.17, 0.024); ctx.beginPath(); ctx.moveTo(-0.48, -0.2); ctx.quadraticCurveTo(-0.25, -0.34, -0.08, -0.16); ctx.moveTo(-0.34, 0.34); ctx.quadraticCurveTo(-0.16, 0.48, -0.04, 0.3); ctx.stroke()
    setStroke(tertiary, 0.24, 0.03); ctx.beginPath(); ctx.moveTo(0.08, -0.34); ctx.lineTo(0.5, 0.08); ctx.moveTo(0.5, -0.34); ctx.lineTo(0.08, 0.08); ctx.stroke()
    ctx.fillStyle = colorToRgba(tertiary, alpha(0.16)); ctx.fillRect(0.18, 0.42, 0.42, 0.08)
    ctx.setLineDash([0.08, 0.06]); ctx.beginPath(); ctx.arc(0, 0.12, 1.02, Math.PI * 0.08, Math.PI * 0.92); stroke(primary, 0.11, 0.017); ctx.setLineDash([])
  } else if (emblem === 'conspiracy-eye') {
    setStroke(secondary, 0.25, 0.034); ctx.beginPath(); ctx.moveTo(-0.96, 0.02); ctx.quadraticCurveTo(-0.34, -0.68, 0.16, -0.5); ctx.moveTo(0.34, -0.4); ctx.quadraticCurveTo(0.72, -0.22, 0.96, 0.02); ctx.stroke()
    setStroke(primary, 0.15, 0.022); ctx.beginPath(); ctx.moveTo(-0.96, 0.02); ctx.quadraticCurveTo(-0.42, 0.58, -0.08, 0.5); ctx.moveTo(0.14, 0.48); ctx.quadraticCurveTo(0.58, 0.44, 0.96, 0.02); ctx.stroke()
    path(ctx, [[0, -0.28], [0.24, 0.14], [-0.24, 0.14]], true); stroke(tertiary, 0.22, 0.028)
    ;[[-0.74, -0.3, 0.28], [0.48, 0.34, 0.36], [-0.34, 0.58, 0.18]].forEach(([barX, barY, barWidth], index) => { ctx.fillStyle = colorToRgba(index === 1 ? tertiary : secondary, alpha(index === 1 ? 0.14 : 0.08)); ctx.fillRect(barX, barY, barWidth, index === 1 ? 0.05 : 0.03) })
  } else if (emblem === 'utopia-prism') {
    polygon(ctx, 0.86, 6, Math.PI / 6); stroke(secondary, 0.24, 0.034)
    polygon(ctx, 0.56, 3, -Math.PI / 2); stroke(primary, 0.17, 0.024)
    setStroke(primary, 0.12, 0.017); ctx.beginPath(); ctx.moveTo(0, -0.86); ctx.lineTo(0, 0.86); ctx.moveTo(-0.74, 0.43); ctx.lineTo(0.74, -0.43); ctx.moveTo(-0.74, -0.43); ctx.lineTo(0.74, 0.43); ctx.stroke()
  } else if (emblem === 'forge-anvil') {
    path(ctx, [[-0.9, -0.34], [0.82, -0.34], [0.54, -0.04], [0.2, 0.08], [0.18, 0.62], [0.56, 0.82], [-0.56, 0.82], [-0.18, 0.62], [-0.2, 0.08], [-0.58, -0.04]], true); stroke(secondary, 0.24, 0.034)
    for (let tooth = 0; tooth < 8; tooth += 1) { const angle = (tooth / 8) * Math.PI * 2; setStroke(primary, 0.11, 0.016); ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72); ctx.lineTo(Math.cos(angle) * 0.94, Math.sin(angle) * 0.94); ctx.stroke() }
  } else if (emblem === 'chronal-hourglass') {
    path(ctx, [[-0.58, -0.9], [0.58, -0.9], [0.18, -0.1], [0.58, 0.9], [-0.58, 0.9], [-0.18, -0.1]], true); stroke(secondary, 0.24, 0.034)
    ;[0.18, 0.42].forEach((offset, index) => { ctx.save(); ctx.translate(offset, -offset * 0.35); path(ctx, [[-0.58, -0.9], [0.58, -0.9], [0.18, -0.1], [0.58, 0.9], [-0.58, 0.9], [-0.18, -0.1]], true); stroke(primary, index === 0 ? 0.12 : 0.065, index === 0 ? 0.018 : 0.012); ctx.restore() })
  } else if (emblem === 'wolf-gladius') {
    path(ctx, [[-0.72, -0.22], [-0.56, -0.88], [-0.18, -0.56], [0, -0.72], [0.18, -0.56], [0.56, -0.88], [0.72, -0.22], [0.42, 0.6], [0, 0.9], [-0.42, 0.6]], true); stroke(secondary, 0.24, 0.034)
    setStroke(primary, 0.17, 0.024); ctx.beginPath(); ctx.moveTo(0, -0.98); ctx.lineTo(0, 0.84); ctx.moveTo(-0.28, 0.38); ctx.lineTo(0.28, 0.38); ctx.stroke()
  } else if (emblem === 'wayfinder-drill') {
    path(ctx, [[-0.8, -0.34], [0.36, -0.34], [0.92, 0], [0.36, 0.34], [-0.8, 0.34]], true); stroke(secondary, 0.24, 0.034)
    for (let band = -2; band <= 2; band += 1) { setStroke(primary, band === 0 ? 0.17 : 0.1, band === 0 ? 0.024 : 0.015); ctx.beginPath(); ctx.moveTo(-0.52 + band * 0.22, -0.34); ctx.lineTo(-0.26 + band * 0.22, 0.34); ctx.stroke() }
    ctx.beginPath(); ctx.arc(-0.64, 0, 0.48, Math.PI * 0.56, Math.PI * 1.44); stroke(primary, 0.12, 0.018)
  } else if (emblem === 'talon-spider') {
    ;[0.34, 0.62, 0.9].forEach((radius, index) => { ellipse(ctx, 0, 0, radius, radius * 0.72, -0.05); stroke(index === 1 ? secondary : primary, index === 1 ? 0.24 : 0.11, index === 1 ? 0.032 : 0.017) })
    for (let ray = 0; ray < 8; ray += 1) { const angle = -Math.PI / 2 + (ray / 8) * Math.PI * 2; setStroke(ray === 0 ? tertiary : ray % 2 === 0 ? secondary : primary, ray === 0 ? 0.22 : ray % 2 === 0 ? 0.14 : 0.08, ray === 0 ? 0.028 : 0.016); ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18 * 0.72); ctx.lineTo(Math.cos(angle) * 1.02, Math.sin(angle) * 1.02 * 0.72); ctx.stroke() }
    setFill(tertiary, 0.2); ctx.beginPath(); ctx.arc(0, 0, 0.075, 0, Math.PI * 2); ctx.fill()
  } else if (emblem === 'amari-eye') {
    path(ctx, [[-0.94, 0], [0, -0.58], [0.94, 0], [0, 0.58]], true); stroke(secondary, 0.24, 0.034)
    ctx.beginPath(); ctx.arc(0, 0, 0.22, 0, Math.PI * 2); stroke(primary, 0.18, 0.024)
    setStroke(primary, 0.14, 0.02); ctx.beginPath(); ctx.moveTo(-0.82, 0.68); ctx.lineTo(0.86, -0.62); ctx.stroke()
  } else if (emblem === 'deserter-lamp') {
    polygon(ctx, 0.7, 6, Math.PI / 6); stroke(secondary, 0.24, 0.034)
    setStroke(primary, 0.17, 0.024); ctx.beginPath(); ctx.moveTo(0, -0.7); ctx.lineTo(0, 0.7); ctx.moveTo(-0.6, -0.35); ctx.lineTo(0.6, 0.35); ctx.moveTo(-0.6, 0.35); ctx.lineTo(0.6, -0.35); ctx.stroke()
    ctx.setLineDash([0.12, 0.09]); ctx.beginPath(); ctx.arc(0, 0, 0.98, Math.PI * 0.12, Math.PI * 1.54); stroke(primary, 0.11, 0.017); ctx.setLineDash([])
  } else if (emblem === 'squire-shield') {
    path(ctx, [[0, -0.92], [0.7, -0.5], [0.54, 0.4], [0, 0.92], [-0.54, 0.4], [-0.7, -0.5]], true); stroke(secondary, 0.24, 0.034)
    setStroke(primary, 0.17, 0.024); ctx.beginPath(); ctx.moveTo(-0.72, 0.7); ctx.lineTo(0.62, -0.72); ctx.stroke(); ctx.beginPath(); ctx.arc(0.66, -0.76, 0.16, 0, Math.PI * 2); ctx.stroke()
  } else if (emblem === 'fractured-sun') {
    for (let segment = 0; segment < 10; segment += 1) { const start = (segment / 10) * Math.PI * 2 + 0.05; const end = start + 0.42; setStroke(segment === 3 ? secondary : primary, segment === 3 ? 0.24 : 0.13, segment === 3 ? 0.034 : 0.019); ctx.beginPath(); ctx.arc(0, 0, segment % 2 ? 0.7 : 0.82, start, end); ctx.stroke() }
    setStroke(secondary, 0.18, 0.024); ctx.beginPath(); ctx.moveTo(-0.16, -0.9); ctx.lineTo(0.08, -0.14); ctx.lineTo(-0.12, 0.12); ctx.lineTo(0.18, 0.9); ctx.stroke()
  } else if (emblem === 'paw-propeller') {
    setFill(secondary, 0.16); ctx.beginPath(); ctx.arc(0, 0.28, 0.28, 0, Math.PI * 2); ctx.fill()
    ;[[-0.44, -0.08], [-0.16, -0.36], [0.16, -0.36], [0.44, -0.08]].forEach(([x, y], index) => { setFill(index === 1 ? secondary : primary, index === 1 ? 0.17 : 0.11); ctx.beginPath(); ctx.arc(x, y, 0.16, 0, Math.PI * 2); ctx.fill() })
    for (let blade = 0; blade < 3; blade += 1) { ctx.save(); ctx.rotate((blade / 3) * Math.PI * 2); ellipse(ctx, 0, -0.72, 0.18, 0.42, 0.08); stroke(blade === 0 ? secondary : primary, blade === 0 ? 0.2 : 0.12, blade === 0 ? 0.028 : 0.018); ctx.restore() }
  } else if (emblem === 'mars-orbit') {
    ctx.beginPath(); ctx.arc(0, 0, 0.54, 0, Math.PI * 2); stroke(secondary, 0.24, 0.034)
    ellipse(ctx, 0, 0, 0.98, 0.38, -0.24); stroke(primary, 0.15, 0.021)
    ;[[-0.84, 0.2], [0.7, -0.28], [0.16, 0.52]].forEach(([x, y], index) => { setFill(index === 1 ? secondary : primary, index === 1 ? 0.18 : 0.11); ctx.beginPath(); ctx.arc(x, y, index === 1 ? 0.1 : 0.07, 0, Math.PI * 2); ctx.fill() })
  } else if (emblem === 'yokai-torii') {
    setStroke(secondary, 0.24, 0.034); ctx.beginPath(); ctx.moveTo(-0.9, -0.66); ctx.lineTo(0.9, -0.66); ctx.moveTo(-0.72, -0.48); ctx.lineTo(0.72, -0.48); ctx.moveTo(-0.52, -0.66); ctx.lineTo(-0.42, 0.86); ctx.moveTo(0.52, -0.66); ctx.lineTo(0.42, 0.86); ctx.stroke()
    path(ctx, [[-0.32, -0.04], [0, -0.36], [0.32, -0.04], [0.18, 0.38], [0, 0.62], [-0.18, 0.38]], true); stroke(primary, 0.17, 0.024)
  } else if (emblem === 'biolight-lotus') {
    for (let petal = 0; petal < 6; petal += 1) { ctx.save(); ctx.rotate((petal / 6) * Math.PI * 2); ellipse(ctx, 0, -0.42, 0.2, 0.48); stroke(petal % 2 === 0 ? secondary : primary, petal % 2 === 0 ? 0.2 : 0.11, petal % 2 === 0 ? 0.028 : 0.017); ctx.restore() }
    setStroke(primary, 0.14, 0.02); ctx.beginPath(); ctx.moveTo(-0.84, -0.78); ctx.bezierCurveTo(-0.22, -0.34, 0.22, 0.34, 0.84, 0.78); ctx.moveTo(0.84, -0.78); ctx.bezierCurveTo(0.22, -0.34, -0.22, 0.34, -0.84, 0.78); ctx.stroke()
  } else if (emblem === 'rio-equalizer') {
    for (let bar = -4; bar <= 4; bar += 1) { const barHeight = 0.28 + ((Math.abs(bar) * 5) % 4) * 0.16; setStroke(bar === 0 ? secondary : primary, bar === 0 ? 0.23 : 0.13, bar === 0 ? 0.034 : 0.019); ctx.beginPath(); ctx.moveTo(bar * 0.2, -barHeight); ctx.lineTo(bar * 0.2, barHeight); ctx.stroke() }
    ctx.beginPath(); ctx.arc(0, 0, 0.96, Math.PI * 1.08, Math.PI * 1.92); stroke(secondary, 0.15, 0.021)
  } else if (emblem === 'valkyrie-caduceus') {
    setStroke(secondary, 0.24, 0.034); ctx.beginPath(); ctx.moveTo(0, -0.94); ctx.lineTo(0, 0.9); ctx.stroke()
    ;[-1, 1].forEach(direction => { path(ctx, [[direction * 0.08, -0.28], [direction * 0.7, -0.72], [direction * 0.92, -0.2], [direction * 0.38, 0.24]], true); stroke(direction < 0 ? secondary : primary, 0.16, 0.022) })
    setStroke(primary, 0.14, 0.02); ctx.beginPath(); ctx.moveTo(-0.42, 0.18); ctx.bezierCurveTo(0.42, 0.38, -0.42, 0.62, 0.42, 0.82); ctx.stroke()
  } else if (emblem === 'fate-kusarigama') {
    ctx.beginPath(); ctx.arc(-0.18, -0.08, 0.62, -Math.PI * 0.48, Math.PI * 0.72); stroke(secondary, 0.24, 0.034)
    for (let link = 0; link < 5; link += 1) { ellipse(ctx, 0.2 + link * 0.18, 0.18 + link * 0.13, 0.13, 0.07, 0.58); stroke(link === 0 ? secondary : primary, link === 0 ? 0.18 : 0.11, link === 0 ? 0.024 : 0.016) }
    path(ctx, [[0.74, 0.58], [0.96, 0.7], [0.78, 0.94], [0.58, 0.78]], true); stroke(primary, 0.15, 0.021)
  } else if (emblem === 'biotic-duality') {
    ;[-0.42, 0.42].forEach((offset, index) => {
      ellipse(ctx, offset, 0, 0.38, 0.54, index ? -0.16 : 0.16); stroke(index === 0 ? secondary : tertiary, index === 0 ? 0.24 : 0.22, index === 0 ? 0.034 : 0.03)
      setFill(index === 0 ? secondary : tertiary, index === 0 ? 0.16 : 0.18); ctx.beginPath(); ctx.arc(offset, index ? -0.16 : 0.16, 0.09, 0, Math.PI * 2); ctx.fill()
    })
    setStroke(secondary, 0.15, 0.021); ctx.beginPath(); ctx.moveTo(-0.94, -0.76); ctx.bezierCurveTo(0.38, -0.36, -0.38, 0.36, 0.94, 0.76); ctx.stroke()
    setStroke(tertiary, 0.17, 0.023); ctx.beginPath(); ctx.moveTo(0.94, -0.76); ctx.bezierCurveTo(-0.38, -0.36, 0.38, 0.36, -0.94, 0.76); ctx.stroke()
    for (let rung = -2; rung <= 2; rung += 1) { setStroke(rung === 0 ? tertiary : primary, rung === 0 ? 0.17 : 0.09, rung === 0 ? 0.022 : 0.014); ctx.beginPath(); ctx.moveTo(rung * 0.18 - 0.16, rung * 0.24); ctx.lineTo(rung * 0.18 + 0.16, -rung * 0.24); ctx.stroke() }
  } else if (emblem === 'water-staff') {
    setStroke(secondary, 0.24, 0.034); ctx.beginPath(); ctx.moveTo(0, -0.94); ctx.lineTo(0, 0.94); ctx.stroke()
    ;[-1, 1].forEach(direction => { ctx.beginPath(); ctx.arc(direction * 0.26, -0.5, 0.28, direction < 0 ? -Math.PI * 0.18 : Math.PI * 0.82, direction < 0 ? Math.PI * 1.18 : Math.PI * 2.18); stroke(direction < 0 ? secondary : primary, 0.16, 0.022) })
    setStroke(primary, 0.14, 0.02); ctx.beginPath(); ctx.moveTo(-0.92, 0.28); ctx.bezierCurveTo(-0.32, -0.2, 0.34, 0.76, 0.92, 0.18); ctx.stroke()
  } else if (emblem === 'iris-orbs') {
    ;[0.38, 0.66, 0.9].forEach((radius, index) => { polygon(ctx, radius, index === 0 ? 8 : 12, index * 0.08); stroke(index === 1 ? secondary : primary, index === 1 ? 0.22 : 0.11, index === 1 ? 0.03 : 0.017) })
    for (let orb = 0; orb < 9; orb += 1) { const angle = (orb / 9) * Math.PI * 2; setFill(orb % 3 === 0 ? secondary : primary, orb % 3 === 0 ? 0.17 : 0.1); ctx.beginPath(); ctx.arc(Math.cos(angle) * 0.76, Math.sin(angle) * 0.76, orb % 3 === 0 ? 0.075 : 0.05, 0, Math.PI * 2); ctx.fill() }
  }
}

export const DIRECTOR_CUT_STORY_SIGNATURES = Object.freeze(Object.fromEntries(
  Object.entries(STORY_ROWS).map(([heroId, row]) => [heroId, Object.freeze({
    heroId,
    id: row[0],
    anchor: row[1],
    emblem: row[2],
    texture: row[3],
    rotation: row[4],
    highlight: row[5] || null
  })])
))

export function getDirectorCutStorySignature(heroId) {
  return DIRECTOR_CUT_STORY_SIGNATURES[String(heroId || '').trim()] || null
}

export function drawDirectorCutStorySignature(ctx, motif, options) {
  const story = motif?.story || getDirectorCutStorySignature(motif?.heroId || motif?.id)
  if (!ctx || !story) return false

  const {
    x,
    y,
    width,
    height,
    centerX = x + width / 2,
    centerY = y + height / 2,
    accent = '#f4c629',
    secondary = motif?.secondary || accent,
    alpha = value => value,
    compact = false,
    showTexture = true,
    showEmblem = true,
    textureStrength = 1,
    emblemStrength = 1,
    unitScale = 1
  } = options
  const resolvedUnitScale = Math.max(0.45, Math.min(1.5, Number(unitScale) || 1))
  const unit = Math.max(18, Math.min(width, height) * (compact ? 0.34 : 0.29) * resolvedUnitScale)

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.translate(centerX, centerY)
  ctx.rotate(Number(story.rotation) || 0)
  ctx.scale(unit, unit)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const tertiary = story.highlight || secondary
  const textureAlpha = value => alpha(value * Math.max(0, Number(textureStrength) || 0))
  const emblemAlpha = value => alpha(value * Math.max(0, Number(emblemStrength) || 0))
  if (showTexture && textureStrength > 0) {
    drawStoryTexture(ctx, story.texture, accent, secondary, tertiary, textureAlpha, compact)
  }
  if (showEmblem && emblemStrength > 0) {
    drawHeroEmblem(ctx, story.emblem, accent, secondary, tertiary, emblemAlpha)
  }

  ctx.restore()
  return true
}
