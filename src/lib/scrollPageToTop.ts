import { getContentScrollContainer, scrollContainerToBottom } from './smoothScroll'

export function scrollPageToTop(container?: HTMLElement | null) {
  const scrollContainer = container ?? getContentScrollContainer()
  if (scrollContainer) scrollContainer.scrollTop = 0
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

export function scrollElementIntoContent(element: HTMLElement | null, offset = 20) {
  const container = getContentScrollContainer()
  if (!element || !container) return
  requestAnimationFrame(() => {
    const start = container.scrollTop
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const elementBottom = start + (elementRect.bottom - containerRect.top)
    const target = Math.max(0, elementBottom - container.clientHeight + offset)
    container.scrollTo({ top: Math.min(target, scrollContainerToBottom(container, 0)), behavior: 'smooth' })
  })
}

// Re-export for callers that need raw bottom position.
export { scrollContainerToBottom } from './smoothScroll'
