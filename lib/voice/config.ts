/**
 * 语音 Provider 配置
 *
 * 通过 VOICE_PROVIDER 环境变量选择：
 *   - "browser"      → 浏览器内置 Web Speech API（零成本，无需 API Key）
 *   - "siliconflow"  → 硅基流动 SiliconFlow（免费额度，中文质量好）
 *   - "openai"       → OpenAI Whisper + TTS（付费，质量最高）
 *
 * 默认：如果配了 OPENAI_API_KEY 用 openai，否则用 browser
 */

export type VoiceProvider = 'browser' | 'siliconflow' | 'openai'

export interface VoiceProviderConfig {
  provider: VoiceProvider
  stt: {
    baseUrl: string
    apiKey: string
    model: string
  }
  tts: {
    baseUrl: string
    apiKey: string
    model: string
    voice: string
  }
}

/** 自动检测当前 provider */
export function getVoiceProvider(): VoiceProvider {
  const env = process.env.VOICE_PROVIDER as VoiceProvider | undefined
  if (env && ['browser', 'siliconflow', 'openai'].includes(env)) return env

  // 自动检测：优先级 siliconflow > openai > browser
  if (process.env.SILICONFLOW_API_KEY) return 'siliconflow'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'browser'
}

/** 获取完整 provider 配置 */
export function getVoiceConfig(): VoiceProviderConfig {
  const provider = getVoiceProvider()

  switch (provider) {
    case 'siliconflow':
      return {
        provider: 'siliconflow',
        stt: {
          baseUrl: 'https://api.siliconflow.cn/v1',
          apiKey: process.env.SILICONFLOW_API_KEY || '',
          model: 'FunAudioLLM/SenseVoiceSmall',
        },
        tts: {
          baseUrl: 'https://api.siliconflow.cn/v1',
          apiKey: process.env.SILICONFLOW_API_KEY || '',
          model: 'FunAudioLLM/CosyVoice2-0.5B',
          voice: 'FunAudioLLM/CosyVoice2-0.5B:diana',
        },
      }

    case 'openai':
      return {
        provider: 'openai',
        stt: {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'whisper-1',
        },
        tts: {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'tts-1',
          voice: 'nova',
        },
      }

    case 'browser':
    default:
      return {
        provider: 'browser',
        stt: { baseUrl: '', apiKey: '', model: '' },
        tts: { baseUrl: '', apiKey: '', model: '', voice: '' },
      }
  }
}
