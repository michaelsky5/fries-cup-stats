import { roomBanTimedOut, roomBanResolved } from './roomBans.js'
import { RoomCountdownHint, useRoomClockSeconds } from './RoomPhaseClock.jsx'
import { useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwHeroName, formatOwMapName, formatOwMapMode, getOwHero } from '../../lib/heroes.js'
import { getHeroImage, getMapImage } from '../../lib/reviewAssets.js'
import styles from './RoomSelectionWorkbench.module.css'

const roles = [['TANK', '重装'], ['DPS', '输出'], ['SUP', '支援']]
const teamName = team => team?.shortName || team?.name

export function MapSelectionWorkbench({ data, draft, edit, send, disabled, mapType, chosenMap }) {
  const locale = useUiLocale(), t = (key, values) => uiText(key, locale, values)
  const opening = data.opening, later = opening.mapOrder > 1
  const chooser = data.match[`team${opening.winner}`], canChoose = opening.access.canChoose
  const pool = opening.rules.maps.filter(map => map.type === mapType)
  const needsSide = ['Hybrid', 'Escort'].includes(chosenMap?.type)
  const mapSeconds = useRoomClockSeconds(data.phaseClock)
  const locked = disabled || data.phaseClock?.enabled && data.phaseClock.stage?.kind === 'MAP' && data.phaseClock.status !== 'WAITING' && mapSeconds === 0
  const timeout = data.phaseClock?.mapTimeouts?.latest
  const timedHere = timeout?.mapOrder === opening.mapOrder
  const timeoutHint = timedHere ? timeout.count === 1 ? '首次选图超时警告 · 补时 60 秒' : '本图 Ban 权已取消 · 补时 60 秒' : '超时：警告 → 取消 Ban → 随机地图'
  return <div className={styles.mapStage} data-selection-workbench="map">
    <div className={styles.intro}><strong>{t('{0} 选择本图', [teamName(chooser)])}</strong><span>{t(data.phaseClock?.enabled ? timeoutHint : later ? '选定地图后，双方同时确认首发。' : '首图固定占领要点，选定后双方同时确认首发。')}</span></div>
    {canChoose ? <>
      {later && <div className={styles.modeTabs} role="group" aria-label={t('选择地图类型')}>{opening.typeCycle?.types.map(item => <button type="button" key={item.type} aria-pressed={mapType === item.type} disabled={locked || item.used || !item.remaining} onClick={() => edit({ mapType: item.type, mapName: '', startSide: '' })}><strong>{formatOwMapMode(item.type, locale)}</strong><small>{t(item.used ? '本轮已用' : '{0} 张可选', [item.remaining || 0])}</small></button>)}</div>}
      <div className={styles.mapWorkspace}>
        <div className={styles.mapCards} data-compact={pool.length > 3} role="group" aria-label={t('选择第 {0} 图', [opening.mapOrder])}>
          {pool.map((map, index) => <button type="button" key={map.name} aria-pressed={draft.mapName === map.name} disabled={locked || !!map.reason} title={map.reason || formatOwMapName(map.name, locale)} onClick={() => edit({ mapName: map.name, startSide: '' })} style={{ backgroundImage: `linear-gradient(90deg,#141712dc,#14171220),url("${getMapImage(map.type, map.name)}")` }}>
            <span className={styles.mapIndex}>{String(index + 1).padStart(2, '0')}</span><div><small>{formatOwMapMode(map.type, locale)}</small><strong>{formatOwMapName(map.name, locale)}</strong>{map.reason && <span>{map.reason}</span>}</div><b className={styles.mapMark}>{draft.mapName === map.name ? '✓' : '↗'}</b>
          </button>)}
          {!pool.length && <p>{t('本轮剩余类型没有可用地图，请赛管联系管理员补充地图池。')}</p>}
        </div>
        <aside className={styles.selection} data-room-commit="selection" data-selected={!!chosenMap}>
          <div className={styles.selectionTitle}><small>{t('本次选择')}</small><strong>{chosenMap ? formatOwMapName(chosenMap.name, locale) : t('请选择地图')}</strong></div>
          <div className={styles.mapPreview} style={chosenMap ? { backgroundImage: `url("${getMapImage(chosenMap.type, chosenMap.name)}")` } : undefined}>{!chosenMap && <span>MAP {String(opening.mapOrder).padStart(2, '0')}</span>}</div>
          {needsSide ? <div className={styles.sideChoice} role="group" aria-label={t('选择本队攻防顺序')}><small>{t('本队开局攻防')}</small>{[['ATTACK', '先攻', '对方先防'], ['DEFEND', '先防', '对方先攻']].map(([side, label, other]) => <button type="button" key={side} aria-pressed={draft.startSide === side} disabled={locked} onClick={() => edit({ startSide: side })}><b>{t(label)}</b><small>{t(other)}</small></button>)}</div> : <p className={styles.explanation}>{t(chosenMap ? '此模式无需选择攻防。' : '选择地图，在此核对后提交。')}</p>}
          <div className={styles.commit}><small>{t(needsSide && !draft.startSide ? '请选择攻防顺序' : '确认后锁定地图，进入首发确认。')}</small><div className={styles.touchHint}><RoomCountdownHint data={data} action="SELECT_SETUP" /></div><button type="button" disabled={locked || !chosenMap || needsSide && !draft.startSide} onClick={() => send('SELECT_SETUP', { teamId: chooser.id, mapName: chosenMap.name, mapType: chosenMap.type, ...(needsSide ? { startSide: draft.startSide } : {}) })}>{t('确认地图，进入首发')} <span aria-hidden="true">→</span></button></div>
        </aside>
      </div>
    </> : <div className={styles.waiting}><span>02 / MAP</span><h2>{t('等待 {0} 选择地图', [teamName(chooser)])}</h2><p>{t('对方确认后，地图和攻防会直接显示在这里。')}</p></div>}
  </div>
}

