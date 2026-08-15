# Changelog

All notable changes to this project are documented here.  
Format based on [Keep a Changelog](https://keepachangelog.com/). Versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
- End-of-day automation: say 「收工」→ Agent writes `docs/daily-logs/*.md`, commits, pushes
- `.cursor/rules/daily-log-workflow.mdc`, `scripts/end-of-day.sh`

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
- 3D Avatar（VRoid / MakeHuman）— 等待 `.vrm` 资源

[Unreleased]: https://github.com/skylerzhen/oia-5302-demo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/skylerzhen/oia-5302-demo/releases/tag/v0.1.0
