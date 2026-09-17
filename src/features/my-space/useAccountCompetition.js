import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { readRememberedCompetition, resolveAccountCompetition, withAccountCompetition } from './accountCompetitionModel.js'

export default function useAccountCompetition(publicSeasonId = '') {
  const location = useLocation()
  const { user, accountCompetitions, isAccountDataLoading, accountDataError, refreshAccountData } = useAuth()
  let storage
  try { storage = globalThis.sessionStorage } catch { /* Storage can be disabled. */ }
  const selection = resolveAccountCompetition({
    search: location.search, competitions: accountCompetitions,
    rememberedId: readRememberedCompetition(user?.id, storage), publicSeasonId
  })
  const navigationId = user && accountCompetitions !== null ? selection.id : ''
  return {
    ...selection, competitions: accountCompetitions, loading: isAccountDataLoading,
    navigationId,
    error: accountDataError, refresh: refreshAccountData,
    selected: accountCompetitions?.find(item => item.id === selection.id),
    link: path => withAccountCompetition(path, navigationId, location.search)
  }
}
