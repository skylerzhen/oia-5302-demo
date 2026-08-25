import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import type { ProfileField, ProfileTagGroup, WorkExperienceEntry } from '../types'
import { countCvScalarFields } from '../lib/cvCompleteness'
import { CompletenessPill } from './CompletenessPill'
import { CvProfilePanel } from './CvProfilePanel'
import { CvSourcePreview, type CvEvidenceLocateRequest, type CvPreviewKind } from './CvSourcePreview'

interface CvReviewPanelProps {
  fileName: string
  previewUrl: string
  previewKind?: CvPreviewKind
  fields: ProfileField[]
  skills: ProfileTagGroup
  languages: ProfileTagGroup
  workHistory: WorkExperienceEntry[]
  isScannedPdf?: boolean
  parseMode?: string
  readOnly?: boolean
  reparseBusy?: boolean
  locateRequest?: CvEvidenceLocateRequest | null
  onFieldChange?: (key: string, value: string) => void
  onSkillsChange?: (items: string[]) => void
  onLanguagesChange?: (items: string[]) => void
  onEvidence?: (title: string, evidence: string, source?: string) => void
  onReparse?: () => void
  footer?: ReactNode
}

export function CvReviewPanel({
  fileName,
  previewUrl,
  previewKind = 'html',
  fields,
  skills,
  languages,
  workHistory,
  isScannedPdf,
  parseMode,
  readOnly,
  reparseBusy,
  locateRequest,
  onFieldChange,
  onSkillsChange,
  onLanguagesChange,
  onEvidence,
  onReparse,
  footer,
}: CvReviewPanelProps) {
  const completeness = countCvScalarFields(fields)
  const reviewCount = fields.filter((field) => field.status === 'review').length
  const missingCount = fields.filter((field) => field.status === 'missing').length
  const previewLabel = previewKind === 'pdf'
    ? 'PDF preview'
    : previewKind === 'image'
      ? 'Image preview'
      : 'HTML source view'

  return (
    <div className="cv-evidence-reviewer" data-screen-ready="true">
      <aside className="cv-evidence-source">
        <div className="cv-evidence-source-head">
          <strong>Source document</strong>
          <span className="muted tiny">{fileName}</span>
          <span className="cv-preview-kind-pill">{previewLabel}</span>
        </div>
        <CvSourcePreview
          url={previewUrl}
          kind={previewKind}
          fileName={fileName}
          locateRequest={locateRequest}
        />
      </aside>

      <div className="cv-evidence-main">
        <header className="cv-evidence-header">
          <div>
            <h3>Extracted profile</h3>
            <p className="muted tiny">
              Review AI-extracted fields against the source CV. Click <strong>Locate in CV</strong> to highlight the source span.
            </p>
          </div>
          <div className="cv-evidence-meta">
            <CompletenessPill valid={completeness.valid} total={completeness.total} tier={completeness.tier} />
            {parseMode && <span className="status-pill mode">{parseMode === 'model' ? 'LLM' : 'Fallback'}</span>}
            {isScannedPdf && <span className="status-pill scan">OCR</span>}
            {reviewCount > 0 && <span className="status-pill review">{reviewCount} need review</span>}
            {missingCount > 0 && <span className="status-pill missing">{missingCount} missing</span>}
          </div>
        </header>

        {isScannedPdf && (
          <div className="parse-note">
            <strong>Scanned PDF · OCR</strong>
            <span>Some fields may need your review before submission.</span>
          </div>
        )}

        <div className="cv-evidence-toolbar">
          {onReparse && (
            <button type="button" className="cv-toolbar-btn" disabled={reparseBusy} onClick={onReparse}>
              <RefreshCw size={14} aria-hidden className={reparseBusy ? 'spin' : ''} />
              {reparseBusy ? 'Re-parsing…' : 'Re-parse CV'}
            </button>
          )}
        </div>

        <div className="cv-evidence-fields">
          <CvProfilePanel
            fields={fields}
            skills={skills}
            languages={languages}
            workHistory={workHistory}
            readOnly={readOnly}
            onFieldChange={onFieldChange}
            onSkillsChange={onSkillsChange}
            onLanguagesChange={onLanguagesChange}
            onEvidence={(title, evidence, source) => onEvidence?.(title, evidence, source)}
          />
        </div>

        {footer && <footer className="cv-evidence-decision-bar">{footer}</footer>}
      </div>
    </div>
  )
}
