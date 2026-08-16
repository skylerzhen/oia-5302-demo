import type { ProfileField } from '../types'

interface CvParseConfirmModalProps {
  fileName: string
  fields: ProfileField[]
  isScannedPdf: boolean
  onConfirm: () => void
  onCancel: () => void
}

function statusLabel(status: ProfileField['status']) {
  if (status === 'parsed') return 'Parsed'
  if (status === 'review') return 'Needs review'
  return 'Missing'
}

export function CvParseConfirmModal({
  fileName,
  fields,
  isScannedPdf,
  onConfirm,
  onCancel,
}: CvParseConfirmModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal cv-parse-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h3>Review extracted profile</h3>
            <p className="muted tiny">AI read <strong>{fileName}</strong> — confirm before filling your profile.</p>
          </div>
          <button type="button" onClick={onCancel}>Cancel</button>
        </header>
        {isScannedPdf && (
          <div className="parse-note">
            <strong>Scanned PDF · OCR</strong>
            <span>Some fields may need your review before submission.</span>
          </div>
        )}
        <section className="cv-parse-preview">
          {fields.map((field) => (
            <div key={field.key} className={`cv-parse-row ${field.status}`}>
              <div className="field-head">
                <strong>{field.label}</strong>
                <span className={`pill ${field.status}`}>{statusLabel(field.status)}</span>
              </div>
              <p>{field.value.trim() || '— not found in document —'}</p>
              {field.evidence && <small className="muted">{field.evidence}</small>}
            </div>
          ))}
        </section>
        <footer className="modal-actions">
          <button type="button" onClick={onCancel}>Upload a different file</button>
          <button type="button" className="primary" onClick={onConfirm}>Apply to profile</button>
        </footer>
      </div>
    </div>
  )
}
