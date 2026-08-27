import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

import { getShareHeroArtwork } from '../src/features/player-share/heroShareArtworkResolver.js'
import { formatOwHeroName, getOwHeroAssetKey, getOwHeroRole } from '../src/lib/heroes.js'
import { getPlayerDirectory, getPlayerRoleBreakdown } from '../src/lib/rosterSelectors.js'

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

const roleAwareDb = {
  teams: [],
  players: [
    { player_id: 'PLAYER-EVER', player_name: 'EVER#53569', display_name: 'EVER', role: 'TANK' },
    { player_id: 'PLAYER-XIAOWAI', player_name: '小歪#52137', display_name: '小歪', role: 'DPS' },
    { player_id: 'PLAYER-FLEX', player_name: 'FlexPlayer#5000', display_name: 'FlexPlayer', role: 'FLEX' },
    { player_id: 'PLAYER-FIXED-SUPPORT', player_name: 'FixedSupport#6000', display_name: 'FixedSupport', role: 'SUP' }
  ],
  player_totals: [
    {
      player_id: 'PLAYER-EVER',
      role: 'TANK',
      maps_played: 2,
      raw_time_mins: 13,
      most_played_hero: 'Tracer',
      top_3_heroes: ['Tracer', 'D.Mon'],
      role_breakdown: {
        TANK: { maps_played: 1, raw_time_mins: 6, most_played_hero: 'D.Mon', top_3_heroes: ['D.Mon'], avg_block: '5904.396' },
        DPS: { maps_played: 1, raw_time_mins: 7, most_played_hero: 'Tracer', top_3_heroes: ['Tracer'] }
      }
    },
    {
      player_id: 'PLAYER-XIAOWAI',
      role: 'DPS',
      maps_played: 3,
      raw_time_mins: 24,
      most_played_hero: 'Doomfist',
      top_3_heroes: ['Doomfist', 'Tracer', 'Juno'],
      role_breakdown: {
        TANK: { maps_played: 1, raw_time_mins: 7, most_played_hero: 'Doomfist', top_3_heroes: ['Doomfist'] },
        DPS: { maps_played: 1, raw_time_mins: 6, most_played_hero: 'Tracer', top_3_heroes: ['Tracer'], avg_dmg: '6893.407' },
        SUPPORT: { maps_played: 1, raw_time_mins: 11, most_played_hero: 'Juno', top_3_heroes: ['Juno'] }
      }
    },
    {
      player_id: 'PLAYER-FLEX',
      role: 'SUPPORT',
      maps_played: 4,
      raw_time_mins: 40,
      most_played_hero: 'Kiriko',
      top_3_heroes: ['Kiriko'],
      role_breakdown: {
        SUPPORT: { maps_played: 4, raw_time_mins: 40, most_played_hero: 'Kiriko', top_3_heroes: ['Kiriko'], avg_heal: '8123.456' }
      }
    },
    {
      player_id: 'PLAYER-FIXED-SUPPORT',
      role: 'DPS',
      maps_played: 5,
      raw_time_mins: 50,
      most_played_hero: 'Tracer',
      top_3_heroes: ['Tracer', 'Juno'],
      role_breakdown: {
        DPS: { maps_played: 3, raw_time_mins: 30, most_played_hero: 'Tracer', top_3_heroes: ['Tracer'] },
        SUPPORT: { maps_played: 2, raw_time_mins: 20, most_played_hero: 'Juno', top_3_heroes: ['Juno'], avg_heal: '7654.321' }
      }
    }
  ]
}

const roleAwareDirectory = getPlayerDirectory(roleAwareDb, {})
const ever = roleAwareDirectory.find(player => player.player_id === 'PLAYER-EVER')
const xiaowai = roleAwareDirectory.find(player => player.player_id === 'PLAYER-XIAOWAI')
const flexPlayer = roleAwareDirectory.find(player => player.player_id === 'PLAYER-FLEX')
const fixedSupport = roleAwareDirectory.find(player => player.player_id === 'PLAYER-FIXED-SUPPORT')

assert.equal(ever?.role, 'TANK')
assert.equal(ever?.avatar?.heroName, 'D.Mon')
assert.equal(getPlayerRoleBreakdown(ever, 'TANK')?.avg_block, '5904.396')
assert.equal(xiaowai?.role, 'DPS')
assert.equal(xiaowai?.avatar?.heroName, 'Tracer')
assert.equal(getPlayerRoleBreakdown(xiaowai, 'DPS')?.avg_dmg, '6893.407')
assert.equal(flexPlayer?.role, 'FLEX')
assert.equal(flexPlayer?.registeredRole, 'FLEX')
assert.equal(flexPlayer?.performanceRole, 'SUP')
assert.equal(flexPlayer?.avatar?.heroName, 'Kiriko')
assert.equal(fixedSupport?.role, 'SUP')
assert.equal(fixedSupport?.performanceRole, 'SUP')
assert.equal(fixedSupport?.avatar?.heroName, 'Juno')

assert.equal(formatOwHeroName('D.Mon', 'zh-CN'), 'D.Mon')
assert.equal(formatOwHeroName('DMon', 'en-US'), 'D.Mon')
assert.equal(getOwHeroRole('D.Mon'), 'tank')
assert.equal(getOwHeroAssetKey('D.Mon'), 'dmon')
assert.equal(getShareHeroArtwork('D.Mon', 'TANK').src, '/roster/tank/dmon.png')
assert.equal(getShareHeroArtwork('D.Mon', 'TANK').fallbackSrc, '/heroes/tank/dmon.png')
assert.equal(getShareHeroArtwork('Kiriko', 'FLEX').src, '/roster/support/kiriko.png')
assert.equal(getShareHeroArtwork('Jetpack Cat', 'FLEX').src, '/roster/support/jetpack_cat.png')
assert.equal(getShareHeroArtwork('Anran', 'FLEX').src, '/roster/damage/anran.png')
assert.equal(existsSync(new URL('../public/heroes/tank/dmon.png', import.meta.url)), true)
assert.equal(existsSync(new URL('../public/roster/tank/dmon.png', import.meta.url)), true)

console.log('Roster identity resolution assertions passed.')
