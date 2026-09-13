import { localizeUiCopy } from './uiText.js'

const COPY = {
  'zh-CN': {
    loading: '正在载入', refreshing: '正在更新', fallback: '备用快照', error: '更新失败', local: '本地预览', archive: '回顾归档于', ready: '数据更新于',
    fallbackNotice: '当前显示随网站提供的备用快照，可能不是最新赛果。',
    errorNotice: '暂时无法取得最新数据，保留上次可用记录。',
    retryingNotice: '正在重新获取最新数据，当前仍显示上次可用记录。',
    localNotice: '当前使用本地预览数据。', retry: '重新获取数据'
  },
  'en-US': {
    loading: 'Loading', refreshing: 'Updating', fallback: 'Fallback snapshot', error: 'Update failed', local: 'Local preview', archive: 'Review archived', ready: 'Updated',
    fallbackNotice: 'Showing the bundled fallback snapshot. Results may be out of date.',
    errorNotice: 'Latest data is unavailable. The last available records remain visible.',
    retryingNotice: 'Retrying the update. The last available records remain visible.',
    localNotice: 'Showing local preview data.', retry: 'Retry update'
  },
  'ko-KR': {
    loading: '불러오는 중', refreshing: '업데이트 중', fallback: '대체 스냅샷', error: '업데이트 실패', local: '로컬 미리보기', archive: '리뷰 보관일', ready: '업데이트',
    fallbackNotice: '웹사이트에 포함된 대체 기록입니다. 최신 결과와 다를 수 있습니다.',
    errorNotice: '최신 데이터를 가져올 수 없어 마지막 기록을 표시합니다.',
    retryingNotice: '업데이트를 다시 시도하는 동안 마지막 기록을 표시합니다.',
    localNotice: '로컬 미리보기 데이터를 표시합니다.', retry: '다시 불러오기'
  }
}

export function getPublicDataStatus({ isLoading, isRefreshing, isUsingFallback, refreshError, dataSource }, locale = 'zh-CN') {
  const copy = COPY[locale] || localizeUiCopy(COPY['zh-CN'], locale)
  const retrying = !isLoading && isRefreshing && refreshError
  const key = isLoading ? 'loading' : isUsingFallback ? 'fallback' : retrying ? 'refreshing' : refreshError ? 'error'
    : dataSource?.kind === 'review-archive' ? 'archive' : dataSource?.kind === 'local-preview' ? 'local' : isRefreshing ? 'refreshing' : 'ready'
  const notice = isUsingFallback ? copy.fallbackNotice : retrying ? copy.retryingNotice : refreshError ? copy.errorNotice : key === 'local' ? copy.localNotice : ''
  return { key, label: copy[key], notice, retryLabel: copy.retry, refreshingLabel: copy.refreshing }
}

export function getSeasonLifecycleGroup(season, status) {
  if (status?.totalMatches) return status.isFinished ? 'ARCHIVE' : 'CURRENT'
  const lifecycle = String(season?.lifecycle || '').toUpperCase()
  return ['ARCHIVED', 'COMPLETED'].includes(lifecycle) ? 'ARCHIVE' : 'CURRENT'
}
