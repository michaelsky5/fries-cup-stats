import PublicPage from '../../center/pages/PublicPage.jsx'
import NativeSourcePage from '../../shared/NativeSourcePage.jsx'
import Team from '../../generated/mobile/TeamDetailPage.jsx'
function Contents(){return <Team/>}
export function Render(props){return <NativeSourcePage {...props}><Contents props={props}/></NativeSourcePage>}
export default function Page(){return <PublicPage Render={Render} pageKind='team'/>}
