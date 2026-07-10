import assert from 'node:assert/strict'

import { getPlayerDirectory } from '../src/lib/rosterSelectors.js'

const sharedNickname = '小海'
const db = {
  teams: [
    {
      team_id: 'TEAM-A',
      team_name: 'Tank Team',
      team_short_name: 'A',
      player_ids: ['PLAYER-TANK']
    },
    {
      team_id: 'TEAM-B',
      team_name: 'Support Team',
      team_short_name: 'B',
      player_ids: ['PLAYER-SUPPORT']
    },
    {
      team_id: 'TEAM-C',
      team_name: 'First DPS Team',
      team_short_name: 'C',
      player_ids: ['PLAYER-DPS-ONE']
    },
    {
      team_id: 'TEAM-D',
      team_name: 'Second DPS Team',
      team_short_name: 'D',
      player_ids: ['PLAYER-DPS-TWO']
    }
  ],
  players: [
    {
      player_id: 'PLAYER-TANK',
      player_name: 'TankPlayer#1000',
      nickname: sharedNickname,
      display_name: sharedNickname,
      role: 'TANK',
      team_id: 'TEAM-A'
    },
    {
      player_id: 'PLAYER-SUPPORT',
      player_name: 'SupportPlayer#2000',
      nickname: sharedNickname,
      display_name: sharedNickname,
      role: 'SUP',
      team_id: 'TEAM-B'
    },
    {
      player_id: 'PLAYER-DPS-ONE',
      player_name: 'FirstDps#3000',
      nickname: 'LIP',
      display_name: 'LIP',
      role: 'DPS',
      team_id: 'TEAM-C'
    },
    {
      player_id: 'PLAYER-DPS-TWO',
      player_name: 'SecondDps#4000',
      nickname: 'LIP',
      display_name: 'LIP',
      role: 'DPS',
      team_id: 'TEAM-D'
    }
  ],
  player_totals: [
    {
      player_id: 'PLAYER-TANK',
      player_name: 'TankPlayer#1000',
      nickname: sharedNickname,
      display_name: sharedNickname,
      role: 'TANK',
      team_id: 'TEAM-A',
      maps_played: 9,
      raw_time_mins: 94,
      most_played_hero: 'Sigma',
      top_3_heroes: ['Sigma'],
      role_breakdown: {
        TANK: {
          maps_played: 9,
          raw_time_mins: 94,
          most_played_hero: 'Sigma',
          top_3_heroes: ['Sigma']
        }
      }
    },
    {
      player_id: 'PLAYER-SUPPORT',
      player_name: 'SupportPlayer#2000',
      nickname: sharedNickname,
      display_name: sharedNickname,
      role: 'SUP',
      team_id: 'TEAM-B',
      maps_played: 8,
      raw_time_mins: 100,
      most_played_hero: 'Kiriko',
      top_3_heroes: ['Kiriko'],
      role_breakdown: {
        SUPPORT: {
          maps_played: 8,
          raw_time_mins: 100,
          most_played_hero: 'Kiriko',
          top_3_heroes: ['Kiriko']
        }
      }
    },
    {
      player_id: 'PLAYER-DPS-ONE',
      player_name: 'FirstDps#3000',
      nickname: 'LIP',
      display_name: 'LIP',
      role: 'DPS',
      team_id: 'TEAM-C',
      maps_played: 4,
      raw_time_mins: 43,
      most_played_hero: 'Pharah',
      top_3_heroes: ['Pharah'],
      role_breakdown: {
        DPS: {
          maps_played: 4,
          raw_time_mins: 43,
          most_played_hero: 'Pharah',
          top_3_heroes: ['Pharah']
        }
      }
    },
    {
      player_id: 'PLAYER-DPS-TWO',
      player_name: 'SecondDps#4000',
      nickname: 'LIP',
      display_name: 'LIP',
      role: 'DPS',
      team_id: 'TEAM-D',
      maps_played: 7,
      raw_time_mins: 74,
      most_played_hero: 'Sojourn',
      top_3_heroes: ['Sojourn'],
      role_breakdown: {
        DPS: {
          maps_played: 7,
          raw_time_mins: 74,
          most_played_hero: 'Sojourn',
          top_3_heroes: ['Sojourn']
        }
      }
    }
  ]
}

const directory = getPlayerDirectory(db, {})
const tankPlayer = directory.find(player => player.player_id === 'PLAYER-TANK')
const supportPlayer = directory.find(player => player.player_id === 'PLAYER-SUPPORT')
const firstDpsPlayer = directory.find(player => player.player_id === 'PLAYER-DPS-ONE')
const secondDpsPlayer = directory.find(player => player.player_id === 'PLAYER-DPS-TWO')

assert.equal(tankPlayer?.avatar?.heroName, 'Sigma')
assert.deepEqual(tankPlayer?.playedRoles, ['TANK'])
assert.equal(supportPlayer?.avatar?.heroName, 'Kiriko')
assert.deepEqual(supportPlayer?.playedRoles, ['SUP'])
assert.equal(firstDpsPlayer?.avatar?.heroName, 'Pharah')
assert.equal(secondDpsPlayer?.avatar?.heroName, 'Sojourn')

console.log('Roster identity resolution assertions passed.')
