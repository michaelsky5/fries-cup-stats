export function getStatisticalRatingModelNotice(locale = 'zh-CN') {
  return locale === 'en-US'
    ? 'Statistical performance v1.5: references use earlier competition days. Limited references are provisional; hero attribution is unverified.'
    : '统计表现 v1.5：使用此前比赛日参照；少参照分数为暂定，逐英雄统计归属尚未核实。'
}

export function getStatisticalRatingLabel(entry, locale = 'zh-CN') {
  const evidence = entry?.statisticalRating
  if (!evidence) return ''
  const en = locale === 'en-US'
  return evidence.referenceStage === 'REFERENCE_UNAVAILABLE' ? (en ? 'Unrated statistics' : '统计分缺参照')
    : evidence.provisional ? (en ? 'Provisional statistics' : '暂定统计分') : (en ? 'Statistical score' : '统计表现分')
}

export function getStatisticalRatingNotes(entry, locale = 'zh-CN') {
  const evidence = entry?.statisticalRating
  if (!evidence) return []
  const en = locale === 'en-US'
  const notes = [en ? 'Statistical performance v1.5: references use earlier competition days. Tactical contribution is not fully measured.'
    : '统计表现 v1.5：只使用此前比赛日的参照，尚不能完整衡量战术贡献。']
  if (evidence.referenceStage === 'REFERENCE_UNAVAILABLE') notes.push(en ? 'No usable reference score; no old score is substituted.' : '缺少可用的评分参照，暂不显示分数。')
  else if (Number.isInteger(evidence.minimumSourceMatches) && evidence.minimumSourceMatches > 0 && evidence.minimumSourceMatches < 5) notes.push(en
    ? `Some active references have only ${evidence.minimumSourceMatches} prior matches. Small score differences need caution.`
    : `部分参照来源仅有此前 ${evidence.minimumSourceMatches} 场比赛，小分差需谨慎解读。`)
  else if (evidence.provisional) notes.push(en ? 'Reference maturity or scoring coverage remains incomplete.' : '参照成熟度或评分覆盖仍不完整。')
  if (evidence.coverage < 0.999999) notes.push(en ? `${Math.round(evidence.coverage * 100)}% of recorded playtime has a score; missing records are excluded.`
    : `已记录时间中 ${Math.round(evidence.coverage * 100)}% 可评分；缺分记录未参与平均。`)
  if (!evidence.heroAttributionVerified) notes.push(en ? 'Published map totals carry hero labels; attribution to each hero is unverified.' : '公开记录为带英雄标签的整图统计，逐英雄归属尚未核实。')
  if (evidence.flags?.includes('PATCH_INFERRED')) notes.push(en ? 'Patch groups are inferred from match dates.' : '版本分组按比赛日期推定。')
  if (evidence.flags?.includes('SUPPORT_MINIMUM_REVIEW')) notes.push(en ? 'Low support-duty metrics need review; the score is preserved.' : '支援履职指标较低，需复核；表现分保留。')
  if (evidence.flags?.includes('SHORT_TARGET_REVIEW')) notes.push(en ? 'A segment under 60 seconds needs review; its score is preserved.' : '存在不足 60 秒的片段，需复核；表现分保留。')
  return notes
}
