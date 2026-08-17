import type { ProfileField, ProfileTagGroup, WorkExperienceEntry } from '../types'
import { CvProfilePanel } from './CvProfilePanel'

interface CvParseConfirmModalProps {
  fileName: string
  fields: ProfileField[]
  skills: ProfileTagGroup
  languages: ProfileTagGroup
  workHistory: WorkExperienceEntry[]
  isScannedPdf: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function CvParseConfirmModal({
  fileName,
  fields,
  skills,
  languages,
  workHistory,
  isScannedPdf,
  onConfirm,
  onCancel,
}: CvParseConfirmModalProps) {
  const parsedCount = fields.filter((f) => f.status !== 'missing').length

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal cv-parse-modal cv-parse-modal-wide" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h3>Review extracted profile</h3>
            <p className="muted tiny">
              AI read <strong>{fileName}</strong> — {parsedCount} scalar fields + experience blocks extracted.
            </p>
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
          <CvProfilePanel
            fields={fields}
            skills={skills}
            languages={languages}
            workHistory={workHistory}
            readOnly
          />
        </section>
        <footer className="modal-actions">
          <button type="button" onClick={onCancel}>Upload a different file</button>
          <button type="button" className="primary" onClick={onConfirm}>Apply to profile</button>
        </footer>
      </div>
    </div>
  )
}
