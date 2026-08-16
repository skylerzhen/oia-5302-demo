import type { CandidateProfile, ProfileField } from '../types'

export const PRIMARY_CANDIDATE_ID = 'cand-sara'

const PROFILE_FIELD_DEFS: Array<Pick<ProfileField, 'key' | 'label'>> = [
  { key: 'name', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'experience', label: 'Years of experience' },
  { key: 'education', label: 'Education' },
  { key: 'certification', label: 'Professional certification' },
]

export function emptyProfileFields(): ProfileField[] {
  return PROFILE_FIELD_DEFS.map((field) => ({
    ...field,
    value: '',
    status: 'missing',
    evidence: '',
    source: '',
  }))
}

export function primaryCandidateProfileFields(): ProfileField[] {
  return CANDIDATES.find((c) => c.id === PRIMARY_CANDIDATE_ID)!.fields.map((f) => ({ ...f }))
}

export const CANDIDATES: CandidateProfile[] = [
  {
    id: 'cand-sara',
    name: 'Sara Al-Hinai',
    email: 'sara.alhinai@example.om',
    nationality: 'Omani',
    yearsExperience: 7,
    education: 'MSc Finance, Sultan Qaboos University',
    skills: ['Portfolio analysis', 'Risk reporting', 'Excel modeling', 'Stakeholder communication', 'English'],
    cvText: `Sara Al-Hinai — Senior Financial Analyst
7 years experience in portfolio analysis and risk reporting at a sovereign wealth fund subsidiary.
Led quarterly portfolio variance analysis and board reporting packs.
Skills: Portfolio analysis, Risk reporting, Excel modeling, Stakeholder communication, English.
Education: MSc Finance, Sultan Qaboos University.`,
    cvFile: '/issue-5302-inputs/01-sara-al-hinai-en.pdf',
    fields: [
      {
        key: 'name',
        label: 'Full name',
        value: 'Sara Al-Hinai',
        status: 'parsed',
        evidence: 'Sara Al-Hinai — Senior Financial Analyst',
        source: 'CV header, page 1',
      },
      {
        key: 'email',
        label: 'Email',
        value: 'sara.alhinai@example.om',
        status: 'parsed',
        evidence: 'sara.alhinai@example.om',
        source: 'Contact block, page 1',
      },
      {
        key: 'experience',
        label: 'Years of experience',
        value: '7',
        status: 'parsed',
        evidence: '7 years experience in portfolio analysis',
        source: 'Experience section, page 1',
      },
      {
        key: 'education',
        label: 'Education',
        value: 'MSc Finance, Sultan Qaboos University',
        status: 'review',
        evidence: 'MSc Finance, Sultan Qaboos University',
        source: 'Education section, page 1 (OCR confidence 0.82)',
      },
      {
        key: 'certification',
        label: 'Professional certification',
        value: '',
        status: 'missing',
        evidence: '',
        source: 'Not found in document',
      },
    ],
  },
  {
    id: 'cand-khalid',
    name: 'Khalid Al-Balushi',
    email: 'k.albalushi@example.om',
    nationality: 'Omani',
    yearsExperience: 5,
    education: 'BSc Accounting',
    skills: ['Financial reporting', 'Excel', 'English'],
    cvText: '5 years in financial reporting. Limited portfolio analysis exposure.',
    cvFile: '/issue-5302-inputs/02-khalid-al-balushi-en.docx',
    fields: [],
  },
  {
    id: 'cand-lina',
    name: 'Lina Al-Abri',
    email: 'l.abri@example.om',
    nationality: 'Omani',
    yearsExperience: 9,
    education: 'MBA Finance',
    skills: ['Portfolio analysis', 'Risk', 'Stakeholder reporting', 'English'],
    cvText: '9 years portfolio and risk leadership experience.',
    cvFile: '/issue-5302-inputs/03-lina-al-abri-bilingual.pdf',
    fields: [],
  },
  {
    id: 'cand-omar',
    name: 'Omar Al-Saidi',
    email: 'o.alsaidi@example.om',
    nationality: 'Omani',
    yearsExperience: 3,
    education: 'BSc Economics',
    skills: ['Data analysis', 'Excel'],
    cvText: 'Junior analyst background. No sovereign fund experience.',
    cvFile: '/issue-5302-inputs/06-omar-al-saidi-ar.pdf',
    fields: [],
  },
  {
    id: 'cand-noor',
    name: 'Noor Al-Hashmi',
    email: 'n.hashmi@example.om',
    nationality: 'Omani',
    yearsExperience: 6,
    education: 'MSc Economics',
    skills: ['Risk reporting', 'Excel modeling', 'English'],
    cvText: '6 years risk reporting in banking sector.',
    cvFile: '/issue-5302-inputs/04-noor-al-hashmi-ar-scan.pdf',
    fields: [],
  },
  {
    id: 'cand-yusuf',
    name: 'Yusuf Al-Rashdi',
    email: 'y.rashdi@example.om',
    nationality: 'Expatriate',
    yearsExperience: 2,
    education: 'BSc Marketing',
    skills: ['Sales', 'CRM'],
    cvText: 'Marketing background — weak match for finance analyst role.',
    cvFile: '/issue-5302-inputs/05-yusuf-al-rashdi-en.pdf',
    fields: [],
  },
]

export const CV_UPLOAD_SAMPLES = [
  {
    id: 'pdf-en',
    label: '01-sara-al-hinai-en.pdf · English electronic PDF',
    candidateId: PRIMARY_CANDIDATE_ID,
    filePath: '/issue-5302-inputs/01-sara-al-hinai-en.html',
  },
  {
    id: 'docx-en',
    label: '02-khalid-al-balushi-en.docx · English DOCX',
    candidateId: 'cand-khalid',
    filePath: '/issue-5302-inputs/02-khalid-al-balushi-en.docx',
  },
  {
    id: 'pdf-scan',
    label: '04-noor-al-hashmi-scan.pdf · Scanned PDF (OCR review)',
    candidateId: 'cand-noor',
    note: 'OCR path — education field flagged for review',
    filePath: '/issue-5302-inputs/04-noor-al-hashmi-ar-scan.html',
  },
]

export const CV_V2_DIFF = {
  experience: { old: '7', new: '8', evidence: '8 years experience in portfolio analysis' },
  certification: { old: '', new: 'CFA Level II', evidence: 'CFA Level II candidate, 2025' },
}
