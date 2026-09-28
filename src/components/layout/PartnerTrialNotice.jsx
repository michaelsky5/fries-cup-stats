import styles from './PartnerTrialNotice.module.css'

export default function PartnerTrialNotice({ season, locale }) {
  if (!season?.partnerTrial) return null
  const copy = {
    'zh-CN': ['试用赛事', '使用历史比赛素材的独立演练。这里只展示负责人已批准并发布的结果；赛管提交成功后不会立即更新。'],
    'zh-TW': ['試用賽事', '使用歷史比賽素材的獨立演練。這裡只顯示負責人已核准並發布的結果；賽管提交成功後不會立即更新。'],
    'en-US': ['TRIAL EVENT', 'Independent practice using historical match material. Only approved and published results appear here; submission alone does not update this page.'],
    'ko-KR': ['체험 대회', '과거 경기 자료를 활용한 독립 연습입니다. 담당자가 승인하고 게시한 결과만 표시됩니다. 제출만으로는 이 페이지가 갱신되지 않습니다.']
  }[locale] || ['试用赛事', '使用历史比赛素材的独立演练。这里只展示负责人已批准并发布的结果；赛管提交成功后不会立即更新。']
  return <aside className={styles.notice} role="note"><strong>{copy[0]}</strong><span>{copy[1]}</span></aside>
}
