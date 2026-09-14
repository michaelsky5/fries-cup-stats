import { useState } from 'react'
import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import KprDialog from './KprDialog.jsx'
import styles from './ArchiveCredits.module.css'

export default function ArchiveCredits({ locale, dataStatus, updatedAtText, showStatus }) {
  const [open, setOpen] = useState(false)
  const text = (...values) => pickUiLocale(locale, ...values)
  const title = text('素材与许可', 'Materials & licenses', '소재 및 라이선스', '素材與許可')
  return <div className={styles.credits} data-archive-credits>
    <div className={styles.notices}>
      <p>{uiText('非官方社区网站。守望先锋美术素材版权归 Blizzard Entertainment 所有。', locale)}</p>
      <div className={styles.resources}>
        <span>{text('本站使用 ', 'This site uses ', '이 사이트는 다음 글꼴을 사용합니다: ', '本站使用 ')}<a href="/fonts/harmonyos/LICENSE.txt" target="_blank" rel="noreferrer">HarmonyOS Sans</a></span>
        <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>{title} <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    {showStatus ? <div className={styles.status} data-archive-data-status data-source={dataStatus?.key}>
      <span>{dataStatus?.label || uiText('数据更新于', locale)}</span><time>{updatedAtText || '—'}</time>
    </div> : null}
    <KprDialog open={open} onClose={() => setOpen(false)} title={title} compact locale={locale}>
      <dl className={styles.materials}>
        <div><dt>HarmonyOS Sans</dt><dd>{text('界面与中文排版', 'Interface and Chinese typography', '인터페이스 및 중국어 글꼴', '介面與中文排版')}<a href="/fonts/harmonyos/LICENSE.txt" target="_blank" rel="noreferrer">HarmonyOS Sans Fonts License ↗</a></dd></div>
        <div><dt>Barlow Condensed</dt><dd>{text('英文标题与数字', 'Display lettering and numbers', '영문 제목 및 숫자', '英文標題與數字')}<a href="/fonts/barlow-condensed/OFL.txt" target="_blank" rel="noreferrer">SIL Open Font License 1.1 ↗</a></dd></div>
        <div><dt>Paper 001 · ambientCG</dt><dd>{text('纸张纹理 · Lennart Demes', 'Paper texture · Lennart Demes', '종이 텍스처 · Lennart Demes', '紙張紋理 · Lennart Demes')}<a href="https://ambientcg.com/view?id=Paper001" target="_blank" rel="noreferrer">{text('素材来源', 'Source', '출처', '素材來源')} ↗</a><a href="https://docs.ambientcg.com/license/" target="_blank" rel="noreferrer">CC0 1.0 ↗</a></dd></div>
      </dl>
    </KprDialog>
  </div>
}
