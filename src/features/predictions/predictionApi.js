import { platformRequest } from '../auth/platformApi.js'

export async function fetchPredictionBoard(seasonId) {
  return platformRequest(`/seasons/${encodeURIComponent(seasonId)}/prediction-board`)
}

export async function fetchPredictionLeaderboard(seasonId, limit = 100) {
  return platformRequest(`/seasons/${encodeURIComponent(seasonId)}/prediction-leaderboard?limit=${limit}`)
}

export async function fetchMyPredictions(seasonId) {
  const data = await platformRequest(`/me/predictions?seasonId=${encodeURIComponent(seasonId)}`)
  return Array.isArray(data?.predictions) ? data.predictions : []
}

export async function savePrediction(matchId, payload) {
  const data = await platformRequest(`/matches/${encodeURIComponent(matchId)}/me/prediction`, {
    method: 'PUT',
    body: payload
  })
  return data?.prediction || null
}
