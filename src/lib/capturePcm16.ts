export interface PcmCaptureResult {
  pcmBase64: string
  sampleRate: number
}

export interface PcmCaptureSession {
  finish: () => Promise<PcmCaptureResult>
  cancel: () => void
}

function floatTo16BitPcm(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]))
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}

function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function rmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

/** Record microphone audio until the caller invokes finish() or cancel(). */
export function startPcm16Capture(options?: {
  maxMs?: number
  silenceThreshold?: number
}): PcmCaptureSession {
  const maxMs = options?.maxMs ?? 120_000
  const silenceThreshold = options?.silenceThreshold ?? 0.012
  const sampleRate = 16000

  let stream: MediaStream | null = null
  let ctx: AudioContext | null = null
  let processor: ScriptProcessorNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  const chunks: Float32Array[] = []
  let heardSpeech = false
  let elapsedMs = 0
  let settled = false
  let finishPromise: Promise<PcmCaptureResult> | null = null

  const stopTracks = () => {
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      stream = null
    }
  }

  const teardownGraph = () => {
    processor?.disconnect()
    source?.disconnect()
    processor = null
    source = null
    void ctx?.close()
    ctx = null
  }

  const setupPromise = navigator.mediaDevices.getUserMedia({ audio: true }).then((mediaStream) => {
    stream = mediaStream
    ctx = new AudioContext({ sampleRate })
    source = ctx.createMediaStreamSource(stream)
    processor = ctx.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (event) => {
      if (settled) return
      const input = event.inputBuffer.getChannelData(0)
      const copy = new Float32Array(input.length)
      copy.set(input)
      chunks.push(copy)

      const blockMs = (input.length / sampleRate) * 1000
      elapsedMs += blockMs
      if (rmsLevel(input) > silenceThreshold) heardSpeech = true
      if (elapsedMs >= maxMs) {
        void finish().catch(() => undefined)
      }
    }

    source.connect(processor)
    processor.connect(ctx.destination)
  })

  async function finish(): Promise<PcmCaptureResult> {
    if (finishPromise) return finishPromise

    finishPromise = (async () => {
      await setupPromise
      if (settled) {
        throw new DOMException('Speech capture interrupted', 'AbortError')
      }
      settled = true
      teardownGraph()
      stopTracks()

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      if (totalLength === 0 || !heardSpeech) {
        throw new Error('No speech detected. Try again or type your answer.')
      }

      const merged = new Float32Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }

      return {
        pcmBase64: int16ToBase64(floatTo16BitPcm(merged)),
        sampleRate,
      }
    })()

    return finishPromise
  }

  function cancel() {
    if (settled) return
    settled = true
    teardownGraph()
    stopTracks()
  }

  return { finish, cancel }
}
