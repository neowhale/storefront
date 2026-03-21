export interface DeviceFingerprint {
  fingerprint_id: string
  canvas_fingerprint: string
  webgl_fingerprint: string
  audio_fingerprint: string
  screen_resolution: string
  platform: string
  timezone: string
  language: string
  hardware_concurrency: number
  device_memory: number | null
  color_depth: number
  pixel_ratio: number
  touch_support: boolean
  cookie_enabled: boolean
  do_not_track: string | null
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    // Filled rect with gradient
    const gradient = ctx.createLinearGradient(0, 0, 256, 256)
    gradient.addColorStop(0, '#ff6b35')
    gradient.addColorStop(0.5, '#1a73e8')
    gradient.addColorStop(1, '#34a853')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = '18px Arial'
    ctx.textBaseline = 'top'
    ctx.fillText('WhaleTools', 10, 10)

    // Arc / circle
    ctx.beginPath()
    ctx.arc(128, 128, 60, 0, Math.PI * 2)
    ctx.strokeStyle = '#fbbc04'
    ctx.lineWidth = 3
    ctx.stroke()

    // Line
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(256, 256)
    ctx.strokeStyle = '#ea4335'
    ctx.lineWidth = 2
    ctx.stroke()

    const dataUrl = canvas.toDataURL()
    return sha256(dataUrl)
  } catch {
    return ''
  }
}

async function getWebGLFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl || !(gl instanceof WebGLRenderingContext)) return ''

    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : 'unknown'
    const vendor = ext
      ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
      : 'unknown'
    const version = gl.getParameter(gl.VERSION)

    const combined = `${renderer}|${vendor}|${version}`
    return sha256(combined)
  } catch {
    return ''
  }
}

async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioCtx =
      (window as any).OfflineAudioContext ||
      (window as any).webkitOfflineAudioContext
    if (!AudioCtx) return ''

    const context = new AudioCtx(1, 44100, 44100)
    const oscillator = context.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(10000, context.currentTime)

    const compressor = context.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-50, context.currentTime)
    compressor.knee.setValueAtTime(40, context.currentTime)
    compressor.ratio.setValueAtTime(12, context.currentTime)
    compressor.attack.setValueAtTime(0, context.currentTime)
    compressor.release.setValueAtTime(0.25, context.currentTime)

    oscillator.connect(compressor)
    compressor.connect(context.destination)
    oscillator.start(0)

    const buffer = await context.startRendering()
    const samples = buffer.getChannelData(0).slice(0, 100)
    const sampleStr = Array.from(samples as ArrayLike<number>)
      .map((s) => s.toString())
      .join(',')

    return sha256(sampleStr)
  } catch {
    return ''
  }
}

export async function collectFingerprint(): Promise<DeviceFingerprint> {
  const [canvas_fingerprint, webgl_fingerprint, audio_fingerprint] =
    await Promise.all([
      getCanvasFingerprint(),
      getWebGLFingerprint(),
      getAudioFingerprint(),
    ])

  const screen_resolution = `${window.screen.width}x${window.screen.height}`
  const platform = navigator.platform || ''
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  const language = navigator.language || ''
  const hardware_concurrency = navigator.hardwareConcurrency || 0
  const device_memory = (navigator as any).deviceMemory ?? null
  const color_depth = window.screen.colorDepth
  const pixel_ratio = window.devicePixelRatio || 1
  const touch_support =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  const cookie_enabled = navigator.cookieEnabled
  const do_not_track = navigator.doNotTrack ?? null

  const fingerprintSource = [
    canvas_fingerprint,
    webgl_fingerprint,
    audio_fingerprint,
    screen_resolution,
    platform,
    timezone,
    language,
    String(hardware_concurrency),
  ].join('|')

  const fingerprint_id = await sha256(fingerprintSource)

  return {
    fingerprint_id,
    canvas_fingerprint,
    webgl_fingerprint,
    audio_fingerprint,
    screen_resolution,
    platform,
    timezone,
    language,
    hardware_concurrency,
    device_memory,
    color_depth,
    pixel_ratio,
    touch_support,
    cookie_enabled,
    do_not_track,
  }
}
