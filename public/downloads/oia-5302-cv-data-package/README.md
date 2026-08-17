# OIA 5302 Issue Input Package

This package is the controlled input set for the RFQ 5302 demonstration. It
contains no real applicant data.

## Generate input documents

```bash
npm run demo:documents
```

Generated S1/S2 inputs are written to `files/`:

| File | Scene | Use |
|---|---|---|
| `01-sara-al-hinai-en.pdf` | S1 | Main candidate, English electronic PDF |
| `02-khalid-al-balushi-en.docx` | S1 | DOCX format demonstration |
| `03-lina-al-abri-bilingual.pdf` | S3 | Strong bilingual comparison candidate |
| `04-noor-al-hashmi-ar-scan.pdf` | S1 | Arabic scan, expected OCR review state |
| `05-yusuf-al-rashdi-en.pdf` | S3/S4 | Weak-match disqualification candidate |
| `06-omar-al-saidi-ar.pdf` | S3 | Arabic electronic-PDF, lower-ranked comparison candidate |
| `07-sara-v2-update.pdf` | S2 | Confirmed CV-difference workflow |
| `08-assessment-question-bank.pdf` | S5 | Four bilingual MCQs, answer key and assessment metrics |

## Supporting files

- `Senior-Financial-Analyst-JD.md`: approved synthetic role and scoring rubric.
- `demo-scenario.md`: S0–S8 sequence, bilingual interview script and two
  dynamic-follow-up rehearsal variants.
- `assessment-question-bank.md`: the four bilingual S5 MCQs and required
  assessment-output metrics.
- `cv-source/`: editable source documents used to reproduce every generated
  input.
