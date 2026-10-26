import { useMemo } from 'react'
import PublicHeader from '../generated/mobile/PublicHeader.jsx'
import EventContextBar from '../generated/mobile/EventContextBar.jsx'
import MobileSeasonArchive from '../generated/mobile/MobileSeasonArchive.jsx'
import { NativeDesignProvider,useOutletContext,changeNativeLanguage } from './nativeDesignRuntime.jsx'
import { getPrimaryNavigation,getNavLabel } from './nativePublicNavigation.js'
import { SEASONS,seasonHasReview,isWeeklySeason } from './publicSeasons.js'
import { getGlobalSummary } from '../../../../src/lib/selectors.js'
import { formatUpdatedAt } from '../../../../src/lib/format.js'
import { getPublicDataStatus } from '../../../../src/lib/publicDataStatus.js'
import { getArchiveHighlights,getHomeSummary,getOverviewStatus,getSeasonStatus } from '../../../../src/lib/homeSelectors.js'
import { getArchiveStory,getChampionResult } from '../../../../src/features/kpr-design/kprSelectors.js'
import { pickUiLocale } from '../../../../src/lib/uiText.js'
import { changeSeason } from '../platform.js'
import { nativeSelectorClasses } from './nativeDesignModel.js'
import styles from '../generated/mobile/layoutStyles.js'
import { getNativeLayoutState } from '../generated/mobile/layoutState.js'
import '../generated/public-foundation.css'
import './native-design-adapter.css'

function FrameContents({props,season,children}) {
  const context=useOutletContext(), {raw,locale,view,params,loading,error,stale,onRetry}=props
  const summary=getGlobalSummary(raw), seasonStatus=getSeasonStatus(raw,season)
  const archived=view==='overview' && !isWeeklySeason(season) && seasonStatus.isFinished
  const headerContextMode=view==='overview'?'overview':'data'
  const layout=getNativeLayoutState({...context.location,isWeekly:isWeeklySeason(season)})
  const directory=layout.isCompactContextRoute
  const nav=getPrimaryNavigation(false), activeGroup=layout.activeGroup||view
  const item=nav.find(item=>item.group===view) || nav[0]
  const activeSection={code:item.en,label:getNavLabel(item,locale),number:String(nav.indexOf(item)+1).padStart(2,'0')}
  const dataStatus=getPublicDataStatus({isLoading:loading&&!raw,error:raw?'':error,isRefreshing:loading&&!!raw,refreshError:raw&&(error||stale),dataSource:{kind:archived?'review-archive':'public'}},locale)
  const updatedAtText=formatUpdatedAt(summary.updatedAt,'—')
  const contextProps={season,seasonId:season.id,locale,seasons:SEASONS,updatedAtText,seasonStatus,activeSummary:summary,isSyncing:loading,dataStatus,activeSection,contextMode:headerContextMode,onSeasonChange:id=>changeSeason(id,view)}
  const pageStates=nativeSelectorClasses({'data-roster-index':layout.isRosterIndexRoute||undefined,'data-roster-directory':layout.isRosterDirectoryRoute||undefined,'data-schedule-directory':layout.isScheduleDirectoryRoute||undefined,'data-match-detail':layout.isPublicMatchDetailRoute||undefined,'data-player-rankings':layout.isPlayerRankingsRoute||undefined,'data-hero-data':layout.isHeroDataRoute||undefined,'data-map-data':layout.isMapDataRoute||undefined,'data-data-section':layout.isEditorialDataRoute||undefined,'data-team-archive':layout.isTeamArchiveRoute||undefined})
  const states=nativeSelectorClasses({'data-design':'kpr','data-design-edition':'hybrid','data-kpr-page':layout.isKprSamplePage?'sample':'legacy','data-locale':locale,'data-header-mode':headerContextMode,'data-archive-home':archived||undefined,'data-compact-context':directory||undefined,'data-team-exhibition':layout.isTeamExhibitionRoute||undefined,'data-weekly-advance':layout.isWeeklyAdvanceRoute||undefined})+' '+pageStates
  return <div className={`shared-root center-root native-stats-frame ${styles.shell} ${states} shared-has-phone-navigation ${archived?'shared-has-mobile-season-archive':''}`} style={{'--kpr-preview-height':'0px'}} data-native-stats-design='current'>
    <PublicHeader {...contextProps} accountControl={null} showAccountModeSwitch={false} summary={summary} activeGroup={activeGroup} layoutLocale={locale} compatibleLayoutLocale={locale} withSeason={context.withSeason} activeNavLabel={activeSection.label} handleSeasonChange={contextProps.onSeasonChange} headerContextMode={headerContextMode} handleLocaleChange={changeNativeLanguage} />
    {!archived ? <div className={styles.contentContextDock}><EventContextBar {...contextProps} placement='content' presentation={directory?'directory':'default'} onRetry={onRetry}/></div> : null}
    <div className={`${styles.pageFrame} ${pageStates}`}><main className={styles.main}>
      {raw&&dataStatus.notice&&!directory?<div className={`${styles.dataNotice} ${styles.dataNoticeCompact} ${nativeSelectorClasses({'data-source':dataStatus.key})}`} role='status'>
        <div><strong>{dataStatus.label}</strong><p>{dataStatus.notice}</p></div>
        <button type='button' className={styles.dataRetry} onClick={onRetry} disabled={loading}>{loading?dataStatus.refreshingLabel:dataStatus.retryLabel}</button>
      </div>:null}
      {children}
    </main></div>
  </div>
}
export default function NativePublicFrame({props,season,children}) {
  return <NativeDesignProvider props={props} season={season}><FrameContents props={props} season={season}>{children}</FrameContents></NativeDesignProvider>
}
export function NativeArchiveHome({raw,season,locale}) {
  const {withSeason}=useOutletContext()
  const value=useMemo(()=>{
    const archive=getArchiveHighlights(raw,season), overview=getOverviewStatus(raw,season)
    return {archive,overview,summary:getHomeSummary(raw),story:getArchiveStory(raw,season,archive),finalResult:getChampionResult(archive.finalMatch,archive.champion)}
  },[raw,season])
  return <MobileSeasonArchive {...value} code={value.overview.eventCode||season.publicCode||season.id} seasonId={season.id} locale={locale} withSeason={withSeason} includeReview={seasonHasReview(season,raw)} eventKindLabel={season.kind==='PARTNER'?pickUiLocale(locale,'合作赛事','Partner event','협력 대회','合作賽事'):pickUiLocale(locale,'官方赛事','Official event','공식 대회','官方賽事')}/>
}
