/**
 * 音频播放工具 — 播放来自 TTS API 的音频
 */

export interface VoiceSettings {
  autoPlay: boolean    // 是否自动播放 AI 回复语音
  volume: number       // 0-1
  speed: number        // 0.5-2.0，默认 1.0
}

const DEFAULT_SETTINGS: VoiceSettings = {
  autoPlay: true,
  volume: 1.0,
  speed: 1.0,
}

/** 当前正在播放的 Audio 实例，用于页面切换时停止 */
let _currentAudio: HTMLAudioElement | null = null

/**
 * 停止所有正在播放的语音（服务端 TTS + 浏览器内置 TTS）
 * 页面切换时调用此函数
 */
export function stopAllAudio() {
  // 停止服务端 TTS 播放的 Audio 元素
  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio.currentTime = 0
    _currentAudio = null
  }
  // 停止浏览器内置语音合成
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * 播放来自 API 响应的音频
 */
export async function playAudioFromResponse(
  response: Response,
  settings: Partial<VoiceSettings> = {}
): Promise<void> {
  const { volume, speed } = { ...DEFAULT_SETTINGS, ...settings }

  const audioBlob = await response.blob()
  const audioUrl = URL.createObjectURL(audioBlob)

  // 停止上一次播放
  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio.currentTime = 0
  }

  const audio = new Audio(audioUrl)
  audio.volume = volume
  audio.playbackRate = speed
  _currentAudio = audio

  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(audioUrl)
      if (_currentAudio === audio) _currentAudio = null
    }
    audio.onended = () => { cleanup(); resolve() }
    // pause 也 resolve，这样 stopAllAudio() 后调用方的 finally 能正常执行
    audio.onpause = () => { cleanup(); resolve() }
    audio.onerror = () => { cleanup(); reject(new Error('音频播放失败')) }
    audio.play().catch(reject)
  })
}

/**
 * 请求 TTS 并播放
 * 自动检测 provider：browser 模式用浏览器内置，其他走服务端
 */
export async function speakText(
  text: string,
  settings: Partial<VoiceSettings> = {}
): Promise<void> {
  if (!text.trim()) return

  const { volume, speed } = { ...DEFAULT_SETTINGS, ...settings }

  // 检查是否浏览器模式（先查缓存的 provider）
  const provider = await getActiveProvider()

  if (provider === 'browser') {
    // 使用浏览器内置 speechSynthesis
    const { browserSpeak } = await import('@/lib/voice/browser-speech')
    await browserSpeak(text, { volume, rate: speed })
    return
  }

  // 服务端 TTS
  const response = await fetch('/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    // 如果服务端失败，回退到浏览器 TTS
    console.warn('TTS API failed, falling back to browser speech')
    try {
      const { browserSpeak } = await import('@/lib/voice/browser-speech')
      await browserSpeak(text, { volume, rate: speed })
    } catch { /* 静默失败 */ }
    return
  }

  await playAudioFromResponse(response, { volume, speed })
}

/** 缓存的 provider 类型 */
let _cachedProvider: string | null = null

/** 获取当前活跃的语音 provider */
async function getActiveProvider(): Promise<string> {
  if (_cachedProvider) return _cachedProvider

  try {
    const res = await fetch('/api/voice/provider')
    if (res.ok) {
      const { provider } = await res.json()
      _cachedProvider = provider
      return provider
    }
  } catch { /* ignore */ }

  // 默认 browser
  _cachedProvider = 'browser'
  return 'browser'
}

/** 重置 provider 缓存（环境变量变更后调用） */
export function resetProviderCache() {
  _cachedProvider = null
}

/**
 * 从 localStorage 读取语音设置
 */
export function getVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem('voice-settings')
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

/**
 * 保存语音设置到 localStorage
 */
export function saveVoiceSettings(settings: Partial<VoiceSettings>): void {
  if (typeof window === 'undefined') return
  const current = getVoiceSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem('voice-settings', JSON.stringify(updated))
}
