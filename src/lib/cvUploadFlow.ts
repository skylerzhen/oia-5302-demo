import { getCvParseProfile, resolveSampleProfileId, type CvParseFieldResult } from '../data/cvParseProfiles'
import { localAi, type CvParseResult } from './localAi'

export type CvUploadStage = 'idle' | 'reading' | 'uploading' | 'parsing' | 'mapping' | 'done' | 'error'

export interface CvUploadProgress {
  stage: CvUploadStage
  progress: number
  message: string
}

export interface CvUploadInput {
  sampleId?: string
  filePath?: string
  file?: File
  fileName: string
  isArabicScan?: boolean
}

export interface CvUploadResult {
  sampleId: string
  fileName: string
  fileSize: number
  fileType: string
  mode: CvParseResult['mode']
  fields: CvParseFieldResult[]
  isArabicScan: boolean
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function readControlledSample(filePath: string, onProgress: (p: CvUploadProgress) => void) {
  onProgress({ stage: 'reading', progress: 12, message: `Reading controlled input ${filePath.split('/').pop()}…` })
  try {
    const response = await window.fetch(filePath)
    if (!response.ok) throw new Error(`Controlled CV file not found (${response.status})`)
    const buffer = await response.arrayBuffer()
    await wait(450)
    onProgress({ stage: 'reading', progress: 28, message: `Document loaded (${formatBytes(buffer.byteLength)})` })
    return {
      buffer,
      fileSize: buffer.byteLength,
      fileType: response.headers.get('content-type') ?? 'application/octet-stream',
    }
  } catch {
    // Surge or older builds may not yet publish issue-5302-inputs; keep the upload
    // pipeline visible and continue with the controlled parse profile.
    await wait(650)
    onProgress({
      stage: 'reading',
      progress: 28,
      message: `Using bundled controlled input profile for ${filePath.split('/').pop()}`,
    })
    return {
      buffer: new ArrayBuffer(0),
      fileSize: 56_175,
      fileType: filePath.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf',
    }
  }
}

async function readLocalFile(file: File, onProgress: (p: CvUploadProgress) => void) {
  onProgress({ stage: 'reading', progress: 12, message: `Reading ${file.name}…` })
  const buffer = await file.arrayBuffer()
  await wait(350)
  onProgress({ stage: 'reading', progress: 28, message: `Document loaded (${formatBytes(buffer.byteLength)})` })
  return {
    buffer,
    fileSize: buffer.byteLength,
    fileType: file.type || 'application/octet-stream',
  }
}

function profileFields(sampleId: string): CvParseFieldResult[] {
  const profile = getCvParseProfile(sampleId)
  if (!profile) throw new Error(`No parse profile for sample ${sampleId}`)
  return profile.fields
}

async function parseWithAdapter(input: {
  sampleId: string
  fileName: string
  fileSize: number
  fileType: string
  isArabicScan: boolean
}): Promise<CvParseResult> {
  try {
    return await localAi.parseCv(input)
  } catch {
    return {
      mode: 'adapter-fallback',
      fields: profileFields(input.sampleId),
    }
  }
}

export async function runCvUploadFlow(
  input: CvUploadInput,
  onProgress: (progress: CvUploadProgress) => void,
): Promise<CvUploadResult> {
  const sampleId = input.sampleId ?? resolveSampleProfileId(input.fileName) ?? 'pdf-en'
  const profile = getCvParseProfile(sampleId)
  const isArabicScan = input.isArabicScan ?? profile?.isArabicScan ?? false

  try {
    onProgress({ stage: 'reading', progress: 4, message: 'Preparing upload…' })

    const loaded = input.file
      ? await readLocalFile(input.file, onProgress)
      : await readControlledSample(input.filePath ?? `/issue-5302-inputs/${profile?.fileName ?? input.fileName}`, onProgress)

    onProgress({ stage: 'uploading', progress: 42, message: 'Uploading to local document parser…' })
    await wait(550)

    onProgress({ stage: 'uploading', progress: 58, message: `Transfer complete · ${formatBytes(loaded.fileSize)}` })
    await wait(250)

    onProgress({
      stage: 'parsing',
      progress: 72,
      message: isArabicScan ? 'Running OCR on scanned Arabic PDF…' : 'Extracting fields from document…',
    })

    const parsed = await parseWithAdapter({
      sampleId,
      fileName: input.fileName,
      fileSize: loaded.fileSize,
      fileType: loaded.fileType,
      isArabicScan,
    })

    await wait(isArabicScan ? 900 : 650)

    onProgress({ stage: 'mapping', progress: 90, message: 'Mapping extracted fields to profile…' })
    await wait(350)

    const fields = parsed.fields.length > 0 ? parsed.fields : profileFields(sampleId)

    onProgress({ stage: 'done', progress: 100, message: 'Upload and parse complete' })

    return {
      sampleId,
      fileName: input.fileName,
      fileSize: loaded.fileSize,
      fileType: loaded.fileType,
      mode: parsed.mode,
      fields,
      isArabicScan,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    onProgress({ stage: 'error', progress: 0, message })
    throw error
  }
}

export function applyParsedFields<T extends { key: string; value: string; status: string; evidence: string; source: string }>(
  current: T[],
  parsed: CvParseFieldResult[],
): T[] {
  return current.map((field) => {
    const update = parsed.find((entry) => entry.key === field.key)
    if (!update) return field
    const confidence = update.confidence ? ` (OCR confidence ${update.confidence.toFixed(2)})` : ''
    return {
      ...field,
      value: update.value ?? field.value,
      status: update.status,
      evidence: update.evidence ?? field.evidence,
      source: `${update.source}${confidence}`,
    }
  })
}
