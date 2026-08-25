export function getContentScrollContainer() {
  return document.querySelector<HTMLElement>('main.content')
}

export function scrollContainerToBottom(container: HTMLElement, padding = 8) {
  return Math.max(0, container.scrollHeight - container.clientHeight - padding)
}

export function scrollContentPaneToTop(behavior: ScrollBehavior = 'auto') {
  const container = getContentScrollContainer()
  if (container) container.scrollTo({ top: 0, behavior })
  window.scrollTo({ top: 0, behavior })
}

/** Pin C1 to the content pane top. Do not scrollIntoView inner cards — that hides the heading. */
export function scrollToC1PhaseStart(_anchor?: HTMLElement | null) {
  let cancelled = false

  const run = () => {
    if (cancelled) return
    scrollContentPaneToTop('auto')
  }

  run()
  const raf = requestAnimationFrame(run)
  const timer = window.setTimeout(run, 80)

  return () => {
    cancelled = true
    cancelAnimationFrame(raf)
    window.clearTimeout(timer)
  }
}

export function pulseRevealElement(element: HTMLElement | null, className = 'is-reveal-pulse') {
  if (!element) return
  element.classList.remove(className)
  void element.offsetWidth
  element.classList.add(className)
  window.setTimeout(() => element.classList.remove(className), 1400)
}
