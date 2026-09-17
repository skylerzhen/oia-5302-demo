import { CV_UPLOAD_SAMPLES } from '../data/candidates'
import { controlledViewUrl } from './controlledDocUrl'

export function resolveCvSourceUrl(sampleId: string, fileName: string, filePath?: string): string {
  if (filePath) return controlledViewUrl(filePath)
  const sample = CV_UPLOAD_SAMPLES.find((entry) => entry.id === sampleId)
  if (sample?.filePath) return controlledViewUrl(sample.filePath)
  const normalized = fileName.toLowerCase()
  if (normalized.includes('noor') || normalized.includes('scan') || sampleId === 'pdf-scan') {
    return controlledViewUrl('/issue-5302-inputs/04-noor-al-hashmi-ar-scan.html')
  }
  if (normalized.includes('khalid') || normalized.includes('02-khalid') || sampleId === 'docx-en') {
    return controlledViewUrl('/issue-5302-inputs/02-khalid-al-balushi-en.html')
  }
  if (normalized.includes('sara') || normalized.includes('01-sara') || sampleId === 'pdf-en') {
    return controlledViewUrl('/issue-5302-inputs/01-sara-al-hinai-en.html')
  }
  return ''
}
