import PublicPage from '../../center/pages/PublicPage.jsx'
import NativeSourcePage from '../../shared/NativeSourcePage.jsx'
import Following from '../../generated/mobile/FollowingPage.jsx'
export function Render(props){return <NativeSourcePage {...props}><Following/></NativeSourcePage>}
export default function Page(){return <PublicPage Render={Render} pageKind='following'/>}
