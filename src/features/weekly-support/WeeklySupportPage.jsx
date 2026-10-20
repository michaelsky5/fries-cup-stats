import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { pickUiLocale } from '../../lib/uiText.js'
import { accountDateTime } from '../account-ui/accountDateTime.js'
import { usePublicSupport } from './usePublicSupport.js'
import { rmb } from './supportModel.js'
import styles from './WeeklySupportPage.module.css'

export default function WeeklySupportPage() {
  const { seasonId, withSeason, locale } = useOutletContext()
  const [selection, setSelection] = useState({ seasonId: '', id: '' })
  const cycleId = selection.seasonId === seasonId ? selection.id : ''
  const { loading, data, error, retry } = usePublicSupport(seasonId, cycleId)
  const t = (...copy) => pickUiLocale(locale, ...copy)
  const money = value => '¥' + rmb(value, locale)
  const title = t('周赛支持与计划', 'Weekly support & plans', '주간 대회 후원 및 계획', '週賽支持與計畫')
  const purposes = [
    ['PLAYOFFS', t('季后赛奖金', 'Playoff prizes', '플레이오프 상금', '季後賽獎金')],
    ['FINALS', t('巅峰赛奖金', 'Finals prizes', '파이널 상금', '巔峰賽獎金')],
    ['OPERATIONS', t('人员与运营', 'Staff & operations', '인력 및 운영', '人員與營運')]
  ]
  const columns = [
    ['allocated', t('支持款分配', 'Support allocated', '후원금 배분', '支持款分配')],
    ['deposits', t('赛事方垫付', 'Organiser advances', '주최 측 선지급', '賽事方墊付')],
    ['spent', t('实际支出', 'Spent', '실제 지출', '實際支出')],
    ['reimbursed', t('已回补垫款', 'Reimbursed', '상환 완료', '已回補墊款')],
    ['available', t('可用余额', 'Available', '가용 잔액', '可用餘額')]
  ]
  const awardLabels = {
    champion: t('冠军', 'Champion', '우승', '冠軍'), runnerUp: t('亚军', 'Runner-up', '준우승', '亞軍'),
    third: t('季军', 'Third', '3위', '季軍'), fourth: t('殿军', 'Fourth', '4위', '殿軍')
  }
  const phaseLabels = {
    PLANNED: t('计划中', 'Planned', '계획 중', '計畫中'), FUNDED: t('经费已落实', 'Funded', '예산 확보', '經費已落實'),
    SCHEDULED: t('已排班', 'Staff scheduled', '인력 배정 완료', '已排班'), COMPLETE: t('已完成', 'Complete', '완료', '已完成')
  }
  return <div className={styles.page} data-weekly-support>
    <header className={styles.hero}>
      <div className={styles.eyebrow}>FRIES CUP / WEEKLY SUPPORT</div>
      <Link to={withSeason('/')} className={styles.back}>{t('返回赛事总览', 'Event overview', '대회 개요', '返回賽事總覽')} ↗</Link>
      <h1>{title}</h1>
      <p>{t('已复核并公布的资金记录、支持者与直播升级进度。', 'Reviewed, published funding records, supporters and broadcast upgrades.', '검토 후 공개된 자금 기록, 후원자 및 중계 개선 현황입니다.', '已複核並公布的資金記錄、支持者與直播升級進度。')}</p>
    </header>
    {seasonId !== 'FCW26' ? <section className={styles.section}><p>{t('当前赛事没有已配置的周赛支持计划。', 'No weekly support plan is configured for this event.', '이 대회에는 설정된 주간 후원 계획이 없습니다.', '當前賽事沒有已配置的週賽支持計畫。')}</p><Link to="/support?season=FCW2026">FCW2026 ↗</Link></section> : <>
      <section className={styles.section} aria-busy={loading}>
        <div className={styles.sectionHead}><span>01 / REVIEWED FUNDING</span><h2>{t('公开资金进度', 'Reviewed funding', '공개 자금 현황', '公開資金進度')}</h2></div>
        {loading ? <p role="status">{t('正在获取已公布信息…', 'Loading published records…', '공개 기록을 불러오는 중…', '正在取得已公布資訊…')}</p>
          : error ? <div role="alert"><p>{t('暂时无法核验资金信息，金额已隐藏。', 'Funding cannot currently be verified; amounts are hidden.', '현재 자금 정보를 확인할 수 없어 금액을 숨겼습니다.', '暫時無法核驗資金資訊，金額已隱藏。')}</p><button type="button" onClick={retry}>{t('重新核验', 'Retry', '다시 확인', '重新核驗')}</button></div>
            : !data?.published ? <p>{t('本赛季尚未公布经复核的赞助记录，暂无可展示金额。', 'No reviewed sponsorship records have been published for this season.', '이번 시즌에는 검토된 후원 기록이 아직 공개되지 않았습니다.', '本賽季尚未公布經複核的贊助記錄，暫無可展示金額。')}</p>
              : <>
                <div className={styles.published}><h3 data-i18n-ignore>{data.label}</h3><label>{t('查看赛段', 'Cycle', '주기 선택', '查看賽段')} <select value={data.cycleId} onChange={event => setSelection({ seasonId, id: event.target.value })}>{data.cycles.map(cycle => <option key={cycle.id} value={cycle.id} data-i18n-ignore>{cycle.label}</option>)}</select></label><small>{t('最近公布', 'Published', '최근 공개', '最近公布')} · {accountDateTime(data.publishedAt, locale)} UTC+8</small></div>
                {data.pendingChanges && <p role="status">{t('存在尚未公布的更新，以下金额仍以标注时间的已复核记录为准。', 'Updates are pending publication. Amounts below remain the reviewed snapshot dated above.', '아직 공개되지 않은 변경이 있습니다. 아래 금액은 위 시점의 검토된 기록입니다.', '存在尚未公布的更新，以下金額仍以標註時間的已複核記錄為準。')}</p>}
                <div className={styles.funds}>{[
                  [t('已收支持款', 'Received', '수령 후원금', '已收支持款'), data.summary.receivedCents],
                  [t('退款预留', 'Refund reserve', '환불 예비금', '退款預留'), data.summary.reserveCents],
                  [t('可分配款', 'Distributable', '배분 가능 금액', '可分配款'), data.summary.distributableCents],
                  [t('已退款', 'Refunded', '환불 완료', '已退款'), data.summary.refundedCents]
                ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{money(value)}</strong></article>)}</div>
                <div className={styles.fundDetails} tabIndex={0} role="region" aria-label={t('资金用途与收支，可横向滚动', 'Allocation and spending, scroll horizontally', '자금 용도 및 수지, 가로 스크롤 가능', '資金用途與收支，可橫向捲動')}><table><caption>{t('当前赛段的已公布收支', 'Published spending for this cycle', '선택한 주기의 공개 수지', '當前賽段的已公布收支')}</caption><thead><tr><th scope="col">{t('用途', 'Purpose', '용도', '用途')}</th>{columns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead><tbody>{purposes.map(([key, label]) => <tr key={key}><th scope="row">{label}</th>{columns.map(([field]) => <td key={field}>{data.summary[field][key] < 0 ? '−' : ''}{money(Math.abs(data.summary[field][key]))}</td>)}</tr>)}</tbody></table></div>
                <p className={styles.note}>{t('赛事方垫付与支持款分别核算；负余额表示待补差。巅峰赛奖池汇总同届各赛段的已公布专款。', 'Organiser advances are separate from support. A negative balance is a shortfall. The Finals pool combines published dedicated funds for this edition.', '주최 측 선지급과 후원금은 별도 회계로 관리합니다. 음수 잔액은 부족분입니다. 파이널 상금은 해당 대회 각 주기의 공개된 전용 자금을 합산합니다.', '賽事方墊付與支持款分別核算；負餘額表示待補差。巔峰賽獎池彙總同屆各賽段的已公布專款。')}</p>
                <div className={styles.pool}><div><small>FCW2026 FINALS</small><h3>{t('巅峰赛筹备奖池', 'Provisional Finals pool', '파이널 잠정 상금', '巔峰賽籌備獎池')}</h3><strong>{money(data.summary.finals.poolCents)}</strong><p>{data.summary.finals.funded ? t('经费已核验落实', 'Funding verified', '자금 확인 완료', '經費已核驗落實') : t('含赛事方保底承诺，差额到账尚待核验', 'Includes the organiser’s minimum commitment; the funding gap is not yet verified.', '주최 측 최소 보장 약정이 포함되어 있으며 부족분 입금은 아직 확인되지 않았습니다.', '含賽事方保底承諾，差額到帳尚待核驗')}</p></div><div>{Object.entries(data.summary.finals.awards).filter(([, amount]) => amount > 0).map(([key, amount]) => <p key={key}>{awardLabels[key]} <b>{money(amount)}</b></p>)}</div></div>
                {data.entryUrl && <a href={data.entryUrl} target="_blank" rel="noreferrer">{t('已确认的观赛入口', 'Confirmed viewing entry', '확인된 시청 링크', '已確認的觀賽入口')} ↗</a>}
                {data.supporters.length > 0 && <div className={styles.thanks}><h3>{t('感谢每一份支持', 'Thank you for your support', '모든 후원에 감사드립니다', '感謝每一份支持')}</h3>{data.supporters.map((supporter, index) => <span key={index} data-i18n-ignore>{supporter.displayName}{supporter.amountCents !== undefined && <small>{money(supporter.amountCents)}</small>}</span>)}</div>}
                {data.upgrades.length > 0 && <><h3>{t('直播升级进度', 'Broadcast upgrades', '중계 개선 현황', '直播升級進度')}</h3>{data.upgrades.map((upgrade, index) => <p key={index}><span data-i18n-ignore>{upgrade.label}</span> · {phaseLabels[upgrade.status] || phaseLabels.PLANNED} · {money(upgrade.amountCents)}</p>)}</>}
              </>}
      </section>
      <section className={styles.section}><div className={styles.sectionHead}><span>02 / PLANS & TERMS</span><h2>{t('支持方式与赛事计划', 'Support & event plans', '후원 방법 및 대회 계획', '支持方式與賽事計畫')}</h2></div>
        <p>{t('支持档位、服务范围、隐私授权、退款细则与赛事候选安排见下列方案书；开放时间和最终赛程以正式公告为准。', 'The proposals below describe support tiers, coverage, privacy consent, refunds and proposed event arrangements. Opening dates and final schedules follow official announcements.', '아래 제안서에서 후원 등급, 서비스 범위, 개인정보 동의, 환불 조건 및 대회 계획을 확인하세요. 개시일과 최종 일정은 공식 공지를 따릅니다.', '支持檔位、服務範圍、隱私授權、退款細則與賽事候選安排見下列方案書；開放時間和最終賽程以正式公告為準。')}</p>
        <div className={styles.links}><a href="/documents/fcw2026-event-plan-v1.9.pdf" target="_blank" rel="noreferrer">{t('赛事方案书 V1.9（中文）', 'Event proposal V1.9 (Chinese)', '대회 제안서 V1.9 (중국어)', '賽事方案書 V1.9（中文）')} ↓</a><a href="/documents/fcw2026-sponsorship-v2.0.pdf" target="_blank" rel="noreferrer">{t('个人赞助计划 V2.0（中文）', 'Personal support plan V2.0 (Chinese)', '개인 후원 계획 V2.0 (중국어)', '個人贊助計畫 V2.0（中文）')} ↓</a></div>
        <p className={styles.note}>{t('方案日期：2026-10-17。接单前请联系南宫核验服务场次、授权与退款条款。', 'Proposal date: 17 Oct 2026. Contact Nangong to confirm coverage, consent and refund terms before ordering.', '제안서 기준일: 2026년 10월 17일. 신청 전에 Nangong에게 서비스 경기, 동의 및 환불 조건을 확인하세요.', '方案日期：2026-10-17。接單前請聯絡南宮核驗服務場次、授權與退款條款。')}</p>
        <div className={styles.contact}><span data-i18n-ignore>南宫 · WeChat nangyd2333</span><a href="mailto:2557456349@qq.com">2557456349@qq.com</a></div>
      </section>
    </>}
  </div>
}
