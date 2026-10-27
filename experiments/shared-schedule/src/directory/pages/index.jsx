import PublicPage from '../../center/pages/PublicPage.jsx'
import NativeSourcePage from '../../shared/NativeSourcePage.jsx'
import Roster from '../../generated/mobile/RosterHubPage.jsx'
import Players from '../../generated/mobile/PlayersPage.jsx'
import Teams from '../../generated/mobile/TeamsPage.jsx'
function Contents({props}){return props.params.directory==='players'?<Players/>:props.params.directory==='teams'?<Teams/>:<Roster/>}
export function Render(props){return <NativeSourcePage {...props}><Contents props={props}/></NativeSourcePage>}
export default function Page(){return <PublicPage Render={Render} pageKind='directory'/>}
