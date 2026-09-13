const NEUTRAL_SCENE_KINDS = new Set(['cover', 'pause', 'ending', 'organizer'])

function normalizeLocale(locale) {
  const raw = String(locale || '').toLowerCase()
  if (raw.startsWith('en')) return 'en-US'
  if (raw.startsWith('ko')) return 'ko-KR'
  return 'zh-CN'
}

export function isPlayoffReviewScene(scene) {
  if (!scene || scene.kind === 'cover' || scene.kind === 'pause' || scene.kind === 'organizer') return false
  if (scene.seasonAct === 'playoffs' || scene.visualType === 'playoffs') return true

  const heading = [scene.eyebrow, scene.title, scene.subTitle]
    .filter(Boolean)
    .join(' ')
    .toLocaleUpperCase('en-US')
  const startsWithPlayoffHeading = /^(?:PLAYOFFS?|GRAND FINAL)\b/.test(heading)
    || /^(?:季后赛|季后淘汰赛|总决赛|플레이오프|그랜드 파이널)/.test(heading)
  if (startsWithPlayoffHeading) return true

  return (scene.chips || []).slice(0, 12).some(chip => {
    const label = String(chip || '').trim().toLocaleUpperCase('en-US')
    if (/^(?:PLAYOFFS?|季后赛|季后淘汰赛|플레이오프)$/.test(label)) return true
    return /\b(?:UB|LB|WB|LOSERS?|WINNERS?|GRAND FINAL|GF)\b/.test(label)
  })
}

function isPlayoffIntroductionStory(scenes) {
  return scenes.some(scene => {
    if (!scene) return false
    if (String(scene.joinStage || '').toUpperCase() === 'PLAYOFFS') return true
    if (String(scene.rosterStatus || '').toUpperCase() === 'PLAYOFF_INTRODUCTION') return true

    return [scene.title, ...(scene.chips || [])].some(value => {
      const label = String(value || '').trim().toLocaleUpperCase('en-US')
      return label === '季后赛引入'
        || label === 'PLAYOFF INTRODUCTION'
        || label === '플레이오프 합류'
        || /从季后赛这一章开始|BEGINS? IN THE PLAYOFF CHAPTER|플레이오프 챕터에서 시작/.test(label)
    })
  })
}

function hasChapterContent(scenes) {
  return scenes.some(scene => scene && !NEUTRAL_SCENE_KINDS.has(scene.kind))
}

function getActCopy(locale, act) {
  const copy = {
    'zh-CN': {
      qualifier: {
        title: '公开预选赛',
        subTitle: '瑞士轮 · 突围赛',
        body: '从公开赛场开始，每一轮都在决定谁能继续留在画面里。这里保存的是赛季如何被一场场打出来。',
        stages: ['SWISS / 瑞士轮', 'LCQ / 突围赛'],
        cue: '第一卷胶片，从这里开始。'
      },
      playoffs: {
        title: '季后淘汰赛',
        subTitle: '双败淘汰 · 总决赛',
        body: '当赛制进入双败淘汰，每一场对局都更接近结局。胜者继续向前，败者也会留下最后一格画面。',
        stages: ['DOUBLE ELIMINATION', 'GRAND FINAL'],
        cue: '灯光收紧，第二幕开始。'
      }
    },
    'en-US': {
      qualifier: {
        title: 'Open Qualifier',
        subTitle: 'Swiss Stage · Last Chance Qualifier',
        body: 'The season begins in the open field, where every round decides who remains in the picture.',
        stages: ['SWISS STAGE', 'LAST CHANCE QUALIFIER'],
        cue: 'The first reel starts here.'
      },
      playoffs: {
        title: 'Playoff Elimination',
        subTitle: 'Double Elimination · Grand Final',
        body: 'The frame tightens in the double-elimination bracket. Every match now moves closer to the final image.',
        stages: ['DOUBLE ELIMINATION', 'GRAND FINAL'],
        cue: 'Lights down. Act two begins.'
      }
    },
    'ko-KR': {
      qualifier: {
        title: '공개 예선',
        subTitle: '스위스 스테이지 · 최종 진출전',
        body: '공개 무대에서 시작된 매 라운드는 누가 다음 장면에 남을지를 결정했습니다.',
        stages: ['SWISS STAGE', 'LAST CHANCE QUALIFIER'],
        cue: '첫 번째 필름이 여기서 시작됩니다.'
      },
      playoffs: {
        title: '플레이오프 토너먼트',
        subTitle: '더블 엘리미네이션 · 그랜드 파이널',
        body: '더블 엘리미네이션에 들어서면 모든 경기가 마지막 장면에 한 걸음 더 가까워집니다.',
        stages: ['DOUBLE ELIMINATION', 'GRAND FINAL'],
        cue: '조명이 어두워지고, 2막이 시작됩니다.'
      }
    }
  }

  return copy[normalizeLocale(locale)][act]
}

