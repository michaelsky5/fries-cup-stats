import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { pickUiLocale } from '../../lib/uiText.js'
import { getMatchLookupIds } from '../../lib/weeklyMatchIdentity.js'
import { accountDateTime } from '../account-ui/accountDateTime.js'
import { weeklyMatchState } from '../weekly-overview/weeklyOverviewModel.js'
import { weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'
import { usePublicSupport } from './usePublicSupport.js'
import { rmb, supportBroadcastStart } from './supportModel.js'
import {
  BROADCAST_PLAN, CUSTOM_TIER, DELIVERY_PROMISES, FINALS_EXAMPLE, FINALS_MINIMUM_YUAN, FUND_SPLIT, PLAN_DATE,
  PLAYOFF_AWARD_YUAN, SUPPORT_CONTACT, SUPPORT_DOCUMENTS, SUPPORT_STEPS, SUPPORT_TIERS, TIER_NAMES, UPGRADE_PRIORITIES
} from './supportPlan.js'
import styles from './WeeklySupportPage.module.css'

// 票 2.50: written for the community and for supporters. The page leads with the three promises of
// the plan — where the money goes, what was delivered, who is thanked — and then how to support.
// Reviewed figures come only from the published snapshot; everything else is labelled as the plan.
const TIER_ORDER = ['E', 'D', 'C', 'B', 'A']
const SECTIONS = [
  ['support-funds', ['看去向', 'Where it goes', '자금 사용처', '看去向']],
  ['support-broadcasts', ['追进度', 'Progress', '진행 현황', '追進度']],
  ['support-thanks', ['查权益', 'Thanks', '감사 내역', '查權益']],
  ['support-how', ['怎么支持', 'How to support', '후원 방법', '怎麼支持']]
]

function CopyButton({ value, label, done }) {
  const [copied, setCopied] = useState(false)
  return <button type="button" className={styles.copy} onClick={async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setCopied(false) }
  }}>{copied ? done : label}</button>
}

function SectionHead({ index, id, title, children }) {
  return <header className={styles.sectionHead}>
    <span className={styles.sectionIndex} aria-hidden="true">{String(index).padStart(2, '0')}</span>
    <div><h2 id={`${id}-title`}>{title}</h2>{children ? <p>{children}</p> : null}</div>
  </header>
}

