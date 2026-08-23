# Changelog

All notable changes to this project are documented here.  
Format based on [Keep a Changelog](https://keepachangelog.com/). Versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Changed
- Global UI: replace legacy teal/green accents with OIA navy design tokens (`App.css`, `index.css`)
- Primary demo URL: https://oia-recruitment.uiscloud.cc

## [0.3.0] - 2026-08-19

### Added
- C1 Document Intelligence review: two-column `CvReviewPanel` (source CV + editable fields)
- `CompletenessPill` — extraction completeness indicator (UIS pattern)
- Re-parse CV action; pipeline stage labels (Reading → Extracting → Normalizing)
- OIA design tokens (navy palette) aligned with `uiscloud-oman/oia-demo-frontend`
- HR portal: candidate journey modal, current-candidate card on H2–H4, score summary on final decision
- Custom Surge domain support in `deploy-surge-cloud.mjs` (second CLI arg)
- API body auth (`apiKey`) for Surge→Render CORS compatibility
- CV parse normalize server module + enriched Sara v1 demo data
- C4 multi-round LLM follow-up with grounding metadata in transcript
- End-of-day automation: say 「收工」→ Agent writes `docs/daily-logs/*.md`, commits, pushes
- `.cursor/rules/daily-log-workflow.mdc`, `scripts/end-of-day.sh`

### Fixed
- Surge builds missing `VITE_LLM_API_URL` when env var commented in `llm.env`
- C1 compact upload UI after CV applied; missing-field parse path via server markdown

### Changed
- C1 CV review: inline evidence reviewer replaces parse confirm modal
- Live demo primary URL: https://oia-recruitment.uiscloud.cc (backup: oia-rfq-5302.surge.sh)
- Topbar / primary buttons / status pills use OIA navy brand colors

## [0.2.0] - 2026-08-17

### Added
- LiveAvatar Lite C4: lifecycle guards (pagehide / visibility), session starts only after **Start interview**
- LiveKit video + audio track attachment; `primeLiveAvatarAudioPlayback()` on user gesture
- C1 `fieldsConfirmed` state — accept parsed values without inventing Missing field data
- `docs/daily-logs/2026-08-17.md`

### Fixed
- **C1:** `Confirm all fields` no longer auto-fills empty certification with `CFA Level II (candidate)`; Missing stays Missing (C2 diff Previous `—` preserved)
- LiveAvatar idle credit burn when leaving C4 or hiding tab
- LiveAvatar speech path simplified: LiveKit carries synced OpenAI TTS; local TTS only on fallback
- LiveAvatarStage reconnect loop (removed `active` from session effect deps)

### Changed
- `liveavatarPlayer.ts` rewritten for session + LiveKit media attach
- `voiceSpeak.ts` LiveAvatar branch: prepare session → server speak → await LiveKit playback
- `vite.config.ts` CSP: LiveKit / Render API connect-src for cloud demo
- Regenerated demo opening audio asset

## [0.1.0] - 2026-08-15

### Added
- S0–S8 双语双 Portal 原型（Candidate C1–C6 / HR H1–H5）
- 受控 CV 上传流程（读取 → 上传 → 解析 → 字段映射 + 进度条）
- Surge 部署脚本；受控资料 HTML 视图（Surge 免费版不托管 PDF）
- 应用内 SourceDocumentModal（资料不再跳整页）
- Landing 页每次刷新恢复；移除 Candidate login 挡屏
- 离线 demo：`npm run demo:offline` + egress guard + local AI mock
- 合成数据包 `data/issue-5302-inputs/` + deliverables 证据模板
- Win handoff、旁白脚本、录屏指南

### Fixed
- C1 Submit 灰掉、Education review 阻塞
- Surge 上 Open source / assessment question bank 404（PDF → HTML）
- sessionStorage 自动跳过 Landing 进入 Candidate login

### Paused
- 3D Avatar VRoid lip-sync enabled when `public/avatar/oia-vroid-interviewer.vrm` present (demo uses AvatarSample_B)

[Unreleased]: https://github.com/skylerzhen/oia-5302-demo/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/skylerzhen/oia-5302-demo/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/skylerzhen/oia-5302-demo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/skylerzhen/oia-5302-demo/releases/tag/v0.1.0
