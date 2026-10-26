import PublicPage from '../../center/pages/PublicPage.jsx'
import NativeSourcePage from '../../shared/NativeSourcePage.jsx'
import Leaderboard from '../../generated/mobile/LeaderboardPage.jsx'
export function Render(props){return <NativeSourcePage {...props}><Leaderboard/></NativeSourcePage>}
export default function Page(){return <PublicPage Render={Render} pageKind='ranking'/>}