export default function WeeklySupportPage() {
  const { db, seasonId, withSeason, locale } = useOutletContext()
  const [selection, setSelection] = useState({ seasonId: '', id: '' })
  const cycleId = selection.seasonId === seasonId ? selection.id : ''
  const { loading, data, error, retry } = usePublicSupport(seasonId, cycleId)
  const t = (...copy) => pickUiLocale(locale, ...copy)
  const tx = copy => pickUiLocale(locale, ...copy)
  const number = value => Number(value).toLocaleString(locale === 'en-US' ? 'en-US' : 'zh-CN')
  // Whole yuan read cleaner in large type; reviewed amounts with fen keep both decimals.
  const money = cents => '¥' + (Number.isSafeInteger(cents) && cents % 100 === 0 ? number(cents / 100) : rmb(cents, locale))
  const published = Boolean(data?.published)
  const summary = data?.summary
  const matchIndex = useMemo(() => {
    const index = new Map()
    for (const match of Array.isArray(db?.matches) ? db.matches : []) for (const id of getMatchLookupIds(match)) index.set(id, match)
    return index
  }, [db])
  const broadcasts = (data?.broadcasts || []).map(slot => {
    const match = slot.matchId ? matchIndex.get(slot.matchId) : null
    return { ...slot, startsAt: supportBroadcastStart(slot, match), match, state: match ? weeklyMatchState(match) : null }
  })
  const finishedBroadcasts = broadcasts.filter(slot => ['complete', 'ruling'].includes(slot.state)).length
  const supporterGroups = TIER_ORDER.map(tier => ({ tier, people: (data?.supporters || []).filter(person => person.tier === tier) }))
    .filter(group => group.people.length)
  const untiered = (data?.supporters || []).filter(person => !TIER_ORDER.includes(person.tier))
  const awardLabels = {
    champion: t('冠军', 'Champion', '우승', '冠軍'), runnerUp: t('亚军', 'Runner-up', '준우승', '亞軍'),
    third: t('季军', 'Third', '3위', '季軍'), fourth: t('殿军', 'Fourth', '4위', '殿軍')
  }
  const upgradeLabels = {
    PLANNED: t('计划中', 'Planned', '계획 중', '計畫中'), FUNDED: t('经费已落实', 'Funded', '예산 확보', '經費已落實'),
    SCHEDULED: t('已排班', 'Staff scheduled', '인력 배정 완료', '已排班'), COMPLETE: t('已完成', 'Complete', '완료', '已完成')
  }
  const purposeColumns = [
    ['allocated', t('支持款分配', 'Support allocated', '후원금 배분', '支持款分配')],
    ['deposits', t('赛事方垫付', 'Organiser advances', '주최 측 선지급', '賽事方墊付')],
    ['spent', t('实际支出', 'Spent', '실제 지출', '實際支出')],
    ['reimbursed', t('已回补垫款', 'Reimbursed', '상환 완료', '已回補墊款')],
    ['available', t('可用余额', 'Available', '가용 잔액', '可用餘額')]
  ]
  const planTag = <small className={styles.planTag}>{t('计划', 'Plan', '계획', '計畫')}</small>
  const figures = published ? [
    { value: money(summary.receivedCents), label: t('已收支持款', 'Support received', '받은 후원금', '已收支持款'), note: t('经另一名成员复核', 'Reviewed by a second organiser', '다른 운영진이 검토', '經另一名成員複核') },
    { value: `${finishedBroadcasts} / ${broadcasts.length || BROADCAST_PLAN.total}`, label: t('约定直播已完赛', 'Agreed broadcasts played', '완료된 약정 중계', '約定直播已完賽'), note: t('按绑定的对阵计', 'Counted from the bound matches', '연결된 경기 기준', '按綁定的對陣計') },
    { value: money(summary.playoffs.awardCents || PLAYOFF_AWARD_YUAN * 100), label: t('季后赛冠军奖金', 'Playoff champion prize', '플레이오프 우승 상금', '季後賽冠軍獎金'), note: summary.playoffs.funded ? t('专款已落实', 'Fund covered', '전용 자금 확보', '專款已落實') : t('不足部分由赛事方补足', 'Any gap is covered by the organisers', '부족분은 주최 측이 보충', '不足部分由賽事方補足') },
    { value: money(summary.finals.poolCents || FINALS_MINIMUM_YUAN * 100), label: t('首届巅峰赛奖池', 'First Finals prize pool', '첫 파이널 상금', '首屆巔峰賽獎池'), note: t(`保底 ${FINALS_MINIMUM_YUAN} 元`, `At least ¥${FINALS_MINIMUM_YUAN}`, `최소 ${FINALS_MINIMUM_YUAN}위안 보장`, `保底 ${FINALS_MINIMUM_YUAN} 元`) }
  ] : [
    { value: '¥10', label: t('起支持整个赛段', 'covers a whole segment', '부터 구간 전체 후원', '起支持整個賽段'), note: t('A 至 E 五档', 'Five tiers, A to E', 'A~E 다섯 등급', 'A 至 E 五檔') },
    { value: String(BROADCAST_PLAN.total), label: t('场约定直播', 'agreed broadcasts', '경기 약정 중계', '場約定直播'), note: t(`${BROADCAST_PLAN.regular} 场积分赛精选 + ${BROADCAST_PLAN.playoffs} 场季后赛`, `${BROADCAST_PLAN.regular} prelim picks + ${BROADCAST_PLAN.playoffs} playoff matches`, `예선 엄선 ${BROADCAST_PLAN.regular}경기 + 플레이오프 ${BROADCAST_PLAN.playoffs}경기`, `${BROADCAST_PLAN.regular} 場積分賽精選 + ${BROADCAST_PLAN.playoffs} 場季後賽`) },
    { value: `¥${PLAYOFF_AWARD_YUAN}`, label: t('第二赛段季后赛冠军奖金', 'Second-segment playoff champion', '두 번째 구간 플레이오프 우승 상금', '第二賽段季後賽冠軍獎金'), note: t('固定金额，其他名次不设奖金', 'Fixed; no other placings are paid', '고정 금액, 다른 순위는 상금 없음', '固定金額，其他名次不設獎金') },
    { value: `¥${FINALS_MINIMUM_YUAN}`, label: t('首届巅峰赛保底奖池', 'Guaranteed first Finals pool', '첫 파이널 최소 상금', '首屆巔峰賽保底獎池'), note: t('专款全额入池，不足由赛事方补足', 'Every earmarked yuan goes in; the organisers cover any gap', '전용 자금은 전액 적립, 부족분은 주최 측 보충', '專款全額入池，不足由賽事方補足') }
  ]

  return <div className={styles.page} data-weekly-support>
    <header className={styles.hero}>
      {/* 票 2.72: the way back sits top-left like every other page's back row (it was the last item in the button row). */}
      <Link className={styles.back} to={withSeason('/')}><span aria-hidden="true">←</span> {t('返回赛事总览', 'Back to overview', '대회 개요로 돌아가기', '返回賽事總覽')}</Link>
      <h1>{t('周赛支持与资金进度', 'Weekly support & funding', '주간 대회 후원 및 자금 현황', '週賽支持與資金進度')}</h1>
      <p className={styles.lead}>{t('让支持落到下一场比赛里。钱用在哪、奖池到了多少、约定直播兑现了几场、感谢了谁，都在这里公开。',
        'Support goes into the next match. Where the money goes, how big the prize pools are, how many agreed broadcasts were delivered and who is thanked are all published here.',
        '후원은 다음 경기로 이어집니다. 자금 사용처, 상금 규모, 약정 중계 이행 현황, 감사 대상까지 모두 여기에서 공개합니다.',
        '讓支持落到下一場比賽裡。錢用在哪、獎池到了多少、約定直播兌現了幾場、感謝了誰，都在這裡公開。')}</p>
      <div className={styles.heroActions}>
        <a className={styles.primary} href="#support-how">{t('我想支持', 'I want to support', '후원하기', '我想支持')} <span aria-hidden="true">→</span></a>
        <a className={styles.secondary} href="#support-funds">{t('先看钱用在哪', 'See where the money goes', '자금 사용처 먼저 보기', '先看錢用在哪')}</a>
      </div>
    </header>

    {seasonId !== 'FCW26' ? <section className={styles.section}><p>{t('当前赛事没有已配置的周赛支持计划。', 'No weekly support plan is configured for this event.', '이 대회에는 설정된 주간 후원 계획이 없습니다.', '當前賽事沒有已配置的週賽支持計畫。')}</p><Link to="/support?season=FCW2026">FCW2026 →</Link></section> : <>
      <nav className={styles.sectionNav} aria-label={t('本页目录', 'On this page', '이 페이지', '本頁目錄')}>
        {SECTIONS.map(([id, label], index) => <a key={id} href={`#${id}`}><b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>{tx(label)}</a>)}
      </nav>

      <section className={styles.overview} aria-busy={loading} aria-label={t('当前进度', 'Where things stand', '현재 현황', '當前進度')} data-support-published={published}>
        <div className={styles.status} role={error ? 'alert' : 'status'}>
          {loading ? <span>{t('正在读取已公布的记录…', 'Loading published records…', '공개 기록을 불러오는 중…', '正在讀取已公布的記錄…')}</span>
            : error ? <><span data-tone="warn">{t('暂时无法核验资金信息，已公布金额先隐藏；下面是计划。', 'Funding cannot be verified right now, so published amounts are hidden; the plan is shown below.', '지금은 자금 정보를 확인할 수 없어 공개 금액을 숨겼습니다. 아래는 계획입니다.', '暫時無法核驗資金資訊，已公布金額先隱藏；下面是計畫。')}</span><button type="button" onClick={retry}>{t('重新核验', 'Retry', '다시 확인', '重新核驗')}</button></>
              : published ? <>
                <span data-tone="ok">{t('已公布', 'Published', '공개됨', '已公布')} · <b data-i18n-ignore>{data.label}</b> · {t('最近公布', 'last published', '최근 공개', '最近公布')} {accountDateTime(data.publishedAt, locale)} UTC+8</span>
                {data.cycles.length > 1 && <label>{t('查看赛段', 'Segment', '구간 선택', '查看賽段')} <select value={data.cycleId} onChange={event => setSelection({ seasonId, id: event.target.value })}>{data.cycles.map(cycle => <option key={cycle.id} value={cycle.id} data-i18n-ignore>{cycle.label}</option>)}</select></label>}
              </>
                : <span data-tone="plan">{t('资金记录尚未公布：每笔记录经另一名成员复核后才会在这里公开。在此之前，下面列的是计划。', 'No funding records are published yet: each record appears here once a second organiser has reviewed it. Until then, the figures below are the plan.', '아직 공개된 자금 기록이 없습니다. 모든 기록은 다른 운영진의 검토를 거친 뒤 공개되며, 그 전까지 아래 숫자는 계획입니다.', '資金記錄尚未公布：每筆記錄經另一名成員複核後才會在這裡公開。在此之前，下面列的是計畫。')}</span>}
        </div>
        {published && data.pendingChanges && <p className={styles.pending}>{t('另有更新正在复核，下面仍以上次公布的记录为准。', 'Further updates are under review; the figures below are the last published snapshot.', '추가 변경을 검토 중입니다. 아래 숫자는 마지막으로 공개된 기록입니다.', '另有更新正在複核，下面仍以上次公布的記錄為準。')}</p>}
        <div className={styles.figures}>{figures.map(item => <article key={item.label}>
          <strong>{item.value}</strong><span>{item.label}{!published && planTag}</span><small>{item.note}</small>
        </article>)}</div>
      </section>

      <section id="support-funds" className={styles.section} aria-labelledby="support-funds-title">
        <SectionHead index={1} id="support-funds" title={t('钱用在哪', 'Where the money goes', '자금은 어디에 쓰이나', '錢用在哪')}>
          {t('一般支持先扣除退款和尚未释放的退款预留，再按下面的比例分配；指定用途的支持另行确认、单独记账。',
            'General support, after refunds and the unreleased refund reserve, is split as below. Support for a named purpose is agreed separately and accounted for on its own.',
            '일반 후원금은 환불과 미해제 환불 예비금을 뺀 뒤 아래 비율로 나눕니다. 용도를 지정한 후원은 따로 확인하고 별도로 회계 처리합니다.',
            '一般支持先扣除退款和尚未釋放的退款預留，再按下面的比例分配；指定用途的支持另行確認、單獨記帳。')}
        </SectionHead>
        <div className={styles.split} role="img" aria-label={FUND_SPLIT.map(part => `${tx(part.name)} ${part.percent}%`).join(' · ')}>
          {FUND_SPLIT.map(part => <div key={part.purpose} className={styles.splitPart} data-purpose={part.purpose} style={{ flexGrow: part.percent }}>
            <strong>{part.percent}%</strong>
          </div>)}
        </div>
        <div className={styles.splitLegend}>{FUND_SPLIT.map(part => <div key={part.purpose} data-purpose={part.purpose} style={{ flexGrow: part.percent }}>
          <b>{tx(part.name)}</b>
          {published && <small>{t('已分配', 'Allocated', '배분됨', '已分配')} {money(summary.allocated[part.purpose])}</small>}
        </div>)}</div>

        <div className={styles.prizes}>
          <article className={styles.prize}>
            <span>{t('本赛段季后赛冠军奖金', 'This segment’s playoff champion', '이번 구간 플레이오프 우승 상금', '本賽段季後賽冠軍獎金')}{!published && planTag}</span>
            <strong>{published ? money(summary.playoffs.awardCents || PLAYOFF_AWARD_YUAN * 100) : `¥${PLAYOFF_AWARD_YUAN}`}</strong>
            <p>{t('冠军固定 100 元，其他名次不设奖金。专款不足由赛事方补足；超出的部分结转到 FCW2027 第一赛段季后赛，不增加当期奖金。',
              'The champion receives a fixed ¥100; no other placing is paid. The organisers cover any shortfall; any surplus carries over to the FCW2027 first-segment playoffs instead of raising this prize.',
              '우승팀은 고정 100위안을 받고, 다른 순위는 상금이 없습니다. 전용 자금이 부족하면 주최 측이 보충하고, 초과분은 FCW2027 첫 구간 플레이오프로 이월됩니다.',
              '冠軍固定 100 元，其他名次不設獎金。專款不足由賽事方補足；超出的部分結轉到 FCW2027 第一賽段季後賽，不增加當期獎金。')}</p>
            {published && <small data-tone={summary.playoffs.funded ? 'ok' : 'plan'}>{summary.playoffs.funded ? t('专款已落实', 'Fund covered', '전용 자금 확보', '專款已落實') : t('目前由赛事方补足差额', 'The organisers currently cover the gap', '현재 부족분은 주최 측이 보충', '目前由賽事方補足差額')}{summary.playoffs.carryCents > 0 ? ` · ${t('结转', 'carried over', '이월', '結轉')} ${money(summary.playoffs.carryCents)}` : ''}</small>}
          </article>
          <article className={styles.pool}>
            <span>{t('首届巅峰赛奖池', 'First Finals prize pool', '첫 파이널 상금', '首屆巔峰賽獎池')}{!published && planTag}</span>
            <strong>{published ? money(summary.finals.poolCents || FINALS_MINIMUM_YUAN * 100) : t(`¥${FINALS_MINIMUM_YUAN} 起`, `From ¥${FINALS_MINIMUM_YUAN}`, `${FINALS_MINIMUM_YUAN}위안부터`, `¥${FINALS_MINIMUM_YUAN} 起`)}</strong>
            <p>{t('有效奖金专款全额入池，不足 300 元由赛事方补足。不足 600 元时冠亚军按 2:1 分配；达到 600 元起，前四名按 6:4:1:1 分配。',
              'Every earmarked yuan goes into the pool and the organisers top it up to ¥300. Below ¥600 it is split 2:1 between first and second; from ¥600 the top four share it 6:4:1:1.',
              '전용 상금은 전액 적립되며 300위안에 못 미치면 주최 측이 보충합니다. 600위안 미만이면 1·2위가 2:1로, 600위안 이상이면 상위 4팀이 6:4:1:1로 나눕니다.',
              '有效獎金專款全額入池，不足 300 元由賽事方補足。不足 600 元時冠亞軍按 2:1 分配；達到 600 元起，前四名按 6:4:1:1 分配。')}</p>
            <dl>
              {published ? Object.entries(summary.finals.awards).filter(([, amount]) => amount > 0).map(([key, amount]) => <div key={key}><dt>{awardLabels[key]}</dt><dd>{money(amount)}</dd></div>)
                : FINALS_EXAMPLE.map(([key, yuan]) => <div key={key}><dt>{awardLabels[key]}</dt><dd>¥{yuan}</dd></div>)}
            </dl>
            <small>{published ? (summary.finals.funded ? t('经费已核验落实', 'Funding verified', '자금 확인 완료', '經費已核驗落實') : t('含赛事方保底承诺，差额到账尚待核验', 'Includes the organisers’ guarantee; the gap is not yet verified', '주최 측 보장 포함, 부족분 입금은 확인 전', '含賽事方保底承諾，差額到帳尚待核驗'))
              : t('奖池达到 600 元时的分配示例', 'How a ¥600 pool would be shared', '상금이 600위안일 때의 배분 예시', '獎池達到 600 元時的分配示例')}</small>
          </article>
        </div>

        {published && <details className={styles.ledger}>
          <summary>{t('查看完整收支（经复核）', 'Full reviewed accounts', '검토된 전체 수지 보기', '查看完整收支（經複核）')}</summary>
          <div className={styles.funds}>{[
            [t('已收支持款', 'Received', '수령 후원금', '已收支持款'), summary.receivedCents],
            [t('退款预留', 'Refund reserve', '환불 예비금', '退款預留'), summary.reserveCents],
            [t('可分配款', 'Distributable', '배분 가능 금액', '可分配款'), summary.distributableCents],
            [t('已退款', 'Refunded', '환불 완료', '已退款'), summary.refundedCents]
          ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{'¥' + rmb(value, locale)}</strong></article>)}</div>
          <div className={styles.fundDetails} tabIndex={0} role="region" aria-label={t('资金用途与收支，可横向滚动', 'Allocation and spending, scroll horizontally', '자금 용도 및 수지, 가로 스크롤 가능', '資金用途與收支，可橫向捲動')}>
            <table><thead><tr><th scope="col">{t('用途', 'Purpose', '용도', '用途')}</th>{purposeColumns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
              <tbody>{FUND_SPLIT.map(part => <tr key={part.purpose}><th scope="row">{tx(part.name)}</th>{purposeColumns.map(([field]) => <td key={field}>{summary[field][part.purpose] < 0 ? '−' : ''}{'¥' + rmb(Math.abs(summary[field][part.purpose]), locale)}</td>)}</tr>)}</tbody></table>
          </div>
          <p className={styles.note}>{t('赛事方垫付与支持款分别核算；负余额表示待补差。巅峰赛奖池汇总同届各赛段已公布的专款。', 'Organiser advances are accounted for separately from support. A negative balance is a shortfall still to be covered. The Finals pool adds up the published earmarked funds of every segment of this edition.', '주최 측 선지급과 후원금은 따로 정산합니다. 음수 잔액은 아직 메우지 못한 부족분입니다. 파이널 상금은 같은 대회 각 구간의 공개된 전용 자금을 합한 것입니다.', '賽事方墊付與支持款分別核算；負餘額表示待補差。巔峰賽獎池彙總同屆各賽段已公布的專款。')}</p>
        </details>}
      </section>

      <section id="support-broadcasts" className={styles.section} aria-labelledby="support-broadcasts-title">
        <SectionHead index={2} id="support-broadcasts" title={t('约定直播与升级', 'Broadcasts and upgrades', '약정 중계와 개선', '約定直播與升級')}>
          {t(`第二赛段约定 ${BROADCAST_PLAN.total} 场直播：${BROADCAST_PLAN.regular} 场积分赛精选，${BROADCAST_PLAN.playoffs} 场季后赛全部直播。支持者的名字在每场赛前、赛后各展示一轮。`,
            `The second segment has ${BROADCAST_PLAN.total} agreed broadcasts: ${BROADCAST_PLAN.regular} selected prelim matches and all ${BROADCAST_PLAN.playoffs} playoff matches. Supporters are shown before and after every one.`,
            `두 번째 구간 약정 중계는 ${BROADCAST_PLAN.total}경기입니다. 예선 엄선 ${BROADCAST_PLAN.regular}경기와 플레이오프 ${BROADCAST_PLAN.playoffs}경기 전부이며, 매 경기 전후로 후원자 이름이 나옵니다.`,
            `第二賽段約定 ${BROADCAST_PLAN.total} 場直播：${BROADCAST_PLAN.regular} 場積分賽精選，${BROADCAST_PLAN.playoffs} 場季後賽全部直播。支持者的名字在每場賽前、賽後各展示一輪。`)}
        </SectionHead>
        <div className={styles.progress}>
          <div>
            <h3>{t(`${BROADCAST_PLAN.total} 场约定直播`, `${BROADCAST_PLAN.total} agreed broadcasts`, `약정 중계 ${BROADCAST_PLAN.total}경기`, `${BROADCAST_PLAN.total} 場約定直播`)}{!published && planTag}</h3>
            {published && broadcasts.length ? <ol className={styles.slots}>{broadcasts.map((slot, index) => <li key={slot.id || index} data-state={slot.state || 'pending'}>
              <b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
              <span><strong data-i18n-ignore>{slot.label}</strong><small>{slot.startsAt ? `${accountDateTime(slot.startsAt, locale)} UTC+8` : t('时间待定', 'Time to be confirmed', '시간 미정', '時間待定')}</small></span>
              {slot.match ? <Link to={withSeason(`/matches/${encodeURIComponent(slot.match.match_id || slot.matchId)}`)} data-i18n-ignore>{weeklyTeamShort(slot.match.team_a)} vs {weeklyTeamShort(slot.match.team_b)} →</Link> : <small>{t('对阵待定', 'Match to be confirmed', '경기 미정', '對陣待定')}</small>}
              <em>{['complete', 'ruling'].includes(slot.state) ? t('已完赛', 'Played', '경기 완료', '已完賽') : slot.state === 'live' ? t('进行中', 'Live', '진행 중', '進行中') : t('待播', 'Upcoming', '방송 예정', '待播')}</em>
            </li>)}</ol>
              : <ol className={styles.planSlots} aria-label={t('直播分布', 'How the broadcasts are spread', '중계 배치', '直播分佈')}>
                {Array.from({ length: BROADCAST_PLAN.regularWeeks }, (_, week) => <li key={week}>
                  <span>{t(`积分赛第 ${week + 1} 周`, `Prelim week ${week + 1}`, `예선 ${week + 1}주차`, `積分賽第 ${week + 1} 週`)}</span>
                  <i aria-hidden="true">{Array.from({ length: BROADCAST_PLAN.perWeek }, (_, n) => <b key={n}>{String(week * BROADCAST_PLAN.perWeek + n + 1).padStart(2, '0')}</b>)}</i>
                  <small>{t(`精选 ${BROADCAST_PLAN.perWeek} 场`, `${BROADCAST_PLAN.perWeek} selected`, `엄선 ${BROADCAST_PLAN.perWeek}경기`, `精選 ${BROADCAST_PLAN.perWeek} 場`)}</small>
                </li>)}
                <li data-stage="playoffs">
                  <span>{t('季后赛', 'Playoffs', '플레이오프', '季後賽')}</span>
                  <i aria-hidden="true">{Array.from({ length: BROADCAST_PLAN.playoffs }, (_, n) => <b key={n}>{String(BROADCAST_PLAN.regular + n + 1).padStart(2, '0')}</b>)}</i>
                  <small>{t('半决赛 2 场 + 决赛', 'Two semifinals and the final', '준결승 2경기 + 결승', '準決賽 2 場 + 決賽')}</small>
                </li>
              </ol>}
            {published && data.entryUrl && <a className={styles.entry} href={data.entryUrl} target="_blank" rel="noreferrer">{t('观赛入口', 'Where to watch', '시청 링크', '觀賽入口')}{data.platform ? ` · ${data.platform}` : ''} ↗</a>}
          </div>
          <div>
            <h3>{t('直播升级', 'Broadcast upgrades', '중계 개선', '直播升級')}{!(published && data.upgrades.length) && planTag}</h3>
            {published && data.upgrades.length ? <ul className={styles.upgrades}>{data.upgrades.map((upgrade, index) => <li key={index} data-status={upgrade.status}>
              <strong data-i18n-ignore>{upgrade.label}</strong><em>{upgradeLabels[upgrade.status]}</em>{upgrade.amountCents > 0 && <small>{money(upgrade.amountCents)}</small>}
            </li>)}</ul>
              : <ol className={styles.priorities}>{UPGRADE_PRIORITIES.map((item, index) => <li key={index}><b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b><span><strong>{tx(item.title)}</strong><small>{tx(item.body)}</small></span></li>)}</ol>}
          </div>
        </div>
      </section>

      <section id="support-thanks" className={styles.section} aria-labelledby="support-thanks-title">
        <SectionHead index={3} id="support-thanks" title={t('感谢支持者', 'Thank you, supporters', '후원자께 감사드립니다', '感謝支持者')}>
          {t('名单按每位支持者的授权公开：可以署名、用约定的显示名，或者不公开。', 'Names appear only as each supporter agreed: under their name, a chosen display name, or not at all.', '후원자가 동의한 방식으로만 공개합니다. 실명, 약정한 표시 이름, 또는 비공개 중에서 고를 수 있습니다.', '名單按每位支持者的授權公開：可以署名、用約定的顯示名，或者不公開。')}
        </SectionHead>
        {published && (supporterGroups.length || untiered.length) ? <div className={styles.thanks}>
          {supporterGroups.map(group => <div key={group.tier} className={styles.thanksGroup} data-tier={group.tier}>
            <h3><b>{group.tier}</b>{tx(TIER_NAMES[group.tier])}</h3>
            <ul>{group.people.map((person, index) => <li key={index} data-i18n-ignore>{person.displayName}{person.amountCents !== undefined && <small>{money(person.amountCents)}</small>}</li>)}</ul>
          </div>)}
          {untiered.length > 0 && <div className={styles.thanksGroup}><ul>{untiered.map((person, index) => <li key={index} data-i18n-ignore>{person.displayName}</li>)}</ul></div>}
        </div> : <div className={styles.thanksEmpty}>
          <strong>{t('第一位支持者的名字，会出现在这里。', 'The first supporter’s name will appear here.', '첫 후원자의 이름이 여기에 나옵니다.', '第一位支持者的名字，會出現在這裡。')}</strong>
          <a href="#support-how">{t('了解支持方式', 'See how to support', '후원 방법 보기', '了解支持方式')} <span aria-hidden="true">→</span></a>
        </div>}
        <div className={styles.promises}>{DELIVERY_PROMISES.map(item => <article key={item.title[0]}><h3>{tx(item.title)}</h3><p>{tx(item.body)}</p></article>)}</div>
      </section>

      <section id="support-how" className={styles.section} aria-labelledby="support-how-title">
        <SectionHead index={4} id="support-how" title={t('怎么支持', 'How to support', '후원 방법', '怎麼支持')}>
          {t(`从 10 元开始，支持整个赛段。A 至 D 档覆盖第二赛段 ${BROADCAST_PLAN.total} 场约定直播；首轮只接完整赛段，赛段开始后登记的按下一赛段确认。`,
            `From ¥10 you support a whole segment. Tiers A to D cover all ${BROADCAST_PLAN.total} agreed broadcasts of the second segment; this round only covers whole segments, so later sign-ups are confirmed for the next one.`,
            `10위안부터 구간 전체를 후원할 수 있습니다. A~D 등급은 두 번째 구간 약정 중계 ${BROADCAST_PLAN.total}경기 전체에 적용되며, 이번에는 구간 전체 단위로만 받으므로 구간 시작 후 신청은 다음 구간으로 확인합니다.`,
            `從 10 元開始，支持整個賽段。A 至 D 檔覆蓋第二賽段 ${BROADCAST_PLAN.total} 場約定直播；首輪只接完整賽段，賽段開始後登記的按下一賽段確認。`)}
        </SectionHead>
        <div className={styles.tiers}>{SUPPORT_TIERS.map(tier => <article key={tier.id} data-tier={tier.id}>
          <span><b>{tier.id}</b>{tx(tier.name)}</span>
          <strong>{tier.yuan}<small>{t('元', 'yuan', '위안', '元')}</small></strong>
          <p>{tx(tier.body)}</p>
        </article>)}</div>
        <article className={styles.customTier} data-tier="E">
          <span><b>E</b>{tx(CUSTOM_TIER.name)}</span><strong>{tx(CUSTOM_TIER.price)}</strong><p>{tx(CUSTOM_TIER.body)}</p>
        </article>
        <p className={styles.includes}>{t('每一档都包含：赛段感谢名录、感谢记录查询和直播升级进度。', 'Every tier includes the segment thank-you roll, a record of your thanks and broadcast-upgrade updates.', '모든 등급에 구간 감사 명단, 감사 기록 조회, 중계 개선 현황이 포함됩니다.', '每一檔都包含：賽段感謝名錄、感謝記錄查詢和直播升級進度。')}</p>
        <ol className={styles.steps}>{SUPPORT_STEPS.map((step, index) => <li key={index}><b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b><h3>{tx(step.title)}</h3><p>{tx(step.body)}</p></li>)}</ol>
        <div className={styles.contact}>
          <div><span>{t('赞助对接', 'Support contact', '후원 문의', '贊助對接')}</span><strong>{tx(SUPPORT_CONTACT.name)}</strong></div>
          <div><span>{t('微信', 'WeChat', '위챗', '微信')}</span><strong data-i18n-ignore>{SUPPORT_CONTACT.wechat}</strong><CopyButton value={SUPPORT_CONTACT.wechat} label={t('复制', 'Copy', '복사', '複製')} done={t('已复制', 'Copied', '복사됨', '已複製')} /></div>
          <div><span>{t('邮箱', 'Email', '이메일', '郵箱')}</span><a href={`mailto:${SUPPORT_CONTACT.email}`} data-i18n-ignore>{SUPPORT_CONTACT.email}</a></div>
        </div>
        <div className={styles.docs}>{SUPPORT_DOCUMENTS.map(doc => <a key={doc.href} href={doc.href} target="_blank" rel="noreferrer"><span>{tx(doc.label)}<small>{t('PDF · 中文', 'PDF · Chinese', 'PDF · 중국어', 'PDF · 中文')}</small></span><span aria-hidden="true">↓</span></a>)}</div>
      </section>

      <footer className={styles.disclaimer}>
        <p>{t(`方案日期 ${PLAN_DATE}；档位、场次与条款以正式公告和电子确认单为准。`, `Plan dated ${PLAN_DATE}; tiers, broadcasts and terms follow the official announcement and your confirmation.`, `계획 기준일 ${PLAN_DATE}. 등급, 경기, 조건은 공식 공지와 전자 확인서를 따릅니다.`, `方案日期 ${PLAN_DATE}；檔位、場次與條款以正式公告和電子確認單為準。`)}</p>
        <p>{t('薯条杯周赛由薯条杯赛事组独立组织。本赛事及个人赞助计划均非暴雪官方赞助或背书。', 'Fries Cup Weekly is organised independently by the Fries Cup team. Neither the event nor the personal support plan is sponsored or endorsed by Blizzard.', '프라이즈 컵 주간 대회는 프라이즈 컵 운영팀이 독립적으로 운영합니다. 대회와 개인 후원 계획 모두 블리자드의 공식 후원이나 보증을 받지 않았습니다.', '薯條杯週賽由薯條杯賽事組獨立組織。本賽事及個人贊助計畫均非暴雪官方贊助或背書。')}</p>
      </footer>
    </>}
  </div>
}
