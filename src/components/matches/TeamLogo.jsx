import { useEffect, useState } from 'react'
import { getTeamLogoCandidates } from '../../lib/matchesSelectors.js'
import { getPreferredTeamShortName } from '../../lib/teamDisplayIdentity.js'

function getTeamShort(team, teamShortName, teamName) {
  const short = teamShortName || team?.team_short_name || team?.short || teamName || team?.team_name || team?.name || 'TBD'
  return getPreferredTeamShortName(short, teamName || team?.team_name || team?.fullName || team?.full || team?.name)
}

export default function TeamLogo({ team, seasonId, teamShortName, teamName, className = '', large = false, fallbackSrc = '' }) {
  const logoTeam = team || {
    team_short_name: teamShortName,
    short: teamShortName,
    team_name: teamName,
    name: teamName
  }
  const candidates = getTeamLogoCandidates(logoTeam, seasonId, { fallbackSrc })
  const candidateKey = candidates.join('|')
  const [index, setIndex] = useState(0)
  const src = candidates[index]
  const short = getTeamShort(team, teamShortName, teamName)

  useEffect(() => {
    setIndex(0)
  }, [candidateKey])

  return (
    <span className={className} data-size={large ? 'large' : 'default'}>
      {src ? (
        <img
          src={src}
          alt={`${short} logo`}
          loading="lazy"
          data-default-team-logo={fallbackSrc && src === fallbackSrc ? 'ow' : undefined}
          onError={() => setIndex(current => current + 1)}
        />
      ) : (
        <b>{short.slice(0, 4)}</b>
      )}
    </span>
  )
}
