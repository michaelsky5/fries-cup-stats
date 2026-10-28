import PublicPage from '../../center/pages/PublicPage.jsx'
import NativeSourcePage from '../../shared/NativeSourcePage.jsx'
import Entry from '../../generated/mobile/ReviewEntryPage.jsx'
import Story from '../../generated/mobile/ReviewStoryPage.jsx'
import {useOutletContext} from '../../shared/nativeDesignRuntime.jsx'
function Contents({props}){const context=useOutletContext();return props.params.story?<Story storyType={context.nativeStoryType}/>:<Entry/>}
export function Render(props){return <NativeSourcePage {...props}><Contents props={props}/></NativeSourcePage>}
export default function Page(){return <PublicPage Render={Render} pageKind='review'/>}
