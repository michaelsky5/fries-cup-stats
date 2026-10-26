import PublicPage from '../../center/pages/PublicPage.jsx'
import NativeSourcePage from '../../shared/NativeSourcePage.jsx'
import Player from '../../generated/mobile/PlayerDetailPage.jsx'
function Contents(){return <Player/>}
export function Render(props){return <NativeSourcePage {...props}><Contents props={props}/></NativeSourcePage>}
export default function Page(){return <PublicPage Render={Render} pageKind='player'/>}
