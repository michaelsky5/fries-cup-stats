export function getStatisticalRatingModelNotice(locale = 'zh-CN') {
  return locale === 'en-US'
    ? 'Statistical performance v1.5: references use earlier competition days. Limited references are provisional; hero attribution is unverified.'
    : '统计表现 v1.5：使用此前比赛日参照；少参照分数为暂定，逐英雄统计归属尚未核实。'
}

export function getStatisticalRatingLabel(entry, locale = 'zh-CN') {
  const evidence = entry?.statisticalRating
  if (!evidence) return ''
  const en = locale === 'en-US'
  if (evidence.retrospective) return en ? 'Retrospective statistics' : '回溯统计分'
  return evidence.referenceStage === 'REFERENCE_UNAVAILABLE' ? (en ? 'Unrated statistics' : '统计分缺参照')
    : evidence.provisional ? (en ? 'Provisional statistics' : '暂定统计分') : (en ? 'Statistical score' : '统计表现分')
}

export function getStatisticalRatingNotes(entry, locale = 'zh-CN') {
  const evidence = entry?.statisticalRating
  if (!evidence) return []
  const en = locale === 'en-US'
  const retrospective = evidence.retrospective
  const seasonReference = evidence.seasonReference
  const notes = [seasonReference ? (en
    ? `Season OVR uses eligible published matches through ${seasonReference.throughDay}, compared within each version and role. Each scored match is fully excluded from its own references.`
    : `赛季总评计入截至 ${seasonReference.throughDay} 已发布的有效比赛，按版本与职责比较；每条记录的参照均排除其所在整场比赛。`) : retrospective ? (en
    ? 'Statistical performance v1.5: the same formula and scale, with retrospective references from other matches in the same version group. This entire match is excluded.'
    : '统计表现 v1.5：沿用同一公式与刻度，使用同版本分组的其他比赛回溯评分，整场排除本场数据。')
    : en ? 'Statistical performance v1.5: references use earlier competition days. Tactical contribution is not fully measured.'
      : '统计表现 v1.5：只使用此前比赛日的参照，尚不能完整衡量战术贡献。']
  if (!seasonReference) notes.push(en
    ? 'Ratings use one shared ten-point scale. Match ratings combine scored map performances by playtime.'
    : '评分采用统一的十分制刻度；全场评分按已评分上场时间汇总各图表现。')
  if (retrospective) notes.push(en
    ? `Reference membership is fixed through ${retrospective.throughDay}. These provisional match/map ratings do not enter season OVR or forward validation; tactical contribution is not fully measured.`
    : `参照场次固定在 ${retrospective.throughDay} 及之前。回溯分用于比赛与单图展示，不计入赛季 OVR 或前向验证；尚不能完整衡量战术贡献。`)
  if (evidence.referenceStage === 'REFERENCE_UNAVAILABLE') notes.push(en ? 'No usable reference score; no old score is substituted.' : '缺少可用的评分参照，暂不显示分数。')
  else if (Number.isInteger(evidence.minimumSourceMatches) && evidence.minimumSourceMatches > 0 && evidence.minimumSourceMatches < 5) notes.push(en
    ? `Some active references have only ${evidence.minimumSourceMatches} ${retrospective || seasonReference ? 'other same-version' : 'prior'} matches. Small score differences need caution.`
    : `部分参照来源仅有${retrospective || seasonReference ? '同版本其他' : '此前'} ${evidence.minimumSourceMatches} 场比赛，小分差需谨慎解读。`)
  else if (evidence.provisional && !retrospective) notes.push(en ? 'Reference maturity or scoring coverage remains incomplete.' : '参照成熟度或评分覆盖仍不完整。')
  if (evidence.coverage < 0.999999) notes.push(en ? `${Math.round(evidence.coverage * 100)}% of recorded playtime has a score; missing records are excluded.`
    : `已记录时间中 ${Math.round(evidence.coverage * 100)}% 可评分；缺分记录未参与平均。`)
  if (!evidence.heroAttributionVerified) notes.push(en ? 'Published map totals carry hero labels; attribution to each hero is unverified.' : '公开记录为带英雄标签的整图统计，逐英雄归属尚未核实。')
  if (evidence.flags?.includes('PATCH_INFERRED')) notes.push(en ? 'Patch groups are inferred from match dates.' : '版本分组按比赛日期推定。')
  if (evidence.flags?.includes('SUPPORT_MINIMUM_REVIEW')) notes.push(en ? 'Low support-duty metrics need review; the score is preserved.' : '支援履职指标较低，需复核；表现分保留。')
  if (evidence.flags?.includes('SHORT_TARGET_REVIEW')) notes.push(en ? 'A segment under 60 seconds needs review; its score is preserved.' : '存在不足 60 秒的片段，需复核；表现分保留。')
  if (seasonReference) notes.push(en
    ? 'Newly published matches can update Season OVR and season ranks. Published match ratings and MVP selections retain their original rules.'
    : '新增比赛会更新赛季总评与赛季排名；历史单场评分和 MVP 保持原规则。')
  return notes
}
