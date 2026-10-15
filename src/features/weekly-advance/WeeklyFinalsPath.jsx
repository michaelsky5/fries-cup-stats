import { pickUiLocale } from '../../lib/uiText.js'
import { getWeeklyPhaseLabel } from '../../lib/weeklyMatchIdentity.js'
import styles from './WeeklyPlayoffBracket.module.css'

const text = (locale, ...values) => pickUiLocale(locale, ...values)
const steps = [
  {
    title: ['资格待公布', 'Eligibility pending', '참가 자격 발표 예정', '資格待公布'],
    detail: ['参赛名额、资格条件及递补办法以专项规程为准。', 'Places, eligibility and replacement rules follow the event regulations.', '참가권, 자격 조건 및 대체 규정은 대회별 규정을 따릅니다.', '參賽名額、資格條件及遞補辦法以專項規程為準。']
  },
  {
    title: ['对阵待定', 'Matchups pending', '대진 미정', '對陣待定'],
    detail: ['参赛队伍、赛制和比赛时间将在正式公布后显示。', 'Teams, format and start times appear after the official announcement.', '참가 팀, 경기 방식 및 시작 시간은 공식 발표 후 표시됩니다.', '參賽隊伍、賽制和比賽時間將在正式公布後顯示。']
  },
  {
    title: ['巅峰赛冠军', 'Finals champion', '파이널 우승 팀', '巔峰賽冠軍'],
    detail: ['等待赛事举办与正式赛果，冠军席位暂未产生。', 'The champion is decided by the event’s official results.', '대회 공식 결과에 따라 우승 팀이 결정됩니다.', '等待賽事舉辦與正式賽果，冠軍席位暫未產生。']
  }
]

export default function WeeklyFinalsPath({ locale }) {
  return <section id="weekly-major" className={styles.section} aria-labelledby="weekly-finals-title" data-weekly-finals="pending">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>03 / FCW FINALS</p><h2 id="weekly-finals-title">{getWeeklyPhaseLabel('MAJOR', locale)}</h2><p>{text(locale, '沿资格、公示对阵到冠军，后续安排在这里展开。', 'Follow eligibility, announced matchups and the route to the title.', '참가 자격, 공식 대진, 우승까지의 경로를 이곳에서 확인하세요.', '沿資格、公示對陣到冠軍，後續安排在這裡展開。')}</p></div>
      <span className={styles.finalsHeadingBadge}>{text(locale, '等待正式公布', 'Awaiting announcement', '공식 발표 대기', '等待正式公布')}</span>
    </header>
    <div className={styles.finalsPath} aria-label={text(locale, '巅峰赛晋级路径', 'Finals advancement path', '파이널 진출 경로', '巔峰賽晉級路徑')}>
      {steps.map((step, index) => <article key={index} className={styles.finalsStep}><span>{String(index + 1).padStart(2, '0')}</span><h3>{text(locale, ...step.title)}</h3><p>{text(locale, ...step.detail)}</p></article>)}
    </div>
    <p className={styles.pointsNote}>{text(locale, '赛段成绩不自动产生巅峰赛资格，具体资格与赛制另行公布。', 'Cycle results do not automatically grant Finals entry. Eligibility and format will be announced separately.', '대회 성적만으로 파이널 참가 자격이 자동 부여되지 않습니다. 자격 및 경기 방식은 별도 발표됩니다.', '賽段成績不自動產生巔峰賽資格，具體資格與賽制另行公布。')} <a href="https://fries-cup.com/events/weekly/" target="_blank" rel="noreferrer">{text(locale, '查看赛事公示', 'Event announcements', '대회 공지', '查看賽事公示')} ↗</a></p>
  </section>
}