export function HeroBanWorkbench({ data, draft, edit, send, disabled, role, setRole, chosenHero }) {
  const locale = useUiLocale(), t = (key, values) => uiText(key, locale, values)
  const [query, setQuery] = useState('')
  const { opening } = data, setup = opening.setup, canBan = opening.access.canBan
  const seconds = useRoomClockSeconds(data.phaseClock)
  const expired = data.phaseClock?.enabled && data.phaseClock?.stage?.kind === 'BAN' && data.phaseClock?.status !== 'WAITING' && seconds === 0
  const activeTeam = data.match[`team${opening.nextSide}`]
  const locked = disabled || expired
  const matchQuery = hero => `${formatOwHeroName(hero.name, locale)} ${hero.name} ${getOwHero(hero.name)?.zh || ''} ${(getOwHero(hero.name)?.aliases || []).join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  const pool = opening.heroes.filter(hero => hero.role === role && matchQuery(hero))
  return <div className={styles.banStage} data-selection-workbench="ban">
    <div className={styles.banSlots}>{['A', 'B'].map(side => {
      const hero = setup?.[`ban${side}`], active = opening.nextSide === side
      return <div key={side} data-active={active} data-locked={!!hero || roomBanTimedOut(setup, side)}>{hero ? <img src={getHeroImage(hero)} alt="" /> : <span className={styles.slotNumber}>{setup?.firstBanSide === side ? '01' : '02'}</span>}<div><small>{teamName(data.match[`team${side}`])} · {t(setup?.firstBanSide === side ? '先 Ban' : '后 Ban')}</small><strong>{hero ? formatOwHeroName(hero, locale) : t(roomBanTimedOut(setup, side) ? '未禁用（超时）' : active ? '正在选择' : '等待对方禁用')}</strong></div><span className={styles.slotState}>{t(roomBanTimedOut(setup, side) ? '已放弃' : hero ? '已锁定' : active ? '当前操作' : '待选择')}</span></div>
    })}</div>
    {canBan ? <div className={styles.heroWorkspace}>
      <div className={styles.heroLibrary}>
        <div className={styles.heroToolbar}><div className={styles.roleTabs} role="group" aria-label={t('筛选英雄职责')}>{roles.map(([value, label]) => <button type="button" key={value} aria-pressed={role === value} onClick={() => setRole(value)}><strong>{t(label)}</strong><small>{opening.heroes.filter(hero => hero.role === value && !hero.reason).length}</small></button>)}</div><input className={styles.search} type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label={t('搜索英雄')} placeholder={t('搜索英雄')} /></div>
        <div className={styles.heroGrid} role="group" aria-label={t('选择禁用英雄')}>{pool.map(hero => <button type="button" key={hero.name} aria-pressed={draft.hero === hero.name} disabled={locked || !!hero.reason} title={hero.reason ? `${formatOwHeroName(hero.name, locale)} · ${hero.reason}` : formatOwHeroName(hero.name, locale)} onClick={() => edit({ hero: hero.name })}>
          <img src={getHeroImage(hero.name, hero.role)} alt="" /><span>{formatOwHeroName(hero.name, locale)}</span>{hero.reason ? <small className={styles.restricted}>{t('不可选')}</small> : draft.hero === hero.name ? <b className={styles.heroMark}>✓</b> : null}
        </button>)}</div>
        {!pool.length && <p className={styles.noHeroes}>{t('没有匹配的英雄，请切换职责或清空搜索。')}</p>}
        <small className={styles.poolNote}>{[...new Set(pool.map(hero => hero.reason).filter(Boolean))].join('；') || t('灰色英雄不可禁用，规则限制显示在下方。')}</small>
      </div>
      <aside className={styles.selection} data-room-commit="selection" data-selected={!!chosenHero}>
        <div className={styles.selectionTitle}><small>{t('本次禁用')}</small><strong>{chosenHero ? formatOwHeroName(chosenHero.name, locale) : t('请选择英雄')}</strong></div>
        <div className={styles.heroPreview}>{chosenHero ? <img src={getHeroImage(chosenHero.name, chosenHero.role)} alt={formatOwHeroName(chosenHero.name, locale)} /> : <span>BAN</span>}</div>
        <p className={styles.explanation}>{t(expired ? '禁用时间已到，正在同步超时放弃结果。' : data.phaseClock?.enabled ? '请在倒计时结束前确认；超时自动放弃本轮禁用权，不得补 Ban。' : chosenHero ? '确认后，本图双方均不可使用此英雄。' : '选择英雄后，在此核对并锁定禁用。')}</p>
        <div className={styles.commit}><small>{t(roomBanResolved(setup, 'A') || roomBanResolved(setup, 'B') ? '确认后完成本图选禁，等待实际开赛。' : '确认后轮到对方禁用英雄。')}</small><div className={styles.touchHint}><RoomCountdownHint data={data} action="BAN" /></div><button type="button" disabled={locked || !chosenHero} onClick={() => send('BAN', { teamId: activeTeam.id, hero: chosenHero.name, heroRole: chosenHero.role })}>{chosenHero ? t('确认禁用 {0}', [formatOwHeroName(chosenHero.name, locale)]) : t('确认禁用')} <span aria-hidden="true">→</span></button></div>
      </aside>
    </div> : <div className={styles.waiting}><span>04 / HERO BAN</span><h2>{t('等待 {0} 禁用英雄', [teamName(activeTeam)])}</h2><p>{t('禁用结果会自动显示，无需返回地图栏查找。')}</p></div>}
  </div>
}
