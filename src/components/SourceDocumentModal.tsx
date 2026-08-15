interface SourceDocumentModalProps {
  title: string
  url: string
  onClose: () => void
}

export function SourceDocumentModal({ title, url, onClose }: SourceDocumentModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal source-doc-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h3>{title}</h3>
            <p className="muted tiny">Controlled source document · stays inside the demo</p>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        <iframe title={title} src={url} className="source-doc-frame" />
      </div>
    </div>
  )
}
