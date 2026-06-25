import { useEffect, useRef } from 'react'
import styles from './RosterComponents.module.css'

function getPageItems(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  if (page <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
    pages.add(totalPages - 3)
  }

  const sorted = [...pages]
    .filter(value => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b)

  return sorted.reduce((items, value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) items.push('ellipsis')
    items.push(value)
    return items
  }, [])
}

export default function RosterPagination({
  pagination,
  pageSizeOptions = [],
  onPageChange,
  onPageSizeChange,
  scrollTargetRef
}) {
  const pendingPageScrollRef = useRef(false)

  useEffect(() => {
    if (!pendingPageScrollRef.current) return undefined
    pendingPageScrollRef.current = false

    const frame = window.requestAnimationFrame(() => {
      const target = scrollTargetRef?.current
      if (!target) return

      const header = document.querySelector('header')
      const stickyControls = document.querySelector('[class*="stickyRosterControls"]')
      const headerHeight = header?.getBoundingClientRect().height || 0
      const stickyHeight = stickyControls?.getBoundingClientRect().height || 0
      const targetTop = target.getBoundingClientRect().top + window.scrollY
      const offset = headerHeight + stickyHeight + 18

      window.scrollTo({
        top: Math.max(0, targetTop - offset),
        behavior: 'auto'
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pagination?.page, pagination?.pageSize, pagination?.startIndex, scrollTargetRef])

  if (!pagination || pagination.totalItems === 0) return null

  const { page, pageSize, totalPages, totalItems, startIndex, endIndex } = pagination
  const pageItems = getPageItems(page, totalPages)
  const changePage = nextPage => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    pendingPageScrollRef.current = true
    onPageChange?.(nextPage)
  }

  return (
    <nav className={styles.pagination} aria-label="Roster pagination">
      <div className={styles.paginationRange}>
        第 {startIndex}–{endIndex} 项，共 {totalItems} 项
      </div>

      <div className={styles.paginationControls}>
        <button
          type="button"
          className={styles.pageButton}
          onClick={() => changePage(page - 1)}
          disabled={page <= 1}
        >
          上一页
        </button>

        <div className={styles.pageNumbers}>
          {pageItems.map((item, index) => item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`${styles.pageNumber} ${item === page ? styles.pageNumberActive : ''}`}
              onClick={() => changePage(item)}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.pageButton}
          onClick={() => changePage(page + 1)}
          disabled={page >= totalPages}
        >
          下一页
        </button>
      </div>

      {pageSizeOptions.length ? (
        <label className={styles.pageSizeControl}>
          <span>每页</span>
          <select
            className={styles.pageSizeSelect}
            value={pageSize}
            onChange={event => onPageSizeChange?.(event.target.value === 'all' ? 'all' : Number(event.target.value))}
          >
            {pageSizeOptions.map(option => (
              <option key={option} value={option}>
                {option === 'all' ? '全部' : option}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </nav>
  )
}
