export function getContentScrollContainer() {
  return document.querySelector<HTMLElement>('main.content')
}

export function scrollContainerToBottom(container: HTMLElement, padding = 8) {
  return Math.max(0, container.scrollHeight - container.clientHeight - padding)
}

/** Force the main pane to the bottom — repeated passes catch late layout (Review & submit). */
export function scrollContentPaneToBottom(options?: {
  padding?: number
  behavior?: ScrollBehavior
}) {
  const container = getContentScrollContainer()
  if (!container) return
  const padding = options?.padding ?? 8
  const behavior = options?.behavior ?? 'smooth'
  const top = Math.max(0, container.scrollHeight - container.clientHeight - padding)
  container.scrollTo({ top, behavior })
}

export function scrollIntoViewEnd(element: HTMLElement | null, behavior: ScrollBehavior = 'smooth') {
  if (!element) return
  element.scrollIntoView({ behavior, block: 'end', inline: 'nearest' })
}

/**
 * After a new C1 block appears, scroll until the anchor (e.g. submit actions) is visible at the bottom.
 */
export function scrollToC1RevealAnchor(anchor: HTMLElement | null) {
  let cancelled = false

  const run = (behavior: ScrollBehavior) => {
    if (cancelled) return
    scrollContentPaneToBottom({ padding: 8, behavior })
    scrollIntoViewEnd(anchor, behavior)
  }

  // Immediate + staggered — submission panel height settles over a few frames.
  run('smooth')
  const timers = [120, 320, 560, 900, 1300].map((ms) =>
    window.setTimeout(() => run(ms === 1300 ? 'auto' : 'smooth'), ms),
  )

  return () => {
    cancelled = true
    timers.forEach((id) => window.clearTimeout(id))
  }
}

export function pulseRevealElement(element: HTMLElement | null, className = 'is-reveal-pulse') {
  if (!element) return
  element.classList.remove(className)
  void element.offsetWidth
  element.classList.add(className)
  window.setTimeout(() => element.classList.remove(className), 1400)
}
