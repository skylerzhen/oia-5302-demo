# OIA RFQ 5302 Demo Delivery

## Run on the demonstration machine

### Windows PowerShell

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\start-demo.ps1
```

The script builds the local application, rejects external production-resource
references, then starts the application on `127.0.0.1` only.

### Manual fallback

```powershell
npm ci
npm run demo:offline
```

Open the local URL printed in the terminal. Do not use the hosted Surge URL for
the physical disconnect test.

## Physical-offline procedure

1. Start a local network monitor.
2. Open the localhost application while external network is connected.
3. Start screen recording.
4. Disconnect Wi-Fi and external network before S1.
5. Refresh the localhost page once.
6. Run S1 through S8.
7. Save the video and monitor log under `evidence/`.

## Controlled data

Generate CV inputs from the project root:

```powershell
npm run demo:documents:publish
```

The source content and generated PDFs/DOCX reside in
`data/issue-5302-inputs/`. Published demo files are copied to
`public/issue-5302-inputs/` for in-app Open source links. All candidate
information is synthetic.

## Rehearsal and evidence pack

- `rehearsal-runbook.md` — step-by-step S0–S8 recording script
- `evidence/dynamic-followup-comparison.md` — G3 A/B verification table
- `evidence/arabic-native-review.md` — G4 reviewer checklist
- `evidence/scope-signoff.md` — G8 Ella sign-off template
- `fallback/README.md` — G9 per-scene fallback clip list

Start the offline monitor in a second terminal:

```powershell
npm run demo:monitor
```

## Acceptance references

- `../../docs/demo-5302/gate-checklist.md`
- `../../data/issue-5302-inputs/demo-scenario.md`

Before final delivery, add the approved `demo_issue.md` to the project root so
the delivery package and acceptance checklist share the same source of truth.
