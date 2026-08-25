import { useEffect, useRef, useState } from 'react'
import { Crosshair } from 'lucide-react'
import { locateEvidenceInIframe, type CvSourceLocateResult } from '../lib/cvSourceLocate'

export type CvPreviewKind = 'html' | 'pdf' | 'image'

export interface CvEvidenceLocateRequest {
  title: string
  evidence: string
  source?: string
  token: number
}

interface CvSourcePreviewProps {
  url: string
  kind: CvPreviewKind
  fileName: string
  locateRequest?: CvEvidenceLocateRequest | null
}

function HighlightedQuote({ evidence, source }: { evidence: string; source?: string }) {
  const needle = evidence.trim()
  const haystack = source?.trim() ?? ''
  const includes = needle && haystack.toLowerCase().includes(needle.toLowerCase())
  const parts = includes
    ? haystack.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'))
    : null

  return (
    <blockquote className="cv-source-locate-quote">
      {parts ? (
        parts.map((part, index) => (
          part.toLowerCase() === needle.toLowerCase()
            ? <mark key={index}>{part}</mark>
            : <span key={index}>{part}</span>
        ))
      ) : (
        <>
          <mark>{needle || 'Evidence span'}</mark>
          {source && <footer className="muted tiny">{source}</footer>}
        </>
      )}
    </blockquote>
  )
}

export function CvSourcePreview({ url, kind, fileName, locateRequest }: CvSourcePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [locateState, setLocateState] = useState<{
    title: string
    evidence: string
    source?: string
    result: CvSourceLocateResult
  } | null>(null)

  useEffect(() => {
    if (!locateRequest?.token) return
    const { title, evidence, source } = locateRequest

    if (!evidence.trim()) {
      setLocateState({
        title,
        evidence,
        source,
        result: { found: false, mode: kind === 'html' ? 'html' : 'pdf-fallback' },
      })
      return
    }

    if (kind !== 'html') {
      setLocateState({
        title,
        evidence,
        source,
        result: { found: false, mode: 'pdf-fallback' },
      })
      return
    }

    const runLocate = () => {
      const result = locateEvidenceInIframe(iframeRef.current, evidence)
      setLocateState({ title, evidence, source, result })
    }

    const iframe = iframeRef.current
    if (!iframe) {
      runLocate()
      return
    }

    if (iframe.contentDocument?.readyState === 'complete') {
      runLocate()
      return
    }

    const onLoad = () => runLocate()
    iframe.addEventListener('load', onLoad, { once: true })
    return () => iframe.removeEventListener('load', onLoad)
  }, [locateRequest?.token, kind])

  const showFallbackQuote = locateState
    && !locateState.result.found
    && (kind === 'pdf' || kind === 'image' || locateState.result.mode === 'html')

  return (
    <div className="cv-source-preview">
      {kind === 'image' ? (
        <img src={url} alt={`CV source: ${fileName}`} className="cv-evidence-image" />
      ) : (
        <iframe
          ref={iframeRef}
          title={`CV source: ${fileName}`}
          src={url}
          className="cv-evidence-frame"
        />
      )}

      {locateState && (
        <div className={`cv-source-locate-banner ${locateState.result.found ? 'found' : 'miss'}`} role="status">
          <Crosshair size={14} aria-hidden />
          <div>
            <strong>{locateState.title}</strong>
            {locateState.source && <span className="muted tiny"> · {locateState.source}</span>}
            {locateState.result.found ? (
              <p className="tiny ok-text">Highlighted in source document.</p>
            ) : kind === 'pdf' ? (
              <p className="tiny muted">PDF view — evidence quote shown below.</p>
            ) : kind === 'image' ? (
              <p className="tiny muted">Image scan — evidence quote shown below.</p>
            ) : (
              <p className="tiny muted">Span not found in HTML view — evidence quote shown below.</p>
            )}
          </div>
        </div>
      )}

      {showFallbackQuote && locateState && (
        <HighlightedQuote evidence={locateState.evidence} source={locateState.source} />
      )}
    </div>
  )
}
