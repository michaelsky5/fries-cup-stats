import PublicPage from '../../center/pages/PublicPage.jsx'
import NativeSourcePage from '../../shared/NativeSourcePage.jsx'
import Maps from '../../generated/mobile/MapStatsPage.jsx'
import Map from '../../generated/mobile/MapDetailPage.jsx'
import Heroes from '../../generated/mobile/HeroesPage.jsx'
import Staff from '../../generated/mobile/StaffPage.jsx'
import StaffDetail from '../../generated/mobile/StaffDetailPage.jsx'
function Contents({props}){return props.view==='maps'?props.params.map?<Map/>:<Maps/>:props.view==='heroes'?<Heroes/>:props.params.staff?<StaffDetail/>:<Staff/>}
export function Render(props){return <NativeSourcePage {...props}><Contents props={props}/></NativeSourcePage>}
export default function Page(){return <PublicPage Render={Render} pageKind='evidence'/>}
