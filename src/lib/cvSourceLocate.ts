const HIGHLIGHT_CLASS = 'cv-source-highlight'

function clearHighlights(root: ParentNode) {
  root.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`).forEach((node) => {
    const parent = node.parentNode
    if (!parent) return
    parent.replaceChild(document.createTextNode(node.textContent ?? ''), node)
    parent.normalize()
  })
}

function wrapRange(range: Range) {
  const mark = document.createElement('mark')
  mark.className = HIGHLIGHT_CLASS
  try {
    range.surroundContents(mark)
    return mark
  } catch {
    const fragment = range.extractContents()
    mark.appendChild(fragment)
    range.insertNode(mark)
    return mark
  }
}

function locateInBody(body: HTMLElement, query: string): HTMLElement | null {
  const needle = query.trim()
  if (!needle) return null

  const nodes: Text[] = []
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  const full = nodes.map((node) => node.textContent ?? '').join('')
  const fullLower = full.toLowerCase()
  const needleLower = needle.toLowerCase()

  let start = fullLower.indexOf(needleLower)
  let matchLen = needle.length
  if (start < 0 && needle.length > 20) {
    const partial = needle.slice(0, 28)
    start = fullLower.indexOf(partial.toLowerCase())
    matchLen = partial.length
  }
  if (start < 0) return null

  const end = start + matchLen
  let pos = 0
  let startNode: Text | null = null
  let startOffset = 0
  let endNode: Text | null = null
  let endOffset = 0

  for (const node of nodes) {
    const len = (node.textContent ?? '').length
    if (!startNode && start < pos + len) {
      startNode = node
      startOffset = Math.max(0, start - pos)
    }
    if (!endNode && end <= pos + len) {
      endNode = node
      endOffset = Math.min(len, end - pos)
      break
    }
    pos += len
  }

  if (!startNode || !endNode) return null

  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  return wrapRange(range)
}

export interface CvSourceLocateResult {
  found: boolean
  mode: 'html' | 'pdf-fallback'
}

/** Highlight evidence text inside a same-origin HTML iframe document. */
export function locateEvidenceInHtmlDocument(
  doc: Document,
  evidence: string,
): CvSourceLocateResult {
  if (!doc.getElementById('cv-source-highlight-style')) {
    const style = doc.createElement('style')
    style.id = 'cv-source-highlight-style'
    style.textContent = `
      mark.${HIGHLIGHT_CLASS} {
        background: #fef08a;
        color: inherit;
        padding: 0 0.12em;
        border-radius: 3px;
        box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.35);
      }
    `
    doc.head.appendChild(style)
  }

  clearHighlights(doc.body)
  const mark = locateInBody(doc.body, evidence)
  if (!mark) return { found: false, mode: 'html' }
  mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return { found: true, mode: 'html' }
}

export function locateEvidenceInIframe(
  iframe: HTMLIFrameElement | null,
  evidence: string,
): CvSourceLocateResult {
  if (!iframe) return { found: false, mode: 'html' }
  try {
    const doc = iframe.contentDocument
    if (!doc?.body) return { found: false, mode: 'html' }
    return locateEvidenceInHtmlDocument(doc, evidence)
  } catch {
    return { found: false, mode: 'html' }
  }
}

export function previewKindFromFileName(fileName: string, mimeType?: string): 'html' | 'pdf' | 'image' {
  const normalized = fileName.toLowerCase()
  if (mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(normalized)) return 'image'
  if (mimeType === 'application/pdf' || normalized.endsWith('.pdf')) return 'pdf'
  return 'html'
}
