import type { FieldStatus, ProfileField, ProfileTagGroup, WorkExperienceEntry } from '../types'
import { PROFILE_UI_SECTIONS } from '../data/cvProfileSchema'

function statusLabel(status: FieldStatus): string {
  if (status === 'parsed') return 'Parsed'
  if (status === 'review') return 'Needs review'
  return 'Missing'
}

interface CvProfilePanelProps {
  fields: ProfileField[]
  skills: ProfileTagGroup
  languages: ProfileTagGroup
  workHistory: WorkExperienceEntry[]
  readOnly?: boolean
  onFieldChange?: (key: string, value: string) => void
  onSkillsChange?: (items: string[]) => void
  onLanguagesChange?: (items: string[]) => void
  onEvidence?: (title: string, evidence: string, source?: string) => void
}

function ScalarFieldRow({
  field,
  readOnly,
  onChange,
  onEvidence,
}: {
  field: ProfileField
  readOnly?: boolean
  onChange?: (value: string) => void
  onEvidence?: () => void
}) {
  return (
    <label className={`field-row ${field.status}`}>
      <div className="field-head">
        <strong>{field.label}</strong>
        <span className={`pill ${field.status}`}>{statusLabel(field.status)}</span>
      </div>
      {readOnly ? (
        <p className="cv-profile-readonly">{field.value.trim() || '—'}</p>
      ) : (
        <input
          value={field.value}
          placeholder={field.status === 'missing' ? 'Not found in CV — add manually' : ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
      {(field.evidence || field.source) && (
        <button type="button" className="linkish" onClick={onEvidence}>Evidence</button>
      )}
    </label>
  )
}

function TagGroupSection({
  title,
  group,
  readOnly,
  onChange,
  onEvidence,
}: {
  title: string
  group: ProfileTagGroup
  readOnly?: boolean
  onChange?: (items: string[]) => void
  onEvidence?: () => void
}) {
  return (
    <section className="cv-profile-section">
      <div className="cv-profile-section-head">
        <h4>{title}</h4>
        <span className={`pill ${group.status}`}>{statusLabel(group.status)}</span>
      </div>
      {readOnly ? (
        group.items.length ? (
          <div className="tag-chip-row">
            {group.items.map((item) => <span key={item} className="tag-chip">{item}</span>)}
          </div>
        ) : (
          <p className="muted tiny">— not found in document —</p>
        )
      ) : (
        <input
          className="tag-input"
          value={group.items.join(', ')}
          placeholder={group.status === 'missing' ? 'Not found in CV — comma-separated' : 'Comma-separated values'}
          onChange={(e) => onChange?.(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        />
      )}
      {(group.evidence || group.source) && (
        <button type="button" className="linkish" onClick={onEvidence}>Evidence</button>
      )}
    </section>
  )
}

export function CvProfilePanel({
  fields,
  skills,
  languages,
  workHistory,
  readOnly = false,
  onFieldChange,
  onSkillsChange,
  onLanguagesChange,
  onEvidence,
}: CvProfilePanelProps) {
  const fieldByKey = Object.fromEntries(fields.map((f) => [f.key, f]))

  return (
    <div className="cv-profile-panel">
      {PROFILE_UI_SECTIONS.map((section) => (
        <section key={section.id} className="cv-profile-section">
          <h4>{section.title}</h4>
          <div className="field-grid cv-profile-grid">
            {section.keys.map((key) => {
              const field = fieldByKey[key]
              if (!field) return null
              return (
                <ScalarFieldRow
                  key={key}
                  field={field}
                  readOnly={readOnly}
                  onChange={(value) => onFieldChange?.(key, value)}
                  onEvidence={() => onEvidence?.(field.label, field.evidence, field.source)}
                />
              )
            })}
          </div>
        </section>
      ))}

      <section className="cv-profile-section">
        <div className="cv-profile-section-head">
          <h4>Experience</h4>
          <span className="muted tiny">{workHistory.length ? `${workHistory.length} role(s)` : 'No roles extracted'}</span>
        </div>
        {workHistory.length === 0 ? (
          <p className="muted tiny">— not found in document —</p>
        ) : (
          <div className="work-history-list">
            {workHistory.map((entry) => (
              <article key={entry.id} className={`work-history-card ${entry.status}`}>
                <div className="field-head">
                  <strong>{entry.title || 'Role'}</strong>
                  <span className={`pill ${entry.status}`}>{statusLabel(entry.status)}</span>
                </div>
                <p className="work-history-meta">
                  {[entry.company, entry.start && entry.end ? `${entry.start} – ${entry.end}` : entry.start || entry.end]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
                {entry.responsibilities.length > 0 && (
                  <ul className="work-history-bullets">
                    {entry.responsibilities.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {(entry.evidence || entry.source) && (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => onEvidence?.(`${entry.title || 'Role'} — evidence`, entry.evidence, entry.source)}
                  >
                    Evidence
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <TagGroupSection
        title="Skills"
        group={skills}
        readOnly={readOnly}
        onChange={onSkillsChange}
        onEvidence={() => onEvidence?.('Skills', skills.evidence, skills.source)}
      />

      <TagGroupSection
        title="Languages"
        group={languages}
        readOnly={readOnly}
        onChange={onLanguagesChange}
        onEvidence={() => onEvidence?.('Languages', languages.evidence, languages.source)}
      />
    </div>
  )
}

export { statusLabel as cvFieldStatusLabel }
