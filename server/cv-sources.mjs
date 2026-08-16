import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SAMPLE_TO_SOURCE = {
  'pdf-en': '01-sara-al-hinai-en.md',
  'docx-en': '02-khalid-al-balushi-en.md',
  'pdf-scan': '04-noor-al-hashmi-ar-scan.md',
}

const FILE_NAME_TO_SOURCE = {
  '01-sara-al-hinai-en.pdf': '01-sara-al-hinai-en.md',
  '02-khalid-al-balushi-en.docx': '02-khalid-al-balushi-en.md',
  '04-noor-al-hashmi-ar-scan.pdf': '04-noor-al-hashmi-ar-scan.md',
}

export function resolveCvSourceText({ sampleId, fileName, documentText }) {
  if (documentText?.trim()) return documentText.trim()

  const sourceFile =
    SAMPLE_TO_SOURCE[sampleId ?? ''] ??
    FILE_NAME_TO_SOURCE[fileName?.toLowerCase() ?? '']

  if (!sourceFile) return null

  const sourcePath = resolve(process.cwd(), 'data/issue-5302-inputs/cv-source', sourceFile)
  if (!existsSync(sourcePath)) return null
  return readFileSync(sourcePath, 'utf8')
}
