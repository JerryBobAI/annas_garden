'use client'

/**
 * 浏览器内置语音能力封装
 * 使用 Web Speech API（speechSynthesis + SpeechRecognition）
 * 零成本，无需 API Key，但仅 Chrome/Edge 支持
 */

// ============ TTS（文字转语音）============

/** 使用浏览器内置 speechSynthesis 朗读文字 */
export function browserSpeak(
  text: string,
  options?: { volume?: number; rate?: number; lang?: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('浏览器不支持语音合成'))
      return
    }

    // 取消正在播放的
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = options?.lang || 'zh-CN'
    utterance.volume = options?.volume ?? 1.0
    utterance.rate = options?.rate ?? 0.9 // 稍慢一点适合小朋友
    utterance.pitch = 1.1 // 稍高一点更活泼

    // 尝试选择中文女声
    const voices = window.speechSynthesis.getVoices()
    const zhVoice = voices.find(v =>
      v.lang.startsWith('zh') && v.name.includes('Female')
    ) || voices.find(v => v.lang.startsWith('zh'))
    if (zhVoice) utterance.voice = zhVoice

    utterance.onend = () => resolve()
    utterance.onerror = (e) => reject(e)

    window.speechSynthesis.speak(utterance)
  })
}

/** 停止浏览器语音合成 */
export function browserSpeakStop() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

// ============ STT（语音转文字）============

interface BrowserSTTOptions {
  lang?: string
  continuous?: boolean
  onResult: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

/** 获取 SpeechRecognition 构造函数 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  return SR || null
}

/** 检查浏览器是否支持语音识别 */
export function isBrowserSTTSupported(): boolean {
  return getSpeechRecognition() !== null
}

/** 检查浏览器是否支持语音合成 */
export function isBrowserTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * 启动浏览器实时语音识别
 * 返回一个 stop 函数用于停止
 */
export function startBrowserSTT(options: BrowserSTTOptions): (() => void) | null {
  const SR = getSpeechRecognition()
  if (!SR) {
    options.onError?.('浏览器不支持语音识别')
    return null
  }

  const recognition = new SR()
  recognition.lang = options.lang || 'zh-CN'
  recognition.continuous = options.continuous ?? false
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let finalText = ''
    let interimText = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalText += transcript
      } else {
        interimText += transcript
      }
    }

    if (finalText) {
      options.onResult(finalText, true)
    } else if (interimText) {
      options.onResult(interimText, false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    // "no-speech" 不是真正的错误
    if (event.error !== 'no-speech') {
      options.onError?.(event.error)
    }
  }

  recognition.onend = () => {
    options.onEnd?.()
  }

  recognition.start()

  // 返回停止函数
  return () => {
    try { recognition.stop() } catch { /* ignore */ }
  }
}
