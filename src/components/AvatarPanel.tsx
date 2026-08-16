import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { textToVisemes } from '../lib/visemes'
import type { Viseme } from '../types'

const Avatar3DPanel = lazy(() => import('./Avatar3DPanel').then((module) => ({ default: module.Avatar3DPanel })))

interface AvatarPanelProps {
  speaking: boolean
  language: 'en' | 'ar'
  caption: string
  expression?: 'neutral' | 'supportive' | 'curious' | 'gesture'
  viseme?: Viseme
}

export function AvatarPanel({ speaking, language, caption, expression = 'neutral', viseme: drivenViseme }: AvatarPanelProps) {
  const visemes = useMemo(() => textToVisemes(caption, language), [caption, language])
  const [visemeIndex, setVisemeIndex] = useState(0)
  const [hasVroidVrm, setHasVroidVrm] = useState(false)

  useEffect(() => {
    if (!speaking || drivenViseme) {
      setVisemeIndex(0)
      return
    }

    const timer = window.setInterval(() => {
      setVisemeIndex((current) => (current + 1) % visemes.length)
    }, 95)
    return () => window.clearInterval(timer)
  }, [drivenViseme, speaking, visemes.length])

  useEffect(() => {
    let active = true
    window.fetch('/avatar/oia-vroid-interviewer.vrm', { method: 'HEAD' })
      .then((response) => active && setHasVroidVrm(response.ok))
      .catch(() => active && setHasVroidVrm(false))
    return () => { active = false }
  }, [])

  const viseme: Viseme = speaking
    ? drivenViseme ?? visemes[visemeIndex] ?? 'rest'
    : 'rest'

  return (
    <div className="avatar-panel">
      <div className="video-frame">
        <span className="live-tag">{speaking ? 'Speaking' : 'AI Interviewer'}</span>
        {hasVroidVrm ? (
          <Suspense fallback={<div className="avatar-3d-loading">Loading local 3D avatar…</div>}>
            <Avatar3DPanel src="/avatar/oia-vroid-interviewer.vrm" speaking={speaking} viseme={viseme} expression={expression} />
          </Suspense>
        ) : (
          <div className={`avatar-stage expression-${expression} ${speaking ? 'speaking' : ''}`} aria-label="OIA AI interviewer avatar">
            <svg className="avatar-illustration" viewBox="0 0 320 360" role="img" aria-label="2D OIA interviewer">
              <rect width="320" height="360" fill="#0f172a" />
              <circle cx="160" cy="122" r="83" fill="#f2c8a5" />
              <path d="M78 122c0-73 38-105 83-105s84 32 84 105c-20-28-49-42-84-42-34 0-63 14-83 42Z" fill="#0b1220" />
              <path d="M77 326c12-84 56-118 83-118s71 34 83 118" fill="#14532d" />
              <path d="M123 211h74l-37 55Z" fill="#f8fafc" />
              <path className="avatar-hand avatar-hand-left" d="M78 296c-25 6-35 25-31 45 2 10 14 9 17 1l8-19 12 16c7 9 19 0 13-9l-12-17 13-4c10-3 8-17-2-14Z" fill="#f2c8a5" />
              <path className="avatar-hand avatar-hand-right" d="M242 296c25 6 35 25 31 45-2 10-14 9-17 1l-8-19-12 16c-7 9-19 0-13-9l12-17-13-4c-10-3-8-17 2-14Z" fill="#f2c8a5" />
              <circle cx="128" cy="125" r="7" fill="#1e293b" />
              <circle cx="191" cy="125" r="7" fill="#1e293b" />
              <path d="M112 104c12-10 25-10 35-3M174 101c11-7 24-7 35 3" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" fill="none" />
              <g className={`avatar-mouth viseme-${viseme}`}>
                <ellipse cx="160" cy="164" rx="24" ry="7" fill="#7f1d1d" />
              </g>
              <path d="M111 186c31 20 67 20 98 0" stroke="#b45309" strokeWidth="3" fill="none" opacity=".45" />
            </svg>
            <div className="avatar-tech-note">{expression} · TTS viseme → lip-sync</div>
          </div>
        )}
      </div>

      <div className="avatar-meta">
        <span className="badge">{language === 'ar' ? 'Arabic' : 'English'}</span>
        {speaking && <span className="badge live">Live</span>}
      </div>

      <div className="caption-bar" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {caption}
      </div>
    </div>
  )
}
