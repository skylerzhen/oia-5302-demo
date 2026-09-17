import { ChevronDown, ChevronUp, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { JD_INTERVIEW_QUESTIONS, jdQuestionsByDimension } from '../data/jdInterviewQuestions'
import { FINANCE_JOB } from '../data/job'
import {
  buildFixedQuestionQueue,
  defaultInterviewConfig,
  interviewConfigSummary,
  saveInterviewConfig,
} from '../lib/interviewConfig'
import type { InterviewConfig, InterviewQuestion } from '../types'

interface InterviewSetupPanelProps {
  config: InterviewConfig
  onChange: (config: InterviewConfig) => void
  onSave?: (config: InterviewConfig) => void
  compact?: boolean
}

export function InterviewSetupPanel({
  config,
  onChange,
  onSave,
  compact = false,
}: InterviewSetupPanelProps) {
  const [draftText, setDraftText] = useState('')
  const [savedFlash, setSavedFlash] = useState('')
  const jdGroups = jdQuestionsByDimension()
  const queuePreview = buildFixedQuestionQueue(config)

  function update(partial: Partial<InterviewConfig>) {
    onChange({ ...config, ...partial })
  }

  function updateQuestionRubric(questionId: string, rubric: string) {
    const questionRubrics = { ...(config.questionRubrics ?? {}), [questionId]: rubric }
    if (!rubric.trim()) delete questionRubrics[questionId]
    update({ questionRubrics })
  }

  function toggleJdQuestion(id: string) {
    const enabled = config.enabledJdQuestionIds.includes(id)
      ? config.enabledJdQuestionIds.filter((q) => q !== id)
      : [...config.enabledJdQuestionIds, id]
    update({ enabledJdQuestionIds: enabled })
  }

  function toggleDimension(key: string) {
    const enabled = config.followUpDimensions.includes(key)
      ? config.followUpDimensions.filter((k) => k !== key)
      : [...config.followUpDimensions, key]
    update({ followUpDimensions: enabled })
  }

  function addCustomQuestion() {
    const textEn = draftText.trim()
    if (!textEn) return
    const next: InterviewQuestion = {
      id: `custom-${Date.now()}`,
      textEn,
      source: 'custom',
    }
    update({ customQuestions: [...config.customQuestions, next] })
    setDraftText('')
  }

  function removeCustomQuestion(id: string) {
    update({ customQuestions: config.customQuestions.filter((q) => q.id !== id) })
  }

  function moveCustomQuestion(id: string, direction: -1 | 1) {
    const list = [...config.customQuestions]
    const index = list.findIndex((q) => q.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= list.length) return
    const [item] = list.splice(index, 1)
    list.splice(target, 0, item)
    update({ customQuestions: list })
  }

  function handleSave() {
    const next = { ...config, savedAt: new Date().toISOString() }
    saveInterviewConfig(next)
    onChange(next)
    onSave?.(next)
    setSavedFlash('Interview blueprint saved — C4 will use this configuration.')
    window.setTimeout(() => setSavedFlash(''), 3500)
  }

  function resetDefaults() {
    onChange(defaultInterviewConfig())
  }

  return (
    <div className={`interview-setup-panel ${compact ? 'compact' : ''}`}>
      <header className="interview-setup-head">
        <div>
          <h3>Interview setup · HR blueprint</h3>
          <p className="muted tiny">
            Configure fixed questions and JD question set — the AI interviewer follows this order,
            then adaptive follow-ups within allowed dimensions (RFP §6.7).
          </p>
        </div>
        <div className="interview-setup-actions">
          <button type="button" className="ghost-btn" onClick={resetDefaults}>
            <RotateCcw size={14} /> Reset defaults
          </button>
          <button type="button" className="primary" onClick={handleSave}>
            <Save size={14} /> Save blueprint
          </button>
        </div>
      </header>

      <p className="interview-setup-summary muted tiny">{interviewConfigSummary(config)}</p>
      {savedFlash && <p className="ok-text tiny">{savedFlash}</p>}

      <div className="interview-setup-grid">
        <section className="card stack interview-setup-section">
          <h4>Custom questions (fixed order)</h4>
          <p className="muted tiny">Asked first, in list order, before selected JD questions.</p>
          <ul className="interview-question-list">
            {config.customQuestions.map((q, index) => (
              <li key={q.id} className="interview-question-row">
                <span className="interview-question-index">{index + 1}</span>
                <div className="stack">
                  <textarea
                    value={q.textEn}
                    onChange={(e) => {
                      const customQuestions = config.customQuestions.map((item) =>
                        item.id === q.id ? { ...item, textEn: e.target.value } : item,
                      )
                      update({ customQuestions })
                    }}
                    rows={2}
                    aria-label={`Custom question ${index + 1}`}
                  />
                  <textarea
                    className="interview-rubric-input"
                    placeholder="What a strong answer contains (rubric for AI + HR governance)…"
                    value={config.questionRubrics?.[q.id] ?? q.strongAnswerRubric ?? ''}
                    onChange={(e) => updateQuestionRubric(q.id, e.target.value)}
                    rows={2}
                    aria-label={`Rubric for custom question ${index + 1}`}
                  />
                </div>
                <div className="interview-question-row-actions">
                  <button type="button" className="ghost-btn" aria-label="Move up" onClick={() => moveCustomQuestion(q.id, -1)}>
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" className="ghost-btn" aria-label="Move down" onClick={() => moveCustomQuestion(q.id, 1)}>
                    <ChevronDown size={14} />
                  </button>
                  <button type="button" className="ghost-btn danger-text" aria-label="Remove" onClick={() => removeCustomQuestion(q.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="interview-add-row">
            <textarea
              placeholder="Add a custom interview question…"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={2}
            />
            <button type="button" className="ghost-btn" disabled={!draftText.trim()} onClick={addCustomQuestion}>
              <Plus size={14} /> Add question
            </button>
          </div>
        </section>

        <section className="card stack interview-setup-section">
          <h4>JD question set · {FINANCE_JOB.title}</h4>
          <p className="muted tiny">Linked to job rubric dimensions — appended after custom questions.</p>
          {FINANCE_JOB.dimensions.map((dim) => {
            const items = jdGroups.get(dim.key) ?? []
            if (items.length === 0) return null
            return (
              <div key={dim.key} className="jd-question-group">
                <strong className="tiny">{dim.label}</strong>
                <ul className="jd-question-checklist">
                  {items.map((q) => (
                    <li key={q.id}>
                      <label className="jd-question-check">
                        <input
                          type="checkbox"
                          checked={config.enabledJdQuestionIds.includes(q.id)}
                          onChange={() => toggleJdQuestion(q.id)}
                        />
                        <span>{q.textEn}</span>
                      </label>
                      {config.enabledJdQuestionIds.includes(q.id) && (
                        <textarea
                          className="interview-rubric-input"
                          placeholder="Strong answer rubric for this JD question…"
                          value={config.questionRubrics?.[q.id] ?? ''}
                          onChange={(e) => updateQuestionRubric(q.id, e.target.value)}
                          rows={2}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          <p className="muted tiny">{JD_INTERVIEW_QUESTIONS.length} governed items in set · {config.enabledJdQuestionIds.length} enabled</p>
        </section>
      </div>

      <div className="interview-setup-grid">
        <section className="card stack interview-setup-section">
          <h4>Adaptive follow-up policy</h4>
          <label className="interview-setup-field">
            <span>Mode</span>
            <select
              value={config.mode}
              onChange={(e) => update({ mode: e.target.value as InterviewConfig['mode'] })}
            >
              <option value="fixed_then_adaptive">Fixed questions, then adaptive LLM</option>
              <option value="fixed_only">Fixed questions only (no LLM follow-up)</option>
              <option value="adaptive">Adaptive LLM only (ignore fixed queue)</option>
            </select>
          </label>
          <div className="interview-setup-limits">
            <label>
              Min answers before close
              <input
                type="number"
                min={3}
                max={8}
                value={config.minAnswers}
                onChange={(e) => update({ minAnswers: Number(e.target.value) || 5 })}
              />
            </label>
            <label>
              Max answers (hard stop)
              <input
                type="number"
                min={5}
                max={15}
                value={config.maxAnswers}
                onChange={(e) => update({ maxAnswers: Number(e.target.value) || 10 })}
              />
            </label>
          </div>
          <fieldset className="interview-dimension-fieldset">
            <legend className="tiny">Allowed follow-up dimensions</legend>
            <div className="interview-dimension-grid">
              {FINANCE_JOB.dimensions.map((dim) => (
                <label key={dim.key} className="interview-dimension-check">
                  <input
                    type="checkbox"
                    checked={config.followUpDimensions.includes(dim.key)}
                    onChange={() => toggleDimension(dim.key)}
                  />
                  <span>{dim.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="interview-setup-field">
            <span>Prohibited topics (comma-separated)</span>
            <input
              type="text"
              value={config.prohibitedTopics.join(', ')}
              onChange={(e) => update({
                prohibitedTopics: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
              })}
            />
          </label>
        </section>

        <section className="card stack interview-setup-section">
          <h4>Interview order preview</h4>
          <ol className="interview-queue-preview">
            {queuePreview.map((q, index) => {
              const rubric = config.questionRubrics?.[q.id] ?? q.strongAnswerRubric
              return (
              <li key={q.id}>
                <span className="interview-queue-tag">{q.source === 'jd' ? 'JD' : 'Custom'}</span>
                <span>{q.textEn}</span>
                {index === 0 && <em className="muted tiny"> · opening</em>}
                {rubric ? <em className="muted tiny"> · strong answer: {rubric}</em> : null}
              </li>
              )
            })}
          </ol>
          {config.mode !== 'fixed_only' && (
            <p className="muted tiny">
              After fixed questions, adaptive follow-ups probe:{' '}
              {config.followUpDimensions.map((key) => FINANCE_JOB.dimensions.find((d) => d.key === key)?.label).filter(Boolean).join(', ')}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
