export function scrollPageToTop(container?: HTMLElement | null) {
  const scrollContainer = container ?? document.querySelector<HTMLElement>('main.content')
  if (scrollContainer) scrollContainer.scrollTop = 0
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

export function scrollElementIntoContent(element: HTMLElement | null) {
  if (!element) return
  requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