function makeActScene(act, locale) {
  const copy = getActCopy(locale, act)
  const isPlayoffs = act === 'playoffs'

  return {
    kind: 'act',
    visualType: 'actTitle',
    tone: 'gold',
    seasonAct: act,
    actNo: isPlayoffs ? 'II' : 'I',
    actCode: isPlayoffs ? 'ACT 02 / PLAYOFFS' : 'ACT 01 / QUALIFIER',
    eyebrow: isPlayoffs ? 'NOW SHOWING / ACT II' : 'NOW SHOWING / ACT I',
    badge: 'CHAPTER TRANSITION',
    title: copy.title,
    subTitle: copy.subTitle,
    body: copy.body,
    stages: copy.stages,
    cue: copy.cue,
    watermark: isPlayoffs ? 'ACT II' : 'ACT I',
    backgroundWords: isPlayoffs
      ? ['PLAYOFFS', 'BRACKET', 'FINAL', 'REMEMBER']
      : ['QUALIFIER', 'SWISS', 'LCQ', 'BEGIN'],
    excludeFromPoster: true
  }
}

function tagScenes(scenes, seasonAct) {
  return scenes.map(scene => ({ ...scene, seasonAct }))
}

export function buildCinemaReviewScenes(scenes, options = {}) {
  const list = Array.isArray(scenes) ? scenes.filter(Boolean) : []
  if (!options.isRegular || !list.length) return list

  const startsWithCover = list[0]?.kind === 'cover'
  const contentStart = startsWithCover ? 1 : 0
  const playoffIntroduction = isPlayoffIntroductionStory(list)
  const playoffStart = playoffIntroduction
    ? contentStart
    : list.findIndex((scene, index) => index >= contentStart && isPlayoffReviewScene(scene))
  const qualifierEnd = playoffStart >= 0 ? playoffStart : list.length
  const qualifierSlice = list.slice(contentStart, qualifierEnd)
  const playoffSlice = playoffStart >= 0 ? list.slice(playoffStart) : []
  const hasQualifier = hasChapterContent(qualifierSlice)
  const hasPlayoffs = playoffStart >= 0 && hasChapterContent(playoffSlice)
  const firstAct = hasQualifier ? 'qualifier' : hasPlayoffs ? 'playoffs' : 'qualifier'
  const output = []

  if (startsWithCover) output.push({ ...list[0], seasonAct: firstAct })

  if (hasQualifier) {
    output.push(makeActScene('qualifier', options.locale))
    output.push(...tagScenes(qualifierSlice, 'qualifier'))
  }

  if (hasPlayoffs) {
    output.push(makeActScene('playoffs', options.locale))
    output.push(...tagScenes(playoffSlice, 'playoffs'))
  }

  if (!hasQualifier && !hasPlayoffs) {
    output.push(...tagScenes(list.slice(contentStart), firstAct))
  }

  return output.map((scene, index) => ({ ...scene, sceneNo: index + 1 }))
}
