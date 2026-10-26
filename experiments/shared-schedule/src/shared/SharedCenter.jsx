import NativeSourcePage from './NativeSourcePage.jsx'
import SignalWeeklyOverview from '../generated/mobile/SignalWeeklyOverview.jsx'
import MatchesPage from '../generated/mobile/MatchesPage.jsx'
import {SEASONS,getSeasonName} from './publicSeasons.js'
import {Link,useOutletContext} from './nativeDesignRuntime.jsx'
function SeasonDirectory(){const {locale}=useOutletContext();return <section className='native-season-directory'><p>SEASON ARCHIVE</p><h1>历史赛事</h1>{SEASONS.map(season=><Link key={season.id} to={'/?season='+season.id+'&lang='+locale}><span>{season.publicCode}</span><strong>{getSeasonName(season,locale)}</strong><b>↗</b></Link>)}</section>}
export default function SharedCenter(props){return <NativeSourcePage {...props}>{props.view==='matches'?<MatchesPage/>:props.view==='history'?<SeasonDirectory/>:<SignalWeeklyOverview/>}</NativeSourcePage>}