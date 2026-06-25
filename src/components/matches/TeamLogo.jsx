import { useEffect, useMemo, useState } from 'react'
import { getTeamLogoCandidates } from '../../lib/matchesSelectors.js'

function getTeamShort(team, teamShortName, teamName) {
  return teamShortName || team?.team_short_name || team?.short || teamName || team?.team_name || team?.name || 'TBD'
}

export default function TeamLogo({ team, seasonId, teamShortName, teamName, className = '', large = false }) {
  const logoTeam = team || {
    team_short_name: teamShortName,
    short: teamShortName,
    team_name: teamName,
    name: teamName
  }
  const candidates = useMemo(
    () => getTeamLogoCandidates(logoTeam, seasonId),
    [seasonId, logoTeam?.team_id, logoTeam?.id, logoTeam?.team_short_name, logoTeam?.short, logoTeam?.team_name, logoTeam?.name]
  )
  const [index, setIndex] = useState(0)
  const src = candidates[index]
  const short = getTeamShort(team, teamShortName, teamName)

  useEffect(() => {
    setIndex(0)
  }, [candidates.join('|')])

  return (
    <span className={className} data-size={large ? 'large' : 'default'}>
      {src ? (
        <img
          src={src}
          alt={`${short} logo`}
          loading="lazy"
          onError={() => setIndex(current => current + 1)}
        />
      ) : (
        <b>{short.slice(0, 4)}</b>
      )}
    </span>
  )
}
