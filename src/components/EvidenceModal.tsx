interface EvidenceModalProps {
  title: string
  evidence: string
  source?: string
  onClose: () => void
}

export function EvidenceModal({ title, evidence, source, onClose }: EvidenceModalProps) {
  const sourceIncludesEvidence = Boolean(source && evidence && source.toLowerCase().includes(evidence.toLowerCase()))
  const [before = '', after = ''] = sourceIncludesEvidence
    ? source!.split(new RegExp(`(${evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'))
    : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        <section>
          <label>Highlighted evidence span</label>
          <blockquote>{evidence || 'No evidence recorded'}</blockquote>
          {source && (
            <>
              <label>CV source text</label>
              <p className="evidence-source">
                {sourceIncludesEvidence ? <>{before}<mark>{evidence}</mark>{after}</> : source}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
